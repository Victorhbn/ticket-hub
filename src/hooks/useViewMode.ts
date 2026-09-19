import { useCallback, useEffect, useState } from "react";
import type { AppRole } from "@/lib/chamados";

const KEY = "chamados:view-mode";
const EVENT = "chamados:view-mode-changed";

function read(): AppRole | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(KEY);
  return value === "admin" || value === "tecnico" || value === "usuario" ? value : null;
}

/**
 * Visão ativa no cabeçalho (apenas facilita testar cada perspectiva).
 * Não concede permissões: o banco continua validando cada papel.
 */
export function useViewMode(realRoles: AppRole[]) {
  const [stored, setStored] = useState<AppRole | null>(null);

  useEffect(() => {
    setStored(read());
    const handler = () => setStored(read());
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  const highest: AppRole = realRoles.includes("admin")
    ? "admin"
    : realRoles.includes("tecnico")
      ? "tecnico"
      : "usuario";

  const allowed: AppRole[] =
    highest === "admin" ? ["admin", "tecnico", "usuario"] : highest === "tecnico" ? ["tecnico", "usuario"] : ["usuario"];

  const viewMode: AppRole = stored && allowed.includes(stored) ? stored : highest;

  const setViewMode = useCallback((role: AppRole) => {
    window.localStorage.setItem(KEY, role);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { viewMode, setViewMode, allowed, highest };
}
