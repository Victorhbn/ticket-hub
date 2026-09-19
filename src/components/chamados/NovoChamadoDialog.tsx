import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useSistemas } from "@/hooks/useChamadosData";
import { PRIORIDADE_LABEL, PRIORIDADE_ORDER, type ChamadoPrioridade } from "@/lib/chamados";

interface Props {
  userId: string;
}

export function NovoChamadoDialog({ userId }: Props) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [sistemaId, setSistemaId] = useState("");
  const [prioridade, setPrioridade] = useState<ChamadoPrioridade>("media");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [novoSistema, setNovoSistema] = useState("");
  const [criandoSistema, setCriandoSistema] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { data: sistemas } = useSistemas();

  function limpar() {
    setTitulo("");
    setDescricao("");
    setSistemaId("");
    setPrioridade("media");
    setArquivos([]);
    setNovoSistema("");
    setCriandoSistema(false);
  }

  async function adicionarSistema() {
    const nome = novoSistema.trim();
    if (!nome) return;
    const { data, error } = await supabase
      .from("sistemas")
      .insert({ nome, created_by: userId })
      .select("id, nome")
      .single();
    if (error) {
      toast.error(
        error.code === "23505" ? "Esse sistema já está cadastrado." : "Não foi possível cadastrar o sistema.",
      );
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["sistemas"] });
    setSistemaId(data.id);
    setNovoSistema("");
    setCriandoSistema(false);
    toast.success(`Sistema "${data.nome}" cadastrado.`);
  }

  const criar = useMutation({
    mutationFn: async () => {
      const { data: chamado, error } = await supabase
        .from("chamados")
        .insert({
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          sistema_id: sistemaId || null,
          prioridade,
          solicitante_id: userId,
        })
        .select("id")
        .single();
      if (error) throw error;

      for (const file of arquivos) {
        const path = `${userId}/${chamado.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        const up = await supabase.storage.from("anexos-chamados").upload(path, file);
        if (up.error) throw up.error;
        const ins = await supabase.from("anexos").insert({
          chamado_id: chamado.id,
          path,
          nome: file.name,
        });
        if (ins.error) throw ins.error;
      }
      return chamado.id;
    },
    onSuccess: () => {
      toast.success("Chamado aberto com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["chamados"] });
      limpar();
      setOpen(false);
    },
    onError: () => toast.error("Não foi possível abrir o chamado. Tente novamente."),
  });

  const podeEnviar = titulo.trim().length > 2 && descricao.trim().length > 5 && !!sistemaId;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) limpar();
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="size-4" /> Novo chamado
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Abrir novo chamado</DialogTitle>
          <DialogDescription>
            Descreva o problema com o máximo de detalhes e anexe capturas de tela.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Erro ao emitir nota fiscal"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Sistema</Label>
              <Select value={sistemaId} onValueChange={setSistemaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o sistema" />
                </SelectTrigger>
                <SelectContent>
                  {(sistemas ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {criandoSistema ? (
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    value={novoSistema}
                    onChange={(e) => setNovoSistema(e.target.value)}
                    placeholder="Nome do novo sistema"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void adicionarSistema();
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={() => void adicionarSistema()}>
                    Salvar
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => setCriandoSistema(true)}
                >
                  + Cadastrar novo sistema
                </button>
              )}
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as ChamadoPrioridade)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADE_ORDER.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORIDADE_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição do problema</Label>
            <Textarea
              id="descricao"
              rows={6}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="O que aconteceu, quando começou, passos para reproduzir, mensagens de erro..."
            />
          </div>

          <div className="space-y-2">
            <Label>Capturas de tela</Label>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-6 text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              <ImagePlus className="size-5" />
              Clique para anexar imagens (máx. 10 MB cada)
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                setArquivos((prev) => [...prev, ...Array.from(e.target.files ?? [])]);
                e.target.value = "";
              }}
            />
            {arquivos.length > 0 && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {arquivos.map((file, i) => (
                  <div key={`${file.name}-${i}`} className="group relative overflow-hidden rounded-md border">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="h-24 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setArquivos((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-foreground shadow"
                      aria-label={`Remover ${file.name}`}
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button disabled={!podeEnviar || criar.isPending} onClick={() => criar.mutate()}>
            {criar.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Abrir chamado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
