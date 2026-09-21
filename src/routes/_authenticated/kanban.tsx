import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ChamadoDetalhe } from "@/components/chamados/ChamadoDetalhe";
import { FiltrosChamados, useFiltrosChamados } from "@/components/chamados/FiltrosChamados";
import { PrioridadeBadge } from "@/components/chamados/badges";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useChamados, usePerfilMap, useSistemas } from "@/hooks/useChamadosData";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  formatarData,
  type Chamado,
  type ChamadoStatus,
} from "@/lib/chamados";

export const Route = createFileRoute("/_authenticated/kanban")({
  head: () => ({
    meta: [
      { title: "Kanban da equipe técnica | Central de Chamados" },
      { name: "description", content: "Painel kanban com os chamados por status para a equipe técnica." },
      { property: "og:title", content: "Kanban da equipe técnica | Central de Chamados" },
      { property: "og:description", content: "Painel kanban com os chamados por status para a equipe técnica." },
    ],
  }),
  component: KanbanPage,
});

function KanbanPage() {
  const { userId, isStaff, loading } = useAuth();
  const { data: chamados } = useChamados();
  const { data: sistemas } = useSistemas();
  const perfis = usePerfilMap();
  const queryClient = useQueryClient();
  const [selecionado, setSelecionado] = useState<Chamado | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const { filtros, setFiltros, limpar, lista, ativos } = useFiltrosChamados(chamados);

  const mover = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ChamadoStatus }) => {
      const { error } = await supabase.from("chamados").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chamados"] }),
    onError: () => toast.error("Não foi possível mover o chamado."),
  });

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!isStaff)
    return (
      <div className="rounded-xl border border-dashed p-12 text-center">
        <p className="font-medium">Acesso restrito</p>
        <p className="mt-1 text-sm text-muted-foreground">
          O kanban está disponível apenas para a equipe técnica e administradores.
        </p>
      </div>
    );

  const atualizado = selecionado
    ? ((chamados ?? []).find((c) => c.id === selecionado.id) ?? selecionado)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kanban da equipe técnica</h1>
        <p className="text-sm text-muted-foreground">
          Arraste os cartões entre as colunas para atualizar o status.
        </p>
      </div>

      <FiltrosChamados
        filtros={filtros}
        setFiltros={setFiltros}
        limpar={limpar}
        ativos={ativos}
        total={(chamados ?? []).length}
        exibidos={lista.length}
      />

      <div className="grid gap-4 lg:grid-cols-4">
        {STATUS_ORDER.map((status) => {
          const itens = lista.filter((c) => c.status === status);
          return (
            <section
              key={status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (arrastando) mover.mutate({ id: arrastando, status });
                setArrastando(null);
              }}
              className="flex min-h-[200px] flex-col gap-3 rounded-xl border bg-muted/30 p-3"
            >
              <header className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold">{STATUS_LABEL[status]}</h2>
                <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                  {itens.length}
                </span>
              </header>

              {itens.map((c) => (
                <article
                  key={c.id}
                  draggable
                  onDragStart={() => setArrastando(c.id)}
                  onDragEnd={() => setArrastando(null)}
                  onClick={() => setSelecionado(c)}
                  className="cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-2">
                    <PrioridadeBadge prioridade={c.prioridade} />
                    <span className="text-[10px] text-muted-foreground">#{c.id.slice(0, 6)}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium">{c.titulo}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(sistemas ?? []).find((s) => s.id === c.sistema_id)?.nome ?? "Sem sistema"}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {perfis.get(c.solicitante_id)?.nome ?? "Solicitante"} · {formatarData(c.created_at)}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-primary">
                    {c.tecnico_id ? perfis.get(c.tecnico_id)?.nome : "Sem responsável"}
                  </p>
                </article>
              ))}
            </section>
          );
        })}
      </div>

      {userId && (
        <ChamadoDetalhe
          chamado={atualizado}
          onOpenChange={(open) => !open && setSelecionado(null)}
          userId={userId}
          podeGerenciar
        />
      )}
    </div>
  );
}
