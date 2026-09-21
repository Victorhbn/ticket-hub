import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export function useAppSettings() {
  return useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("cadastro_habilitado")
        .maybeSingle();
      if (error) throw error;
      return { cadastroHabilitado: data?.cadastro_habilitado ?? true };
    },
  });
}

export function useAtualizarCadastroHabilitado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (habilitado: boolean) => {
      const { error } = await supabase
        .from("app_settings")
        .update({ cadastro_habilitado: habilitado })
        .eq("id", true);
      if (error) throw error;
      return habilitado;
    },
    onSuccess: (habilitado) => {
      toast.success(habilitado ? "Cadastro de contas liberado." : "Cadastro de contas bloqueado.");
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    },
    onError: () => toast.error("Não foi possível alterar a configuração."),
  });
}
