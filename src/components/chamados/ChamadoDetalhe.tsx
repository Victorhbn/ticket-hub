import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { usePerfis, useSistemas, useRolesPorUsuario } from "@/hooks/useChamadosData";
import { PrioridadeBadge, StatusBadge } from "@/components/chamados/badges";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  formatarData,
  type Chamado,
  type ChamadoStatus,
} from "@/lib/chamados";

interface Props {
  chamado: Chamado | null;
  onOpenChange: (open: boolean) => void;
  userId: string;
  podeGerenciar: boolean;
}

export function ChamadoDetalhe({ chamado, onOpenChange, userId, podeGerenciar }: Props) {
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");
  const { data: perfis } = usePerfis();
  const { data: sistemas } = useSistemas();
  const { data: rolesAll } = useRolesPorUsuario();

  const perfilMap = new Map((perfis ?? []).map((p) => [p.id, p]));
  const tecnicos = (perfis ?? []).filter((p) =>
    (rolesAll ?? []).some((r) => r.user_id === p.id && (r.role === "tecnico" || r.role === "admin")),
  );

  const comentarios = useQuery({
    queryKey: ["comentarios", chamado?.id],
    enabled: !!chamado,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comentarios")
        .select("id, autor_id, conteudo, created_at")
        .eq("chamado_id", chamado!.id)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const anexos = useQuery({
    queryKey: ["anexos", chamado?.id],
    enabled: !!chamado,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anexos")
        .select("id, path, nome")
        .eq("chamado_id", chamado!.id);
      if (error) throw error;
      const rows = data ?? [];
      const signed = await Promise.all(
        rows.map(async (a) => {
          const { data: url } = await supabase.storage
            .from("anexos-chamados")
            .createSignedUrl(a.path, 3600);
          return { ...a, url: url?.signedUrl ?? null };
        }),
      );
      return signed;
    },
  });

  // Comentários em tempo real
  useEffect(() => {
    if (!chamado) return;
    const channel = supabase
      .channel(`comentarios-${chamado.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comentarios", filter: `chamado_id=eq.${chamado.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["comentarios", chamado.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chamado, queryClient]);

  const comentar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("comentarios").insert({
        chamado_id: chamado!.id,
        autor_id: userId,
        conteudo: texto.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTexto("");
      queryClient.invalidateQueries({ queryKey: ["comentarios", chamado?.id] });
    },
    onError: () => toast.error("Não foi possível enviar o comentário."),
  });

  const atualizar = useMutation({
    mutationFn: async (patch: Partial<Chamado>) => {
      const { error } = await supabase.from("chamados").update(patch).eq("id", chamado!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chamado atualizado.");
      queryClient.invalidateQueries({ queryKey: ["chamados"] });
    },
    onError: () => toast.error("Não foi possível atualizar o chamado."),
  });

  if (!chamado) return null;

  const sistema = (sistemas ?? []).find((s) => s.id === chamado.sistema_id);
  const solicitante = perfilMap.get(chamado.solicitante_id);
  const tecnico = chamado.tecnico_id ? perfilMap.get(chamado.tecnico_id) : null;

  return (
    <Dialog open={!!chamado} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={chamado.status} />
            <PrioridadeBadge prioridade={chamado.prioridade} />
            <span className="text-xs text-muted-foreground">#{chamado.id.slice(0, 8)}</span>
          </div>
          <DialogTitle className="text-left">{chamado.titulo}</DialogTitle>
          <DialogDescription className="text-left">
            {sistema?.nome ?? "Sem sistema"} · aberto por {solicitante?.nome ?? "usuário"} em{" "}
            {formatarData(chamado.created_at)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-lg border bg-muted/40 p-4 text-sm whitespace-pre-wrap">
            {chamado.descricao}
          </div>

          {(anexos.data ?? []).length > 0 && (
            <div className="space-y-2">
              <Label>Anexos</Label>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {(anexos.data ?? []).map((a) => (
                  <a
                    key={a.id}
                    href={a.url ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-md border transition-opacity hover:opacity-80"
                    title={a.nome}
                  >
                    {a.url ? (
                      <img src={a.url} alt={a.nome} className="h-24 w-full object-cover" />
                    ) : (
                      <div className="flex h-24 items-center justify-center text-xs">{a.nome}</div>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {podeGerenciar ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={chamado.status}
                  onValueChange={(v) => atualizar.mutate({ status: v as ChamadoStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select
                  value={chamado.tecnico_id ?? "none"}
                  onValueChange={(v) => atualizar.mutate({ tecnico_id: v === "none" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem responsável</SelectItem>
                    {tecnicos.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid gap-2 rounded-lg border p-4 text-sm sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Responsável: </span>
                {tecnico?.nome ?? "Aguardando atribuição"}
              </p>
              <p>
                <span className="text-muted-foreground">Última atualização: </span>
                {formatarData(chamado.updated_at)}
              </p>
              {chamado.resolvido_em && (
                <p>
                  <span className="text-muted-foreground">Resolvido em: </span>
                  {formatarData(chamado.resolvido_em)}
                </p>
              )}
            </div>
          )}

          <div className="space-y-3">
            <Label>Comentários</Label>
            <ScrollArea className="max-h-72 rounded-lg border p-3">
              {(comentarios.data ?? []).length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nenhum comentário ainda.
                </p>
              ) : (
                <ul className="space-y-3">
                  {(comentarios.data ?? []).map((c) => {
                    const meu = c.autor_id === userId;
                    return (
                      <li
                        key={c.id}
                        className={`rounded-lg px-3 py-2 text-sm ${meu ? "bg-primary/10" : "bg-muted"}`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {perfilMap.get(c.autor_id)?.nome ?? "Usuário"}
                          </span>
                          <span>{formatarData(c.created_at)}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{c.conteudo}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
            <div className="flex gap-2">
              <Textarea
                rows={2}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Escreva um comentário..."
              />
              <Button
                className="self-end"
                disabled={!texto.trim() || comentar.isPending}
                onClick={() => comentar.mutate()}
              >
                {comentar.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
