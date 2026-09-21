import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAppSettings, useAtualizarCadastroHabilitado } from "@/hooks/useAppSettings";
import { usePerfis, useRolesPorUsuario } from "@/hooks/useChamadosData";
import { ROLE_LABEL, type AppRole } from "@/lib/chamados";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários e papéis | Central de Chamados" },
      { name: "description", content: "Gerencie quem é solicitante, equipe técnica ou administrador do sistema de chamados." },
      { property: "og:title", content: "Usuários e papéis | Central de Chamados" },
      { property: "og:description", content: "Gerencie quem é solicitante, equipe técnica ou administrador do sistema de chamados." },
    ],
  }),
  component: UsuariosPage,
});

function UsuariosPage() {
  const { isAdmin, loading, userId } = useAuth();
  const { data: perfis } = usePerfis();
  const { data: roles } = useRolesPorUsuario();
  const { data: settings } = useAppSettings();
  const alterarCadastro = useAtualizarCadastroHabilitado();
  const queryClient = useQueryClient();

  const alterar = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: AppRole }) => {
      const del = await supabase.from("user_roles").delete().eq("user_id", id);
      if (del.error) throw del.error;
      const ins = await supabase.from("user_roles").insert({ user_id: id, role });
      if (ins.error) throw ins.error;
    },
    onSuccess: () => {
      toast.success("Papel atualizado.");
      queryClient.invalidateQueries({ queryKey: ["user-roles-all"] });
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
    },
    onError: () => toast.error("Não foi possível alterar o papel."),
  });

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!isAdmin)
    return (
      <div className="rounded-xl border border-dashed p-12 text-center">
        <p className="font-medium">Acesso restrito</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Apenas administradores podem gerenciar usuários.
        </p>
      </div>
    );

  function papelDe(id: string): AppRole {
    const lista = (roles ?? []).filter((r) => r.user_id === id).map((r) => r.role as AppRole);
    if (lista.includes("admin")) return "admin";
    if (lista.includes("tecnico")) return "tecnico";
    return "usuario";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usuários e papéis</h1>
        <p className="text-sm text-muted-foreground">
          Defina quem é solicitante, equipe técnica ou administrador.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Papel</th>
            </tr>
          </thead>
          <tbody>
            {(perfis ?? []).map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-3 font-medium">
                  {p.nome}
                  {p.id === userId && <span className="ml-2 text-xs text-muted-foreground">(você)</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
                <td className="px-4 py-3">
                  <Select
                    value={papelDe(p.id)}
                    onValueChange={(v) => alterar.mutate({ id: p.id, role: v as AppRole })}
                  >
                    <SelectTrigger className="w-[190px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["usuario", "tecnico", "admin"] as AppRole[]).map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
