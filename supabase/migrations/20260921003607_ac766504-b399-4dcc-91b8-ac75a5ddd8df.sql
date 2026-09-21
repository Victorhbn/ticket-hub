CREATE TABLE public.app_settings (
  id boolean PRIMARY KEY DEFAULT true,
  cadastro_habilitado boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_singleton CHECK (id)
);

GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_settings_select_all ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY app_settings_update_admin ON public.app_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_settings (id, cadastro_habilitado) VALUES (true, true);

CREATE OR REPLACE FUNCTION public.app_settings_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.app_settings_touch() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER app_settings_touch_trg BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.app_settings_touch();