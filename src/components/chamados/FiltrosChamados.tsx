import { useMemo, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePerfis, useSistemas } from "@/hooks/useChamadosData";
import {
  PRIORIDADE_LABEL,
  PRIORIDADE_ORDER,
  STATUS_LABEL,
  STATUS_ORDER,
  type Chamado,
} from "@/lib/chamados";

export interface FiltrosState {
  busca: string;
  status: string;
  sistema: string;
  prioridade: string;
  tecnico: string;
  solicitante: string;
  de: string;
  ate: string;
}

const VAZIO: FiltrosState = {
  busca: "",
  status: "todos",
  sistema: "todos",
  prioridade: "todos",
  tecnico: "todos",
  solicitante: "todos",
  de: "",
  ate: "",
};

export function useFiltrosChamados(chamados: Chamado[] | undefined) {
  const [filtros, setFiltros] = useState<FiltrosState>(VAZIO);

  const lista = useMemo(() => {
    const termo = filtros.busca.trim().toLowerCase();
    const deMs = filtros.de ? new Date(`${filtros.de}T00:00:00`).getTime() : null;
    const ateMs = filtros.ate ? new Date(`${filtros.ate}T23:59:59`).getTime() : null;

    return (chamados ?? []).filter((c) => {
      if (filtros.status !== "todos" && c.status !== filtros.status) return false;
      if (filtros.prioridade !== "todos" && c.prioridade !== filtros.prioridade) return false;
      if (filtros.sistema !== "todos") {
        const atual = c.sistema_id ?? "sem-sistema";
        if (atual !== filtros.sistema) return false;
      }
      if (filtros.tecnico !== "todos") {
        const atual = c.tecnico_id ?? "sem-responsavel";
        if (atual !== filtros.tecnico) return false;
      }
      if (filtros.solicitante !== "todos" && c.solicitante_id !== filtros.solicitante) return false;

      const criadoMs = new Date(c.created_at).getTime();
      if (deMs !== null && criadoMs < deMs) return false;
      if (ateMs !== null && criadoMs > ateMs) return false;

      if (termo) {
        const alvo = `${c.titulo} ${c.descricao} ${c.id}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
  }, [chamados, filtros]);

  const ativos = useMemo(
    () => (Object.keys(VAZIO) as (keyof FiltrosState)[]).filter((k) => filtros[k] !== VAZIO[k]).length,
    [filtros],
  );

  return {
    filtros,
    setFiltros,
    limpar: () => setFiltros(VAZIO),
    lista,
    ativos,
  };
}

interface Props {
  filtros: FiltrosState;
  setFiltros: (f: FiltrosState) => void;
  limpar: () => void;
  ativos: number;
  total: number;
  exibidos: number;
  mostrarSolicitante?: boolean;
}

export function FiltrosChamados({
  filtros,
  setFiltros,
  limpar,
  ativos,
  total,
  exibidos,
  mostrarSolicitante = true,
}: Props) {
  const { data: sistemas } = useSistemas();
  const { data: perfis } = usePerfis();

  function set<K extends keyof FiltrosState>(key: K, value: FiltrosState[K]) {
    setFiltros({ ...filtros, [key]: value });
  }

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="max-w-sm"
          placeholder="Buscar por título, descrição ou código"
          value={filtros.busca}
          onChange={(e) => set("busca", e.target.value)}
        />
        <span className="text-xs text-muted-foreground">
          {exibidos} de {total} chamados
        </span>
        {ativos > 0 && (
          <Button variant="ghost" size="sm" onClick={limpar} className="ml-auto">
            <X className="mr-1 size-3.5" />
            Limpar filtros ({ativos})
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo label="Status">
          <Select value={filtros.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>

        <Campo label="Prioridade">
          <Select value={filtros.prioridade} onValueChange={(v) => set("prioridade", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as prioridades</SelectItem>
              {PRIORIDADE_ORDER.map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORIDADE_LABEL[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>

        <Campo label="Sistema">
          <Select value={filtros.sistema} onValueChange={(v) => set("sistema", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os sistemas</SelectItem>
              <SelectItem value="sem-sistema">Sem sistema</SelectItem>
              {(sistemas ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>

        <Campo label="Responsável">
          <Select value={filtros.tecnico} onValueChange={(v) => set("tecnico", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os responsáveis</SelectItem>
              <SelectItem value="sem-responsavel">Sem responsável</SelectItem>
              {(perfis ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome || p.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>

        {mostrarSolicitante && (
          <Campo label="Solicitante">
            <Select value={filtros.solicitante} onValueChange={(v) => set("solicitante", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os solicitantes</SelectItem>
                {(perfis ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome || p.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
        )}

        <Campo label="Aberto a partir de">
          <Input type="date" value={filtros.de} onChange={(e) => set("de", e.target.value)} />
        </Campo>

        <Campo label="Aberto até">
          <Input type="date" value={filtros.ate} onChange={(e) => set("ate", e.target.value)} />
        </Campo>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
