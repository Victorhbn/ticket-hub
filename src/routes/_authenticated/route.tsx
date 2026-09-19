import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useViewMode } from "@/hooks/useViewMode";
import { ROLE_LABEL, type AppRole } from "@/lib/chamados";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppLayout,
});

function AppLayout() {
  const { profile, roles, email } = useAuth();
  const { viewMode, setViewMode, allowed } = useViewMode(roles);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const links: { to: string; label: string; visivel: boolean }[] = [
    { to: "/chamados", label: viewMode === "usuario" ? "Meus chamados" : "Chamados", visivel: true },
    { to: "/kanban", label: "Kanban", visivel: viewMode !== "usuario" },
    { to: "/dashboard", label: "Dashboard", visivel: viewMode === "admin" },
    { to: "/usuarios", label: "Usuários", visivel: viewMode === "admin" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/chamados" className="font-display text-base font-bold">
            Central de Chamados
          </Link>

          <nav className="flex flex-1 flex-wrap items-center gap-1">
            {links
              .filter((l) => l.visivel)
              .map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&.active]:bg-primary/10 [&.active]:text-primary"
                >
                  {l.label}
                </Link>
              ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{profile?.nome ?? email}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABEL[viewMode]}</p>
            </div>
            {allowed.length > 1 && (
              <Select value={viewMode} onValueChange={(v) => setViewMode(v as AppRole)}>
                <SelectTrigger className="w-[170px]" aria-label="Visualizar como">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowed.map((r) => (
                    <SelectItem key={r} value={r}>
                      Ver como {ROLE_LABEL[r].toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="ghost" size="icon" aria-label="Sair" onClick={() => void sair()}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
