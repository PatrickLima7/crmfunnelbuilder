import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Bell, Coffee, Flame, LogOut, Play, Square, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatClock } from "@/lib/crm-data";
import { useCrm } from "@/lib/crm-store";
import { supabase } from "@/lib/supabase";
import { useActivePauseTypes } from "@/hooks/usePauseConfig";
import { useSeedSampleLeads } from "@/hooks/useLeads";
import { ExpedienteFinishModal } from "./ExpedienteFinishModal";

export function Topbar({ operator, operatorId }: { operator: string; operatorId?: string }) {
  const crm = useCrm();
  const navigate = useNavigate();
  const { data: pauseTypes = [] } = useActivePauseTypes();
  const seedLeads = useSeedSampleLeads(operatorId ?? "");
  
  const [clock, setClock] = useState("--:--:--");
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("pt-BR"));
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, []);

  const pauseSeconds = crm.pause ? Math.floor((Date.now() - crm.pause.startedAt) / 1000) : 0;

  const handleConfirmFinish = async () => {
    setFinishing(true);
    try {
      await crm.finishShift();
      setShowFinishModal(false);
    } finally {
      setFinishing(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-border bg-sidebar/95 px-4 py-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary">
            <Flame className="size-4 text-primary-foreground" />
          </span>
          <span className="truncate text-sm font-extrabold tracking-tight sm:text-base">
            FUNIL DE VENDAS
          </span>
        </div>

        <span className="rounded-md border border-border bg-panel px-2.5 py-1 font-mono text-sm">
          {clock}
        </span>

        {/* Expediente status badge */}
        {crm.shiftActive ? (
          <span className="flex items-center gap-1.5 rounded-md border border-success/40 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
            <span className="size-2 rounded-full bg-success animate-pulse" />
            Expediente Ativo ({formatClock(crm.shiftDurationSeconds)})
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-md border border-muted bg-muted/50 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            <span className="size-2 rounded-full bg-muted-foreground/60" />
            Expediente Não Iniciado
          </span>
        )}

        {crm.alerts.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="animate-pulse-alert flex cursor-pointer items-center gap-1.5 rounded-md bg-destructive px-2.5 py-1 text-xs font-semibold text-destructive-foreground hover:opacity-90">
                <Bell className="size-3.5" /> {crm.alerts.length} alerta(s)
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Alertas do Sistema (Clique para resolver)</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {crm.alerts.map((a, i) => (
                <DropdownMenuItem key={i} onSelect={() => (crm as any).triggerAlertTask?.(a)}>
                  ⚠️ {a}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {crm.pause && (
          <span className="flex items-center gap-1.5 rounded-md bg-warning px-2.5 py-1 text-xs font-semibold text-warning-foreground">
            <AlertTriangle className="size-3.5" /> {crm.pause.reason} — {formatClock(pauseSeconds)}
            <button className="ml-1 underline" onClick={crm.endPause}>
              retomar
            </button>
          </span>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Helper button to generate test leads */}
          {operatorId && (
            <Button
              variant="outline"
              size="sm"
              className="border-dashed border-primary/50 text-primary hover:bg-primary/10"
              disabled={seedLeads.isPending}
              onClick={() => seedLeads.mutate()}
              title="Gerar 5 leads fictícios para teste rápido"
            >
              {seedLeads.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5 text-primary" />
              )}
              Leads de Teste
            </Button>
          )}

          {/* Pause menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="warning" size="sm" disabled={!crm.shiftActive}>
                <Coffee className="size-3.5" /> Pausa
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Selecionar pausa</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {pauseTypes.map((p) => (
                <DropdownMenuItem key={p.id} onSelect={() => crm.startPause(p.nome)}>
                  {p.nome} <span className="ml-auto text-[10px] text-muted-foreground">{p.max_minutes} min</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Shift control button */}
          {!crm.shiftActive ? (
            <Button variant="success" size="sm" onClick={crm.startShift}>
              <Play className="size-3.5" /> Iniciar Expediente
            </Button>
          ) : (
            <Button variant="destructive" size="sm" onClick={() => setShowFinishModal(true)}>
              <Square className="size-3.5" /> Finalizar Expediente
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/", replace: true });
            }}
            title="Sair do sistema"
          >
            <LogOut className="size-3.5" />
          </Button>

          <span className="hidden text-xs font-medium text-muted-foreground sm:inline">{operator}</span>
        </div>
      </header>

      <ExpedienteFinishModal
        open={showFinishModal}
        onClose={() => setShowFinishModal(false)}
        onConfirm={handleConfirmFinish}
        isLoading={finishing}
        summary={{
          durationSeconds: crm.shiftDurationSeconds,
          contactsCount: crm.contacts,
          conversionsCount: crm.conversions,
          pauseSeconds: pauseSeconds,
        }}
      />
    </>
  );
}
