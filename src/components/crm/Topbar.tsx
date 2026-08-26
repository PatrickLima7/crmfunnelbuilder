import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Bell, Coffee, Flame, LogOut, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { PAUSE_REASONS, formatClock } from "@/lib/crm-data";
import { useCrm } from "@/lib/crm-store";
import { supabase } from "@/lib/supabase";
import { usePauseTypes } from "@/hooks/usePauseTypes";

export function Topbar({ operator }: { operator: string }) {
  const crm = useCrm();
  const navigate = useNavigate();
  const { data: pauseTypes = [...PAUSE_REASONS] } = usePauseTypes();
  const [clock, setClock] = useState("--:--:--");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

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
        <span className="animate-pulse-alert flex items-center gap-1.5 rounded-md bg-destructive px-2.5 py-1 text-xs font-semibold text-destructive-foreground">
          <Bell className="size-3.5" /> {crm.alerts.length} alerta(s)
        </span>
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="info" size="sm">
              <UserPlus /> Cadastrar lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar lead</DialogTitle>
              <DialogDescription>O lead entra no fim da fila de oportunidades.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="lead-name">Nome</Label>
                <Input id="lead-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-phone">Telefone</Label>
                <Input id="lead-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={!name.trim() || !phone.trim()}
                onClick={() => {
                  crm.registerLead(name.trim(), phone.trim());
                  setName("");
                  setPhone("");
                  setOpen(false);
                }}
              >
                Salvar lead
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="warning" size="sm">
              <Coffee /> Motivos de pausa
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Selecionar pausa</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {pauseTypes.map((r) => (
              <DropdownMenuItem key={r} onSelect={() => crm.startPause(r)}>
                {r}
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
