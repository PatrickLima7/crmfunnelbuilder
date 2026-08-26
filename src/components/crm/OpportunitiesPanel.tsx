import { useState } from "react";
import {
  Bell,
  Calendar,
  Clock,
  Flame,
  Layers,
  PhoneCall,
  Plus,
  Search,
  Snowflake,
  Thermometer,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCrm } from "@/lib/crm-store";
import { useLeads, useCreateLead, useUpdateLead } from "@/hooks/useLeads";
import type { Lead } from "@/lib/supabase-types";

// ─── Temperature config ────────────────────────────────────────────────────────
type Temperature = "quente" | "morno" | "frio";

const TEMP_CONFIG: Record<Temperature, { label: string; icon: React.ElementType; badge: string }> = {
  quente: { label: "Quente", icon: Flame,       badge: "bg-hot/15 text-hot border-hot/30" },
  morno:  { label: "Morno",  icon: Thermometer, badge: "bg-warm/15 text-warm border-warm/30" },
  frio:   { label: "Frio",   icon: Snowflake,   badge: "bg-muted text-muted-foreground border-border" },
};

const STATUS_LABEL: Record<Lead["status"], string> = {
  pending:   "Pendente",
  contacted: "Contatado",
  converted: "Convertido",
  inactive:  "Inativo",
};

// ─── Main component ────────────────────────────────────────────────────────────
export function OpportunitiesPanel({ operatorId }: { operatorId: string }) {
  const crm = useCrm();
  const { data: leads = [], isLoading } = useLeads(operatorId);
  const createLead = useCreateLead(operatorId);
  const updateLead = useUpdateLead(operatorId);

  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<Temperature | "all" | "callbacks">("all");
  const [open, setOpen] = useState(false);

  const nowIso = new Date().toISOString();

  // Callbacks due today or overdue
  const callbacksDue = leads.filter((l) => l.callback_at && l.callback_at <= nowIso);
  const allCallbacks = leads.filter((l) => !!l.callback_at);

  // Filter + search
  const visible = leads.filter((l) => {
    let matchTab = true;
    if (filterTab === "callbacks") {
      matchTab = !!l.callback_at;
    } else if (filterTab !== "all") {
      matchTab = l.temperature === filterTab;
    }
    const matchSearch =
      !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.phone ?? "").includes(search);
    return matchTab && matchSearch;
  });

  const quente = leads.filter((l) => l.temperature === "quente").length;
  const morno  = leads.filter((l) => l.temperature === "morno").length;
  const frio   = leads.filter((l) => l.temperature === "frio").length;

  return (
    <aside className="flex min-h-0 flex-col gap-2 border-border bg-sidebar p-3 lg:h-full lg:overflow-hidden lg:border-l">

      {/* Header + Add button */}
      <div className="flex shrink-0 items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Meus clientes
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="default" className="h-7 gap-1 px-2 text-xs">
              <Plus className="size-3.5" /> Novo lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar novo lead</DialogTitle>
            </DialogHeader>
            <LeadForm
              operatorId={operatorId}
              onSubmit={async (values) => {
                await createLead.mutateAsync(values);
                setOpen(false);
              }}
              loading={createLead.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Callbacks Alert Banner */}
      {callbacksDue.length > 0 && (
        <button
          onClick={() => setFilterTab("callbacks")}
          className="flex shrink-0 items-center justify-between rounded-lg border border-warning/40 bg-warning/15 px-3 py-2 text-xs font-semibold text-warning-foreground transition-all hover:bg-warning/25"
        >
          <span className="flex items-center gap-1.5 font-bold">
            <Bell className="size-4 animate-bounce text-warning" />
            {callbacksDue.length} retorno(s) pendente(s) hoje!
          </span>
          <span className="rounded bg-warning px-1.5 py-0.5 text-[10px] text-warning-foreground">
            Ver lista
          </span>
        </button>
      )}

      {/* Temperature / Callback filter pills */}
      <div className="flex shrink-0 flex-wrap gap-1.5">
        {(["all", "callbacks", "quente", "morno", "frio"] as const).map((t) => {
          let count = 0;
          let label = "";
          let Icon: React.ElementType | null = null;

          if (t === "all") {
            count = leads.length;
            label = "Todos";
          } else if (t === "callbacks") {
            count = allCallbacks.length;
            label = "Retornos";
            Icon = Calendar;
          } else {
            const cfg = TEMP_CONFIG[t];
            count = t === "quente" ? quente : t === "morno" ? morno : frio;
            label = cfg.label;
            Icon = cfg.icon;
          }

          const active = filterTab === t;
          return (
            <button
              key={t}
              onClick={() => setFilterTab(t)}
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {Icon && <Icon className="size-3" />}
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative shrink-0">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone…"
          className="h-7 pl-7 text-xs"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
            <X className="size-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Lead list */}
      <div className="min-h-0 flex-1 overflow-y-auto space-y-2">
        {isLoading && (
          <div className="flex h-20 items-center justify-center">
            <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        {!isLoading && visible.length === 0 && (
          <div className="flex h-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border p-3 text-center">
            <Layers className="size-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {leads.length === 0 ? "Nenhum lead cadastrado ainda." : "Nenhum lead encontrado."}
            </p>
          </div>
        )}
        {visible.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            isSelected={crm.lead.realId === lead.id}
            onSelect={() => crm.selectLead(lead)}
            onUpdate={(updates) => updateLead.mutate({ id: lead.id, updates })}
          />
        ))}
      </div>

      {/* Queue summary */}
      <div className="stat-card shrink-0">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Layers className="size-3.5" /> Resumo do operador
        </p>
        <div className="mt-2 flex justify-between text-xs">
          <span className="text-muted-foreground">Leads na sua carteira</span>
          <span className="font-mono font-bold">{leads.length}</span>
        </div>
        <div className="mt-1 flex justify-between text-xs">
          <span className="text-muted-foreground">Retornos pendentes</span>
          <span className="font-mono font-bold text-warning">{allCallbacks.length}</span>
        </div>
      </div>
    </aside>
  );
}

// ─── LeadCard ─────────────────────────────────────────────────────────────────
function LeadCard({
  lead,
  isSelected,
  onSelect,
  onUpdate,
}: {
  lead: Lead;
  isSelected?: boolean;
  onSelect: () => void;
  onUpdate: (u: Partial<Pick<Lead, "status" | "temperature" | "notes" | "callback_at">>) => void;
}) {
  const temp = TEMP_CONFIG[lead.temperature as Temperature] ?? TEMP_CONFIG.morno;
  const Icon = temp.icon;
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Format callback date if present
  let callbackFormatted: string | null = null;
  let isCallbackDue = false;
  if (lead.callback_at) {
    const cbDate = new Date(lead.callback_at);
    const now = new Date();
    isCallbackDue = cbDate <= now;
    callbackFormatted = cbDate.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div
      className={`rounded-xl border p-3 text-xs transition-all ${
        isSelected
          ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/50"
          : "border-border bg-panel hover:border-border/80"
      }`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="truncate font-bold text-sm">{lead.name}</h4>
          {lead.phone && <p className="font-mono text-[11px] text-muted-foreground">{lead.phone}</p>}
        </div>
        <span className={`flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${temp.badge}`}>
          <Icon className="size-2.5" /> {temp.label}
        </span>
      </div>

      {/* Notes */}
      {lead.notes && (
        <p className="mt-1.5 rounded-md bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground line-clamp-2">
          {lead.notes}
        </p>
      )}

      {/* Callback Badge */}
      {lead.callback_at && (
        <div
          className={`mt-2 flex items-center justify-between rounded-md border px-2 py-1 ${
            isCallbackDue
              ? "border-warning/50 bg-warning/15 font-bold text-warning-foreground animate-pulse"
              : "border-border bg-muted/40 text-muted-foreground"
          }`}
        >
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {isCallbackDue ? "Retornar HOJE:" : "Retorno:"} {callbackFormatted}
          </span>
          <button
            onClick={() => onUpdate({ callback_at: null })}
            className="text-[10px] underline hover:text-foreground"
            title="Remover agendamento"
          >
            remover
          </button>
        </div>
      )}

      {/* Quick Select & Callback Buttons */}
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border/50 pt-2">
        <Button
          size="sm"
          variant={isSelected ? "success" : "default"}
          className="h-7 flex-1 gap-1 text-[11px]"
          onClick={onSelect}
        >
          <PhoneCall className="size-3" /> {isSelected ? "Em atendimento" : "Atender lead"}
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 px-2 text-[11px]"
          onClick={() => setShowDatePicker(!showDatePicker)}
          title="Agendar retorno de ligação"
        >
          <Calendar className="size-3" /> Retorno
        </Button>
      </div>

      {/* Quick Callback Selector Drawer */}
      {showDatePicker && (
        <div className="mt-2 space-y-1.5 rounded-lg border border-border bg-background p-2">
          <p className="text-[10px] font-bold uppercase text-muted-foreground">Agendar retorno para:</p>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => {
                const d = new Date(); d.setDate(d.getDate() + 1);
                onUpdate({ callback_at: d.toISOString() });
                setShowDatePicker(false);
              }}
              className="rounded bg-muted px-1.5 py-1 text-[10px] font-semibold hover:bg-primary/20 hover:text-primary"
            >
              Amanhã
            </button>
            <button
              onClick={() => {
                const d = new Date(); d.setDate(d.getDate() + 3);
                onUpdate({ callback_at: d.toISOString() });
                setShowDatePicker(false);
              }}
              className="rounded bg-muted px-1.5 py-1 text-[10px] font-semibold hover:bg-primary/20 hover:text-primary"
            >
              3 dias
            </button>
            <button
              onClick={() => {
                const d = new Date(); d.setDate(d.getDate() + 7);
                onUpdate({ callback_at: d.toISOString() });
                setShowDatePicker(false);
              }}
              className="rounded bg-muted px-1.5 py-1 text-[10px] font-semibold hover:bg-primary/20 hover:text-primary"
            >
              7 dias
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LeadForm ─────────────────────────────────────────────────────────────────
function LeadForm({ onSubmit, loading }: {
  operatorId: string;
  onSubmit: (values: { name: string; phone: string; email?: string; temperature: Temperature; notes?: string; callback_at?: string }) => Promise<void>;
  loading?: boolean;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [temperature, setTemperature] = useState<Temperature>("morno");
  const [notes, setNotes] = useState("");
  const [callbackDays, setCallbackDays] = useState<string>("0");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let callback_at: string | undefined = undefined;
    const days = parseInt(callbackDays);
    if (days > 0) {
      const d = new Date();
      d.setDate(d.getDate() + days);
      callback_at = d.toISOString();
    }

    await onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      temperature,
      notes: notes.trim() || undefined,
      callback_at,
    });
    setName(""); setPhone(""); setEmail(""); setTemperature("morno"); setNotes(""); setCallbackDays("0");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-1">
      <div className="space-y-1.5">
        <Label>Nome completo *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="João Silva" required />
      </div>
      <div className="space-y-1.5">
        <Label>Telefone</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 91234-5678" />
      </div>
      <div className="space-y-1.5">
        <Label>E-mail</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="joao@email.com" />
      </div>
      <div className="space-y-1.5">
        <Label>Temperatura do lead *</Label>
        <Select value={temperature} onValueChange={(v) => setTemperature(v as Temperature)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="quente">
              <span className="flex items-center gap-2">
                <Flame className="size-4 text-hot" /> Quente — alto interesse
              </span>
            </SelectItem>
            <SelectItem value="morno">
              <span className="flex items-center gap-2">
                <Thermometer className="size-4 text-warm" /> Morno — interesse moderado
              </span>
            </SelectItem>
            <SelectItem value="frio">
              <span className="flex items-center gap-2">
                <Snowflake className="size-4 text-muted-foreground" /> Frio — pouco interesse
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Agendar retorno inicial</Label>
        <Select value={callbackDays} onValueChange={setCallbackDays}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Sem retorno agendado</SelectItem>
            <SelectItem value="1">Retornar amanhã</SelectItem>
            <SelectItem value="3">Retornar em 3 dias</SelectItem>
            <SelectItem value="7">Retornar em 7 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Observações</Label>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Interesse no produto X, ligado de manhã…"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
        {loading ? "Cadastrando..." : "Cadastrar lead"}
      </Button>
    </form>
  );
}
