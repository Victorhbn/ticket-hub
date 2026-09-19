export type ChamadoStatus = "aberto" | "em_atendimento" | "pendente" | "resolvido";
export type ChamadoPrioridade = "baixa" | "media" | "alta" | "critica";
export type AppRole = "admin" | "tecnico" | "usuario";

export const STATUS_ORDER: ChamadoStatus[] = ["aberto", "em_atendimento", "pendente", "resolvido"];

export const STATUS_LABEL: Record<ChamadoStatus, string> = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  pendente: "Pendente",
  resolvido: "Resolvido",
};

export const STATUS_CLASS: Record<ChamadoStatus, string> = {
  aberto: "bg-status-aberto/15 text-status-aberto border-status-aberto/30",
  em_atendimento: "bg-status-atendimento/15 text-status-atendimento border-status-atendimento/30",
  pendente: "bg-status-pendente/15 text-status-pendente border-status-pendente/30",
  resolvido: "bg-status-resolvido/15 text-status-resolvido border-status-resolvido/30",
};

export const PRIORIDADE_ORDER: ChamadoPrioridade[] = ["baixa", "media", "alta", "critica"];

export const PRIORIDADE_LABEL: Record<ChamadoPrioridade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

export const PRIORIDADE_CLASS: Record<ChamadoPrioridade, string> = {
  baixa: "bg-muted text-muted-foreground border-border",
  media: "bg-status-atendimento/15 text-status-atendimento border-status-atendimento/30",
  alta: "bg-status-pendente/15 text-status-pendente border-status-pendente/30",
  critica: "bg-destructive/15 text-destructive border-destructive/30",
};

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador",
  tecnico: "Equipe técnica",
  usuario: "Solicitante",
};

export interface Chamado {
  id: string;
  titulo: string;
  descricao: string;
  sistema_id: string | null;
  prioridade: ChamadoPrioridade;
  status: ChamadoStatus;
  solicitante_id: string;
  tecnico_id: string | null;
  resolvido_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface Perfil {
  id: string;
  nome: string;
  email: string;
}

export interface Sistema {
  id: string;
  nome: string;
}

export function formatarData(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function horasEntre(inicio: string, fim: string): number {
  return (new Date(fim).getTime() - new Date(inicio).getTime()) / 36e5;
}

export function formatarDuracao(horas: number): string {
  if (!isFinite(horas) || horas <= 0) return "-";
  if (horas < 1) return `${Math.round(horas * 60)} min`;
  if (horas < 48) return `${horas.toFixed(1)} h`;
  return `${(horas / 24).toFixed(1)} dias`;
}
