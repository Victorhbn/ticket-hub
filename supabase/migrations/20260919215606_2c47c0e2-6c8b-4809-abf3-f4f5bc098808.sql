CREATE TYPE public.app_role AS ENUM ('admin','tecnico','usuario');
CREATE TYPE public.chamado_status AS ENUM ('aberto','em_atendimento','pendente','resolvido');
CREATE TYPE public.chamado_prioridade AS ENUM ('baixa','media','alta','critica');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','tecnico'))
$$;

CREATE POLICY "roles_select_auth" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles_admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.sistemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sistemas TO authenticated;
GRANT ALL ON public.sistemas TO service_role;
ALTER TABLE public.sistemas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sistemas_select" ON public.sistemas FOR SELECT TO authenticated USING (true);
CREATE POLICY "sistemas_insert" ON public.sistemas FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "sistemas_admin_manage" ON public.sistemas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "sistemas_admin_delete" ON public.sistemas FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.chamados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  sistema_id UUID REFERENCES public.sistemas(id) ON DELETE SET NULL,
  prioridade public.chamado_prioridade NOT NULL DEFAULT 'media',
  status public.chamado_status NOT NULL DEFAULT 'aberto',
  solicitante_id UUID NOT NULL,
  tecnico_id UUID,
  resolvido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chamados TO authenticated;
GRANT ALL ON public.chamados TO service_role;
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chamados_select" ON public.chamados FOR SELECT TO authenticated USING (solicitante_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "chamados_insert_own" ON public.chamados FOR INSERT TO authenticated WITH CHECK (solicitante_id = auth.uid());
CREATE POLICY "chamados_update" ON public.chamados FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()) OR solicitante_id = auth.uid()) WITH CHECK (public.is_staff(auth.uid()) OR solicitante_id = auth.uid());
CREATE POLICY "chamados_delete_admin" ON public.chamados FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL,
  conteudo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comentarios TO authenticated;
GRANT ALL ON public.comentarios TO service_role;
ALTER TABLE public.comentarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comentarios_select" ON public.comentarios FOR SELECT TO authenticated USING (
  public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.chamados c WHERE c.id = chamado_id AND c.solicitante_id = auth.uid())
);
CREATE POLICY "comentarios_insert" ON public.comentarios FOR INSERT TO authenticated WITH CHECK (
  autor_id = auth.uid() AND (public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.chamados c WHERE c.id = chamado_id AND c.solicitante_id = auth.uid()))
);
CREATE POLICY "comentarios_delete_own" ON public.comentarios FOR DELETE TO authenticated USING (autor_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.anexos TO authenticated;
GRANT ALL ON public.anexos TO service_role;
ALTER TABLE public.anexos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anexos_select" ON public.anexos FOR SELECT TO authenticated USING (
  public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.chamados c WHERE c.id = chamado_id AND c.solicitante_id = auth.uid())
);
CREATE POLICY "anexos_insert" ON public.anexos FOR INSERT TO authenticated WITH CHECK (
  public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.chamados c WHERE c.id = chamado_id AND c.solicitante_id = auth.uid())
);
CREATE POLICY "anexos_delete" ON public.anexos FOR DELETE TO authenticated USING (
  public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.chamados c WHERE c.id = chamado_id AND c.solicitante_id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), COALESCE(NEW.email,''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'usuario') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.chamados_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'resolvido' AND (OLD.status IS DISTINCT FROM 'resolvido') THEN
    NEW.resolvido_em = now();
  ELSIF NEW.status <> 'resolvido' THEN
    NEW.resolvido_em = NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER chamados_touch_trg BEFORE UPDATE ON public.chamados FOR EACH ROW EXECUTE FUNCTION public.chamados_touch();

INSERT INTO public.sistemas (nome) VALUES ('ERP'), ('CRM'), ('Portal do Cliente'), ('E-mail Corporativo'), ('Rede / Infraestrutura');

ALTER PUBLICATION supabase_realtime ADD TABLE public.comentarios;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chamados;