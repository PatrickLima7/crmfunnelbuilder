import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { usePauseConfig, useCreatePauseType, useUpdatePauseType, useDeletePauseType } from "@/hooks/usePauseConfig";
import { Download, Plus, Power, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function exportCsv(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]!);
  const lines = [
    cols.join(";"),
    ...rows.map((r) => cols.map((c) => String(r[c] ?? "")).join(";")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface AppConfigValues {
  company_name: string;
  work_hours: { start: string; end: string };
}

function useAppConfig() {
  return useQuery({
    queryKey: ["app_config"],
    queryFn: async (): Promise<AppConfigValues> => {
      const { data, error } = await supabase
        .from("app_config")
        .select("key, value");
      if (error) throw error;
      const map: Record<string, unknown> = {};
      for (const row of data ?? []) map[row.key] = row.value;
      return {
        company_name: (map["company_name"] as string) ?? "Funil de Vendas",
        work_hours: (map["work_hours"] as { start: string; end: string }) ?? { start: "08:00", end: "18:00" },
      };
    },
  });
}

function useSaveConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: AppConfigValues) => {
      const now = new Date().toISOString();
      const rows = [
        { key: "company_name", value: config.company_name, updated_at: now },
        { key: "work_hours", value: config.work_hours as unknown as import("@/lib/supabase-types").Json, updated_at: now },
      ];
      for (const row of rows) {
        const { error } = await supabase.from("app_config").upsert(row, { onConflict: "key" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app_config"] });
      toast.success("Configurações salvas com sucesso.");
    },
    onError: (err: Error) => {
      toast.error(`Erro ao salvar: ${err.message}`);
    },
  });
}

export function ConfiguracaoTab() {
  const { data: config, isLoading: isConfigLoading } = useAppConfig();
  const saveConfig = useSaveConfig();

  const [companyName, setCompanyName] = useState("");
  const [workStart, setWorkStart] = useState("08:00");
  const [workEnd, setWorkEnd] = useState("18:00");

  const { data: pauseTypes, isLoading: isPausesLoading } = usePauseConfig();
  const createPauseType = useCreatePauseType();
  const updatePauseType = useUpdatePauseType();
  const deletePauseType = useDeletePauseType();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPauseName, setNewPauseName] = useState("");
  const [newPauseMax, setNewPauseMax] = useState("15");

  const [editingPauseId, setEditingPauseId] = useState<string | null>(null);
  const [editMaxMinutes, setEditMaxMinutes] = useState("");

  useEffect(() => {
    if (config) {
      setCompanyName(config.company_name);
      setWorkStart(config.work_hours.start);
      setWorkEnd(config.work_hours.end);
    }
  }, [config]);

  const handleSave = () => {
    saveConfig.mutate({
      company_name: companyName,
      work_hours: { start: workStart, end: workEnd },
    });
  };

  const handleCreatePause = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPauseName.trim()) return;
    createPauseType.mutate({ nome: newPauseName, max_minutes: parseInt(newPauseMax) || 15 }, {
      onSuccess: () => {
        setNewPauseName("");
        setNewPauseMax("15");
        setIsCreateOpen(false);
      }
    });
  };

  const handleExportEvents = async () => {
    const { data, error } = await supabase
      .from("pause_events")
      .select("*, profile:profiles(name)")
      .order("started_at", { ascending: false });
    
    if (error) {
      toast.error("Erro ao buscar eventos: " + error.message);
      return;
    }
    
    if (!data || data.length === 0) {
      toast.info("Nenhum evento de pausa encontrado.");
      return;
    }

    const rows = data.map((p) => ({
      operador: (p as { profile?: { name?: string } }).profile?.name ?? p.operator_id,
      motivo: p.reason,
      inicio: new Date(p.started_at).toLocaleString("pt-BR"),
      fim: p.ended_at ? new Date(p.ended_at).toLocaleString("pt-BR") : "Em curso",
      duracao_min: p.duration_seconds ? Math.round(p.duration_seconds / 60) : "-",
    }));

    exportCsv(rows, "eventos_pausa.csv");
  };

  if (isConfigLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center gap-2">
        <Settings className="size-4 text-primary" />
        <h2 className="text-sm font-bold">Configurações do sistema</h2>
      </div>

      {/* Company name */}
      <div className="rounded-xl border border-border bg-panel p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Geral</h3>
        <div className="space-y-1.5">
          <Label>Nome da empresa</Label>
          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Funil de Vendas"
          />
        </div>
      </div>

      {/* Work hours */}
      <div className="rounded-xl border border-border bg-panel p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Horário de funcionamento</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Início do turno</Label>
            <Input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Fim do turno</Label>
            <Input type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Pause types */}
      <div className="rounded-xl border border-border bg-panel p-4 space-y-3 max-w-full">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Tipos de pausa</h3>
            <p className="text-xs text-muted-foreground">Aparecem no menu de pausa do operador.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={handleExportEvents}>
              <Download className="size-3.5" /> Exportar Eventos CSV
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="size-3.5" />
                  Nova Pausa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreatePause}>
                  <DialogHeader>
                    <DialogTitle>Cadastrar Tipo de Pausa</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="nome">Nome</Label>
                      <Input id="nome" value={newPauseName} onChange={(e) => setNewPauseName(e.target.value)} placeholder="Ex: Almoço" autoFocus />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="max_minutes">Tempo Máximo (minutos)</Label>
                      <Input id="max_minutes" type="number" value={newPauseMax} onChange={(e) => setNewPauseMax(e.target.value)} min="1" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={createPauseType.isPending || !newPauseName.trim()}>
                      {createPauseType.isPending ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <div className="border rounded-md">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="h-10 px-4 font-medium">Nome</th>
                <th className="h-10 px-4 font-medium">Tempo Máx (min)</th>
                <th className="h-10 px-4 font-medium">Status</th>
                <th className="h-10 px-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isPausesLoading ? (
                <tr>
                  <td colSpan={4} className="h-24 text-center">
                    <Loader2 className="size-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : pauseTypes?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="h-24 text-center text-muted-foreground">Nenhum tipo de pausa cadastrado.</td>
                </tr>
              ) : (
                pauseTypes?.map((pt) => (
                  <tr key={pt.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{pt.nome}</td>
                    <td className="px-4 py-3">
                      {editingPauseId === pt.id ? (
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            className="w-20 h-8"
                            value={editMaxMinutes}
                            onChange={(e) => setEditMaxMinutes(e.target.value)}
                            min="1"
                          />
                          <Button 
                            size="sm" 
                            onClick={() => {
                              updatePauseType.mutate({ id: pt.id, updates: { max_minutes: parseInt(editMaxMinutes) || 15 }});
                              setEditingPauseId(null);
                            }}
                          >Salvar</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingPauseId(null)}>Cancelar</Button>
                        </div>
                      ) : (
                        <div 
                          className="cursor-pointer hover:underline text-primary"
                          onClick={() => {
                            setEditingPauseId(pt.id);
                            setEditMaxMinutes(pt.max_minutes.toString());
                          }}
                        >
                          {pt.max_minutes} min
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={pt.ativo ? "default" : "secondary"} className={pt.ativo ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : ""}>
                        {pt.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => updatePauseType.mutate({ id: pt.id, updates: { ativo: !pt.ativo }})}
                          className={pt.ativo ? "text-amber-500" : "text-green-500"}
                          title={pt.ativo ? "Desativar" : "Ativar"}
                          disabled={updatePauseType.isPending}
                        >
                          <Power className="size-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive" title="Excluir">
                              <Trash2 className="size-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir tipo de pausa?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o tipo "{pt.nome}"?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deletePauseType.mutate(pt.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saveConfig.isPending}>
        <Save /> {saveConfig.isPending ? "Salvando..." : "Salvar configurações"}
      </Button>
    </div>
  );
}
