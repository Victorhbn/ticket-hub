import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAuth } from "@/hooks/useAuth";
import { useChamados, usePerfilMap, useSistemas } from "@/hooks/useChamadosData";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  formatarDuracao,
  horasEntre,
  PRIORIDADE_LABEL,
  PRIORIDADE_ORDER,
} from "@/lib/chamados";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard de desempenho | Central de Chamados" },
      { name: "description", content: "Indicadores de volume, tempo médio de resolução e desempenho da equipe técnica." },
      { property: "og:title", content: "Dashboard de desempenho | Central de Chamados" },
      { property: "og:description", content: "Indicadores de volume, tempo médio de resolução e desempenho da equipe técnica." },
    ],
  }),
  component: DashboardPage,
});

const CORES = ["oklch(0.55 0.13 250)", "oklch(0.6 0.13 210)", "oklch(0.65 0.14 75)", "oklch(0.55 0.13 155)"];

function Card({ titulo, valor, detalhe }: { titulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{titulo}</p>
      <p className="mt-2 font-display text-3xl font-bold">{valor}</p>
      {detalhe && <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>}
    </div>
  );
}

function DashboardPage() {
  const { isAdmin, loading } = useAuth();
  const { data: chamados } = useChamados();
  const { data: sistemas } = useSistemas();
  const perfis = usePerfilMap();

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!isAdmin)
    return (
      <div className="rounded-xl border border-dashed p-12 text-center">
        <p className="font-medium">Acesso restrito</p>
        <p className="mt-1 text-sm text-muted-foreground">
          O dashboard de desempenho é exclusivo para administradores.
        </p>
      </div>
    );

  const lista = chamados ?? [];
  const resolvidos = lista.filter((c) => c.status === "resolvido" && c.resolvido_em);
  const tempos = resolvidos.map((c) => horasEntre(c.created_at, c.resolvido_em!));
  const tempoMedio = tempos.length ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0;
  const taxa = lista.length ? (resolvidos.length / lista.length) * 100 : 0;
  const emAberto = lista.filter((c) => c.status !== "resolvido").length;

  const porStatus = STATUS_ORDER.map((s) => ({
    nome: STATUS_LABEL[s],
    total: lista.filter((c) => c.status === s).length,
  }));

  const porSistema = (sistemas ?? [])
    .map((s) => ({ nome: s.nome, total: lista.filter((c) => c.sistema_id === s.id).length }))
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total);

  const porPrioridade = PRIORIDADE_ORDER.map((p) => ({
    nome: PRIORIDADE_LABEL[p],
    total: lista.filter((c) => c.prioridade === p).length,
  }));

  const idsTecnicos = Array.from(
    new Set(lista.map((c) => c.tecnico_id).filter((v): v is string => !!v)),
  );
  const porTecnico = idsTecnicos.map((id) => {
    const doTecnico = lista.filter((c) => c.tecnico_id === id);
    const fechados = doTecnico.filter((c) => c.status === "resolvido" && c.resolvido_em);
    const media = fechados.length
      ? fechados.reduce((acc, c) => acc + horasEntre(c.created_at, c.resolvido_em!), 0) / fechados.length
      : 0;
    return {
      nome: perfis.get(id)?.nome ?? "Técnico",
      atribuidos: doTecnico.length,
      resolvidos: fechados.length,
      media,
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard de desempenho</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral do volume de chamados e da produtividade da equipe técnica.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card titulo="Total de chamados" valor={String(lista.length)} />
        <Card titulo="Em aberto" valor={String(emAberto)} detalhe="Ainda não resolvidos" />
        <Card titulo="Taxa de resolução" valor={`${taxa.toFixed(0)}%`} detalhe={`${resolvidos.length} resolvidos`} />
        <Card titulo="Tempo médio de resolução" valor={formatarDuracao(tempoMedio)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Chamados por status</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porStatus}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="nome" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="total" name="Chamados" radius={[6, 6, 0, 0]}>
                {porStatus.map((_, i) => (
                  <Cell key={i} fill={CORES[i % CORES.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Distribuição por prioridade</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={porPrioridade} dataKey="total" nameKey="nome" outerRadius={90} label>
                {porPrioridade.map((_, i) => (
                  <Cell key={i} fill={CORES[i % CORES.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-base font-semibold">Chamados por sistema</h2>
          {porSistema.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há chamados registrados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={porSistema} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} fontSize={12} />
                <YAxis type="category" dataKey="nome" width={140} fontSize={12} />
                <Tooltip />
                <Bar dataKey="total" name="Chamados" fill={CORES[1]} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Desempenho por técnico</h2>
        {porTecnico.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum chamado atribuído até o momento.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 font-medium">Técnico</th>
                  <th className="py-2 font-medium">Atribuídos</th>
                  <th className="py-2 font-medium">Resolvidos</th>
                  <th className="py-2 font-medium">Tempo médio</th>
                </tr>
              </thead>
              <tbody>
                {porTecnico.map((t) => (
                  <tr key={t.nome} className="border-b last:border-0">
                    <td className="py-2 font-medium">{t.nome}</td>
                    <td className="py-2">{t.atribuidos}</td>
                    <td className="py-2">{t.resolvidos}</td>
                    <td className="py-2">{formatarDuracao(t.media)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
