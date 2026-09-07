import { useState } from "react";
import {
  Bell, Calendar, Clock, Flame, FileUp, Layers,
  PhoneCall, Plus, Search, Snowflake, Thermometer,
  Trash2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCrm } from "@/lib/crm-store";
import { useLeads, useCreateLead, useUpdateLead, useDeleteLead, type LeadInput } from "@/hooks/useLeads";
import { LeadImportModal } from "@/components/crm/LeadImportModal";
import type { Lead } from "@/lib/supabase-types";

// ─── Constants ────────────────────────────────────────────────────────────────
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

const STATUS_COLOR: Record<Lead["status"], string> = {
  pending:   "bg-muted text-muted-foreground",
  contacted: "bg-info/15 text-info",
  converted: "bg-success/15 text-success",
  inactive:  "bg-destructive/10 text-destructive",
};

const BR_STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA",
  "MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN",
  "RO","RR","RS","SC","SE","SP","TO",
];

const ORIGINS = [
  { value: "instagram",  label: "Instagram" },
  { value: "facebook",   label: "Facebook" },
  { value: "linkedin",   label: "LinkedIn" },
  { value: "site",       label: "Site / Landing Page" },
  { value: "indicacao",  label: "Indicação" },
  { value: "whatsapp",   label: "WhatsApp" },
  { value: "telefone",   label: "Telefone receptivo" },
  { value: "evento",     label: "Evento / Feira" },
  { value: "csv",        label: "Importação CSV" },
  { value: "outro",      label: "Outro" },
  { value: "manual",     label: "Manual" },
];

// ─── Main Panel ───────────────────────────────────────────────────────────────
export function OpportunitiesPanel({ operatorId }: { operatorId: string }) {
  const crm = useCrm();
  const { data: leads = [], isLoading } = useLeads(operatorId);
  const createLead = useCreateLead(operatorId);
  const updateLead = useUpdateLead(operatorId);

  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<Temperature | "all" | "callbacks">("all");
  const [openForm, setOpenForm] = useState(false);
  const [openImport, setOpenImport] = useState(false);

  const nowIso = new Date().toISOString();
  const callbacksDue = leads.filter((l) => l.callback_at && l.callback_at <= nowIso);
  const allCallbacks = leads.filter((l) => !!l.callback_at);

  const visible = leads.filter((l) => {
    let matchTab = true;
    if (filterTab === "callbacks") matchTab = !!l.callback_at;
    else if (filterTab !== "all") matchTab = l.temperature === filterTab;
    const matchSearch = !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.phone ?? "").includes(search) ||
      (l.company ?? "").toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const quente = leads.filter((l) => l.temperature === "quente").length;
  const morno  = leads.filter((l) => l.temperature === "morno").length;
  const frio   = leads.filter((l) => l.temperature === "frio").length;

  return (
    <aside className="flex min-h-0 flex-col gap-2 border-border bg-sidebar p-3 lg:h-full lg:overflow-hidden lg:border-l">

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Meus clientes
        </p>
        <div className="flex gap-1">
          <Dialog open={openForm} onOpenChange={setOpenForm}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 gap-1 px-2 text-xs">
                <Plus className="size-3.5" /> Novo lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar novo lead</DialogTitle>
              </DialogHeader>
              <LeadForm
                onSubmit={async (values) => { await createLead.mutateAsync(values); setOpenForm(false); }}
                loading={createLead.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Callbacks Alert */}
      {callbacksDue.length > 0 && (
        <button
          onClick={() => setFilterTab("callbacks")}
          className="flex shrink-0 items-center justify-between rounded-lg border border-warning/40 bg-warning/15 px-3 py-2 text-xs font-semibold text-warning-foreground transition-all hover:bg-warning/25"
        >
          <span className="flex items-center gap-1.5 font-bold">
            <Bell className="size-4 animate-bounce text-warning" />
            {callbacksDue.length} retorno(s) pendente(s) hoje!
          </span>
          <span className="rounded bg-warning px-1.5 py-0.5 text-[10px]">Ver</span>
        </button>
      )}

      {/* Filter Pills */}
      <div className="flex shrink-0 flex-wrap gap-1.5">
        {(["all", "callbacks", "quente", "morno", "frio"] as const).map((t) => {
          const count = t === "all" ? leads.length : t === "callbacks" ? allCallbacks.length
            : t === "quente" ? quente : t === "morno" ? morno : frio;
          const label = t === "all" ? "Todos" : t === "callbacks" ? "Retornos"
            : TEMP_CONFIG[t].label;
          const Icon = t === "callbacks" ? Calendar : t !== "all" ? TEMP_CONFIG[t].icon : null;
          const active = filterTab === t;
          return (
            <button key={t} onClick={() => setFilterTab(t)}
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
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
        <Input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Nome, telefone ou empresa…" className="h-7 pl-7 text-xs" />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
            <X className="size-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Lead List */}
      <div className="min-h-0 flex-1 overflow-y-auto space-y-2">
        {isLoading && (
          <div className="flex h-20 items-center justify-center">
            <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        {!isLoading && visible.length === 0 && (
          <div className="flex h-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border">
            <Layers className="size-6 text-muted-foreground" />
            <p className="text-xs text-muted-foreground text-center px-4">
              {leads.length === 0
                ? "Nenhum lead cadastrado ainda. Clique em \"Novo lead\" ou \"CSV\" para importar."
                : "Nenhum lead corresponde à busca."}
            </p>
          </div>
        )}
        {visible.map((lead) => (
          <LeadCard key={lead.id} lead={lead}
            isSelected={crm.lead.realId === lead.id}
            onSelect={() => crm.selectLead(lead)}
            onUpdate={(updates) => updateLead.mutate({ id: lead.id, updates })}
            operatorId={operatorId}
          />
        ))}
      </div>

      {/* Summary */}
      <div className="stat-card shrink-0">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Layers className="size-3.5" /> Resumo
        </p>
        <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
          <span className="text-muted-foreground">Total na carteira</span>
          <span className="text-right font-mono font-bold">{leads.length}</span>
          <span className="text-muted-foreground">Retornos pendentes</span>
          <span className="text-right font-mono font-bold text-warning">{allCallbacks.length}</span>
          <span className="text-muted-foreground">Convertidos</span>
          <span className="text-right font-mono font-bold text-success">
            {leads.filter((l) => l.status === "converted").length}
          </span>
        </div>
      </div>
    </aside>
  );
}

// ─── LeadCard ─────────────────────────────────────────────────────────────────
function LeadCard({ lead, isSelected, onSelect, onUpdate, operatorId }: {
  lead: Lead;
  isSelected?: boolean;
  onSelect: () => void;
  onUpdate: (u: Partial<Lead>) => void;
  operatorId: string;
}) {
  const deleteLead = useDeleteLead(operatorId);
  const temp = TEMP_CONFIG[lead.temperature as Temperature] ?? TEMP_CONFIG.morno;
  const Icon = temp.icon;
  const [showScheduler, setShowScheduler] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  let callbackFormatted: string | null = null;
  let isCallbackDue = false;
  if (lead.callback_at) {
    const cbDate = new Date(lead.callback_at);
    isCallbackDue = cbDate <= new Date();
    callbackFormatted = cbDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className={`rounded-xl border p-3 text-xs transition-all ${
      isSelected ? "border-primary bg-primary/10 ring-1 ring-primary/40" : "border-border bg-panel hover:border-border/80"
    }`}>
      {/* Header row */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setShowDetail(!showDetail)}>
          <div className="flex items-center gap-1.5">
            <h4 className="truncate font-bold text-sm leading-tight">{lead.name}</h4>
            {lead.company && <span className="shrink-0 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">{lead.company}</span>}
          </div>
          {lead.phone && <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{lead.phone}</p>}
          {lead.city && <p className="text-[10px] text-muted-foreground">{lead.city}{lead.state ? ` / ${lead.state}` : ""}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${temp.badge}`}>
            <Icon className="size-2.5" /> {temp.label}
          </span>
          <Badge className={`text-[10px] font-semibold ${STATUS_COLOR[lead.status]}`}>
            {STATUS_LABEL[lead.status]}
          </Badge>
        </div>
      </div>

      {/* Expanded detail */}
      {showDetail && (
        <div className="mt-2 rounded-lg border border-border/50 bg-background/60 p-2 space-y-0.5">
          {lead.phone2   && <p><span className="text-muted-foreground">Tel. 2:</span> <span className="font-mono">{lead.phone2}</span></p>}
          {lead.email    && <p><span className="text-muted-foreground">E-mail:</span> {lead.email}</p>}
          {lead.cpf      && <p><span className="text-muted-foreground">CPF:</span> <span className="font-mono">{lead.cpf}</span></p>}
          {lead.profession && <p><span className="text-muted-foreground">Profissão:</span> {lead.profession}</p>}
          {lead.origin   && <p><span className="text-muted-foreground">Origem:</span> {ORIGINS.find(o => o.value === lead.origin)?.label ?? lead.origin}</p>}
          {lead.notes    && <p className="mt-1 rounded bg-muted/60 px-2 py-1 italic text-muted-foreground">{lead.notes}</p>}
        </div>
      )}

      {/* Callback badge */}
      {lead.callback_at && (
        <div className={`mt-2 flex items-center justify-between rounded-md border px-2 py-1 ${
          isCallbackDue ? "border-warning/50 bg-warning/15 animate-pulse" : "border-border bg-muted/40"
        }`}>
          <span className={`flex items-center gap-1 font-semibold ${isCallbackDue ? "text-warning-foreground" : "text-muted-foreground"}`}>
            <Clock className="size-3" />
            {isCallbackDue ? "⚠️ Retornar HOJE:" : "Retorno:"} {callbackFormatted}
          </span>
          <button onClick={() => onUpdate({ callback_at: null })} className="text-[10px] underline hover:text-foreground">
            remover
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2">
        <Button size="sm" variant={isSelected ? "success" : "default"} className="h-7 flex-1 gap-1 text-[11px]" onClick={onSelect}>
          <PhoneCall className="size-3" /> {isSelected ? "Em atendimento" : "Atender"}
        </Button>
        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => setShowScheduler(!showScheduler)}>
          <Calendar className="size-3" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-destructive hover:text-destructive">
              <Trash2 className="size-3" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover lead?</AlertDialogTitle>
              <AlertDialogDescription>
                "{lead.name}" será removido da sua carteira permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteLead.mutate(lead.id)}>
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Quick status row */}
      <div className="mt-1.5 flex flex-wrap gap-1">
        {(["quente", "morno", "frio"] as Temperature[]).map((t) => (
          <button key={t} disabled={lead.temperature === t} onClick={() => onUpdate({ temperature: t })}
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
              lead.temperature === t ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}>
            {TEMP_CONFIG[t].label}
          </button>
        ))}
        {lead.status !== "converted" && (
          <button onClick={() => onUpdate({ status: "converted" })}
            className="ml-auto rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success hover:bg-success/25">
            Convertido ✓
          </button>
        )}
      </div>

      {/* Scheduler */}
      {showScheduler && (
        <div className="mt-2 space-y-1.5 rounded-lg border border-border bg-background p-2">
          <p className="text-[10px] font-bold uppercase text-muted-foreground">Agendar retorno:</p>
          <div className="grid grid-cols-4 gap-1">
            {[["Amanhã", 1], ["3 dias", 3], ["7 dias", 7], ["15 dias", 15]].map(([label, days]) => (
              <button key={label as string} onClick={() => {
                const d = new Date(); d.setDate(d.getDate() + (days as number));
                onUpdate({ callback_at: d.toISOString() });
                setShowScheduler(false);
              }} className="rounded bg-muted px-1 py-1 text-[10px] font-semibold hover:bg-primary/20 hover:text-primary">
                {label as string}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LeadForm — Full 4-section form ───────────────────────────────────────────
function LeadForm({ onSubmit, loading }: {
  onSubmit: (values: LeadInput) => Promise<void>;
  loading?: boolean;
}) {
  const [form, setForm] = useState<LeadInput>({ name: "", temperature: "morno", origin: "manual" });
  const [callbackDays, setCallbackDays] = useState("0");

  const set = (key: keyof LeadInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) return;
    let callback_at: string | undefined;
    const days = parseInt(callbackDays);
    if (days > 0) { const d = new Date(); d.setDate(d.getDate() + days); callback_at = d.toISOString(); }
    await onSubmit({ ...form, name: form.name.trim(), callback_at });
    setForm({ name: "", temperature: "morno", origin: "manual" });
    setCallbackDays("0");
  };

  return (
    <form onSubmit={handleSubmit} className="pt-1">
      <Tabs defaultValue="pessoal" className="w-full">
        <TabsList className="grid w-full grid-cols-4 text-xs mb-4">
          <TabsTrigger value="pessoal">Pessoal</TabsTrigger>
          <TabsTrigger value="localizacao">Localização</TabsTrigger>
          <TabsTrigger value="comercial">Comercial</TabsTrigger>
          <TabsTrigger value="agendamento">Agendamento</TabsTrigger>
        </TabsList>

        {/* ── Aba 1: Dados Pessoais ── */}
        <TabsContent value="pessoal" className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome completo <span className="text-destructive">*</span></Label>
            <Input value={form.name ?? ""} onChange={set("name")} placeholder="João da Silva" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Telefone principal</Label>
              <Input value={form.phone ?? ""} onChange={set("phone")} placeholder="(11) 99999-0000" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone secundário</Label>
              <Input value={form.phone2 ?? ""} onChange={set("phone2")} placeholder="(11) 98888-0000" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input type="email" value={form.email ?? ""} onChange={set("email")} placeholder="joao@email.com" />
          </div>
          <div className="space-y-1.5">
            <Label>CPF</Label>
            <Input value={form.cpf ?? ""} onChange={set("cpf")} placeholder="000.000.000-00" />
          </div>
        </TabsContent>

        {/* ── Aba 2: Localização ── */}
        <TabsContent value="localizacao" className="space-y-3">
          <div className="space-y-1.5">
            <Label>Cidade</Label>
            <Input value={form.city ?? ""} onChange={set("city")} placeholder="São Paulo" />
          </div>
          <div className="space-y-1.5">
            <Label>Estado (UF)</Label>
            <Select value={form.state ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, state: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecionar estado" /></SelectTrigger>
              <SelectContent>
                {BR_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        {/* ── Aba 3: Informações Comerciais ── */}
        <TabsContent value="comercial" className="space-y-3">
          <div className="space-y-1.5">
            <Label>Profissão / Cargo</Label>
            <Input value={form.profession ?? ""} onChange={set("profession")} placeholder="Enfermeiro, Gerente, Autônomo…" />
          </div>
          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <Input value={form.company ?? ""} onChange={set("company")} placeholder="Nome da empresa do lead" />
          </div>
          <div className="space-y-1.5">
            <Label>Origem do lead <span className="text-destructive">*</span></Label>
            <Select value={form.origin ?? "manual"} onValueChange={(v) => setForm((f) => ({ ...f, origin: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ORIGINS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Temperatura <span className="text-destructive">*</span></Label>
            <Select value={form.temperature ?? "morno"} onValueChange={(v) => setForm((f) => ({ ...f, temperature: v as Temperature }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="quente"><span className="flex items-center gap-2"><Flame className="size-4 text-hot" /> Quente — alto interesse</span></SelectItem>
                <SelectItem value="morno"><span className="flex items-center gap-2"><Thermometer className="size-4 text-warm" /> Morno — interesse moderado</span></SelectItem>
                <SelectItem value="frio"><span className="flex items-center gap-2"><Snowflake className="size-4 text-muted-foreground" /> Frio — pouco interesse</span></SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        {/* ── Aba 4: Agendamento ── */}
        <TabsContent value="agendamento" className="space-y-3">
          <div className="space-y-1.5">
            <Label>Agendar retorno inicial</Label>
            <Select value={callbackDays} onValueChange={setCallbackDays}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Sem retorno agendado</SelectItem>
                <SelectItem value="1">Retornar amanhã</SelectItem>
                <SelectItem value="3">Retornar em 3 dias</SelectItem>
                <SelectItem value="7">Retornar em 7 dias</SelectItem>
                <SelectItem value="15">Retornar em 15 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea
              rows={4}
              value={form.notes ?? ""}
              onChange={set("notes")}
              placeholder="Interesse no produto X, melhor horário para ligar, objeções mencionadas…"
              className="resize-none"
            />
          </div>
        </TabsContent>
      </Tabs>

      <Button type="submit" className="mt-4 w-full" disabled={loading || !form.name?.trim()}>
        {loading ? "Cadastrando..." : "Cadastrar lead"}
      </Button>
    </form>
  );
}
