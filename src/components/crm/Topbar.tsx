import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Bell, Coffee, Flame, LogOut } from "lucide-react";
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

export function Topbar({ operator }: { operator: string }) {
  const crm = useCrm();
  const navigate = useNavigate();
  const { data: pauseTypes = [] } = useActivePauseTypes();
  const [clock, setClock] = useState("--:--:--");

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("pt-BR"));
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, []);

  const pauseSeconds = crm.pause ? Math.floor((Date.now() - crm.pause.startedAt) / 1000) : 0;

  return (
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="warning" size="sm">
              <Coffee /> Motivos de pausa
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

        <Button
          variant="destructive"
          size="sm"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/", replace: true });
          }}
        >
          <LogOut /> Finalizar expediente
        </Button>
        <span className="hidden text-xs text-muted-foreground sm:inline">{operator}</span>
      </div>
    </header>
  );
}
