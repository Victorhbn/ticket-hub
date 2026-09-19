import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NovoChamadoDialog } from "@/components/chamados/NovoChamadoDialog";
import { ChamadoDetalhe } from "@/components/chamados/ChamadoDetalhe";
import { PrioridadeBadge, StatusBadge } from "@/components/chamados/badges";
import { useAuth } from "@/hooks/useAuth";
import { useViewMode } from "@/hooks/useViewMode";
import { useChamados, usePerfilMap, useSistemas } from "@/hooks/useChamadosData";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  formatarData,
  type Chamado,
  type ChamadoStatus,
} from "@/lib/chamados";

export const Route = createFileRoute("/_authenticated/chamados")({
  head: () => ({
    meta: [
      { title: "Chamados | Central de Chamados" },
      { name: "description", content: "Lista de chamados com status, prioridade, sistema e histórico de comentários." },
      { property: "og:title", content: "Chamados | Central de Chamados" },
      { property: "og:description", content: "Lista de chamados com status, prioridade, sistema e histórico de comentários." },
    ],
  }),
  component: ChamadosPage,
});

function ChamadosPage() {
  const { userId, roles } = useAuth();
  const { viewMode } = useViewMode(roles);
  const somenteMeus = viewMode === "usuario";
  const { data: chamados, isLoading } = useChamados({ somenteMeus, userId });
  const { data: sistemas } = useSistemas();
  const perfis = usePerfilMap();

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [selecionado, setSelecionado] = useState<Chamado | null>(null);

  const lista = useMemo(() => {
    return (chamados ?? []).filter((c) => {
      const okStatus = filtroStatus === "todos" || c.status === filtroStatus;
      const okBusca =
        !busca.trim() ||
        c.titulo.toLowerCase().includes(busca.toLowerCase()) ||
        c.descricao.toLowerCase().includes(busca.toLowerCase());
      return okStatus && okBusca;
    });
  }, [chamados, filtroStatus, busca]);

  const atualizado = selecionado
    ? ((chamados ?? []).find((c) => c.id === selecionado.id) ?? selecionado)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{somenteMeus ? "Meus chamados" : "Todos os chamados"}</h1>
          <p className="text-sm text-muted-foreground">
            {somenteMeus
              ? "Acompanhe o status e os comentários das suas solicitações."
              : "Visão completa das solicitações registradas."}
          </p>
        </div>
        {userId && <NovoChamadoDialog userId={userId} />}
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          placeholder="Buscar por título ou descrição"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s as ChamadoStatus]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando chamados...</p>
      ) : lista.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="font-medium">Nenhum chamado encontrado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Abra um novo chamado para registrar um problema.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {lista.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setSelecionado(c)}
                className="w-full rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={c.status} />
                  <PrioridadeBadge prioridade={c.prioridade} />
                  <span className="text-xs text-muted-foreground">
                    {(sistemas ?? []).find((s) => s.id === c.sistema_id)?.nome ?? "Sem sistema"}
                  </span>
                </div>
                <p className="mt-2 font-medium">{c.titulo}</p>
                <p className="line-clamp-2 text-sm text-muted-foreground">{c.descricao}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Aberto por {perfis.get(c.solicitante_id)?.nome ?? "usuário"} ·{" "}
                  {formatarData(c.created_at)} ·{" "}
                  {c.tecnico_id
                    ? `Responsável: ${perfis.get(c.tecnico_id)?.nome ?? "técnico"}`
                    : "Sem responsável"}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {userId && (
        <ChamadoDetalhe
          chamado={atualizado}
          onOpenChange={(open) => !open && setSelecionado(null)}
          userId={userId}
          podeGerenciar={viewMode !== "usuario"}
        />
      )}
    </div>
  );
}
