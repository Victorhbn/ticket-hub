import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, KanbanSquare, MessagesSquare, Paperclip, ShieldCheck, Ticket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Central de Chamados | Suporte interno" },
      {
        name: "description",
        content:
          "Abra chamados com anexos, acompanhe o status em tempo real e gerencie a equipe técnica em um kanban com indicadores.",
      },
      { property: "og:title", content: "Central de Chamados | Suporte interno" },
      {
        property: "og:description",
        content:
          "Abra chamados com anexos, acompanhe o status em tempo real e gerencie a equipe técnica em um kanban com indicadores.",
      },
    ],
  }),
  component: Index,
});

const recursos = [
  { icon: Ticket, titulo: "Abertura guiada", texto: "Sistema, prioridade, descrição detalhada e capturas de tela." },
  { icon: KanbanSquare, titulo: "Kanban da equipe", texto: "Aberto, em atendimento, pendente e resolvido em um só painel." },
  { icon: MessagesSquare, titulo: "Conversa no chamado", texto: "Comentários em tempo real entre solicitante e técnico." },
  { icon: BarChart3, titulo: "Painel do gestor", texto: "Volume, tempo de resolução e desempenho por técnico." },
  { icon: Paperclip, titulo: "Anexos seguros", texto: "Imagens ficam acessíveis apenas a quem tem permissão." },
  { icon: ShieldCheck, titulo: "Papéis definidos", texto: "Solicitante, equipe técnica e administrador." },
];

function Index() {
  const navigate = useNavigate();
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/chamados", replace: true });
      else setVerificando(false);
    });
  }, [navigate]);

  if (verificando) return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-lg font-bold">Central de Chamados</span>
        <Button asChild variant="outline">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <section className="py-16 sm:py-24">
          <p className="mb-4 inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Suporte interno organizado
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
            Chamados abertos, acompanhados e resolvidos no mesmo lugar.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Cada pessoa acompanha seus próprios chamados. A equipe técnica trabalha em um kanban. A
            gestão vê os indicadores de desempenho em tempo real.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Criar conta ou entrar</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {recursos.map(({ icon: Icon, titulo, texto }) => (
            <div key={titulo} className="rounded-xl border bg-card p-6 shadow-sm">
              <Icon className="mb-3 size-5 text-primary" />
              <h3 className="font-display text-base font-semibold">{titulo}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
