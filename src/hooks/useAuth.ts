import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, Perfil } from "@/lib/chamados";

export function useAuth() {
  const { data, isLoading } = useQuery({
    queryKey: ["auth-me"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id, nome, email").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      return {
        userId: user.id,
        email: user.email ?? "",
        profile: (profileRes.data as Perfil | null) ?? null,
        roles: (rolesRes.data ?? []).map((r) => r.role as AppRole),
      };
    },
  });

  const roles = data?.roles ?? [];
  return {
    loading: isLoading,
    userId: data?.userId ?? null,
    email: data?.email ?? "",
    profile: data?.profile ?? null,
    roles,
    isAdmin: roles.includes("admin"),
    isTecnico: roles.includes("tecnico"),
    isStaff: roles.includes("admin") || roles.includes("tecnico"),
  };
}
