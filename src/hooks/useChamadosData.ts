import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Chamado, Perfil, Sistema } from "@/lib/chamados";

export function useSistemas() {
  return useQuery({
    queryKey: ["sistemas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sistemas").select("id, nome").order("nome");
      if (error) throw error;
      return (data ?? []) as Sistema[];
    },
  });
}

export function usePerfis() {
  return useQuery({
    queryKey: ["perfis"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, nome, email").order("nome");
      if (error) throw error;
      return (data ?? []) as Perfil[];
    },
  });
}

export function usePerfilMap() {
  const { data } = usePerfis();
  const map = new Map<string, Perfil>();
  (data ?? []).forEach((p) => map.set(p.id, p));
  return map;
}

export function useChamados(options?: { somenteMeus?: boolean; userId?: string | null }) {
  const somenteMeus = options?.somenteMeus ?? false;
  const userId = options?.userId ?? null;

  return useQuery({
    queryKey: ["chamados", somenteMeus, userId],
    queryFn: async () => {
      let query = supabase.from("chamados").select("*").order("created_at", { ascending: false });
      if (somenteMeus && userId) query = query.eq("solicitante_id", userId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Chamado[];
    },
  });
}

export function useRolesPorUsuario() {
  return useQuery({
    queryKey: ["user-roles-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return data ?? [];
    },
  });
}
