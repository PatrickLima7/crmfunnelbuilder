import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface AppConfigValues {
  company_name: string;
  pause_types: string[];
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
        company_name: (map.company_name as string) ?? "Funil de Vendas",
        pause_types: (map.pause_types as string[]) ?? ["Almoço", "Café", "Banheiro", "Reunião"],
        work_hours: (map.work_hours as { start: string; end: string }) ?? { start: "08:00", end: "18:00" },
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
        { key: "pause_types", value: config.pause_types as unknown as import("@/lib/supabase-types").Json, updated_at: now },
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
  const { data: config, isLoading } = useAppConfig();
  const saveConfig = useSaveConfig();

  const [companyName, setCompanyName] = useState("");
  const [pauseTypesRaw, setPauseTypesRaw] = useState("");
  const [workStart, setWorkStart] = useState("08:00");
  const [workEnd, setWorkEnd] = useState("18:00");

  useEffect(() => {
    if (config) {
      setCompanyName(config.company_name);
      setPauseTypesRaw(config.pause_types.join("\n"));
      setWorkStart(config.work_hours.start);
      setWorkEnd(config.work_hours.end);
    }
  }, [config]);

  const handleSave = () => {
    saveConfig.mutate({
      company_name: companyName,
      pause_types: pauseTypesRaw.split("\n").map((s) => s.trim()).filter(Boolean),
      work_hours: { start: workStart, end: workEnd },
    });
  };

  if (isLoading) {
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
      <div className="rounded-xl border border-border bg-panel p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Tipos de pausa</h3>
        <p className="text-xs text-muted-foreground">Um tipo por linha. Aparecem no menu de pausa do operador.</p>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          rows={6}
          value={pauseTypesRaw}
          onChange={(e) => setPauseTypesRaw(e.target.value)}
          placeholder={"Almoço\nCafé\nBanheiro\nReunião"}
        />
      </div>

      <Button onClick={handleSave} disabled={saveConfig.isPending}>
        <Save /> {saveConfig.isPending ? "Salvando..." : "Salvar configurações"}
      </Button>
    </div>
  );
}
