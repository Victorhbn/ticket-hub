import { cn } from "@/lib/utils";
import {
  PRIORIDADE_CLASS,
  PRIORIDADE_LABEL,
  STATUS_CLASS,
  STATUS_LABEL,
  type ChamadoPrioridade,
  type ChamadoStatus,
} from "@/lib/chamados";

export function StatusBadge({ status, className }: { status: ChamadoStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_CLASS[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PrioridadeBadge({
  prioridade,
  className,
}: {
  prioridade: ChamadoPrioridade;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        PRIORIDADE_CLASS[prioridade],
        className,
      )}
    >
      {PRIORIDADE_LABEL[prioridade]}
    </span>
  );
}
