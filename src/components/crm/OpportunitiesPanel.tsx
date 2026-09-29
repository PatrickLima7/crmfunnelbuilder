import { matchesLeadFilter, type LeadFilter, CRM_TIME_ZONE } from "@/lib/lead-categories";
import { useEffect, useState } from "react";
import {
  Bell, Calendar, Clock, Flame, FileUp, Layers,
  PhoneCall, Plus, Search, Snowflake, Thermometer,
  Trash2, X, Sprout, Sparkles,
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
import { useOptionalCrm } from "@/lib/crm-store";
import { useLeads, useCreateLead, useUpdateLead, useDeleteLead, type LeadInput } from "@/hooks/useLeads";
import { useActiveMidias } from "@/hooks/useMidias";
import { useActiveCursos, DEFAULT_CURSO_NAME } from "@/hooks/useCursos";
import { DateTimePicker } from "@/components/crm/DateTimePicker";
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
  novo:      "Novo Lead",
  contacted: "Contatado",
  converted: "Convertido",
  inactive:  "Inativo",
  em_nutricao: "Em Nutrição",
  blacklisted: "Blacklist",
};

const STATUS_COLOR: Record<Lead["status"], string> = {
  pending:   "bg-muted text-muted-foreground",
  novo:      "bg-primary/15 text-primary border-primary/30 font-bold",
  contacted: "bg-info/15 text-info",
  converted: "bg-success/15 text-success",
  inactive:  "bg-destructive/10 text-destructive",
  em_nutricao: "bg-purple-500/15 text-purple-500",
  blacklisted: "bg-destructive/15 text-destructive font-bold",
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
export function OpportunitiesPanel({ operatorId, leadData, selectedLeadId, onSelectLead }: {
  operatorId: string; leadData?: Lead[]; selectedLeadId?: string | undefined; onSelectLead?: (lead: Lead) => void;
}) {
  const crm = useOptionalCrm();
  const query = useLeads(operatorId, leadData === undefined);
  const leads = leadData ?? query.data ?? [];
  const isLoading = leadData === undefined && query.isLoading;
  const isError = leadData === undefined && query.isError;
  const createLead = useCreateLead(operatorId);
  const updateLead = useUpdateLead(operatorId);

  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<LeadFilter>(onSelectLead ? "all" : "novo");
  const [openForm, setOpenForm] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(timer);
  }, []);
  const filters: LeadFilter[] = ["novo", "callbacks", "future", "quente", "morno", "frio", "nutricao", "converted", "all"];
  const labels: Record<LeadFilter, string> = {
    novo: "Novo lead · Super quente", callbacks: "Retornos pendentes", future: "Retornos futuros",
    quente: "Quente", morno: "Morno", frio: "Frio", nutricao: "Em nutrição", converted: "Convertidos", all: "Todos",
  };
  const searchedLeads = leads.filter((lead) => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return !term || [lead.name, lead.phone, lead.company].some((value) => value?.toLocaleLowerCase("pt-BR").includes(term));
  });
  const callbacksDue = leads.filter((lead) => matchesLeadFilter(lead, "callbacks", now));
  const futureCallbacks = leads.filter((lead) => matchesLeadFilter(lead, "future", now));
  const newLeads = leads.filter((lead) => matchesLeadFilter(lead, "novo", now));
  const singleTabList = searchedLeads.filter((lead) => matchesLeadFilter(lead, filterTab, now))
    .sort((a, b) => {
      if (filterTab === "all" && (a.status === "novo") !== (b.status === "novo")) return a.status === "novo" ? -1 : 1;
      if (filterTab === "callbacks" || filterTab === "future") return Date.parse(a.callback_at!) - Date.parse(b.callback_at!);
      if (a.status === "novo" && b.status === "novo") return Date.parse(a.data_ultimo_cadastro ?? a.created_at) - Date.parse(b.data_ultimo_cadastro ?? b.created_at);
      return 0;
    });

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

      {newLeads.length > 0 && (
        <button onClick={() => setFilterTab("novo")} className="rounded-lg border border-primary bg-primary/10 p-2 text-left text-xs font-bold text-primary">
          <Sparkles className="mr-1 inline size-4" /> {newLeads.length} novo(s) lead(s) — prioridade máxima. Atenda no primeiro minuto.
        </button>
      )}
      <div className="flex shrink-0 flex-wrap gap-1.5">
        {filters.map((filter) => (
          <button key={filter} onClick={() => setFilterTab(filter)}
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${filterTab === filter ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
            {labels[filter]} ({searchedLeads.filter((lead) => matchesLeadFilter(lead, filter, now)).length})
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">Super quente: novo lead. Quente: interessado. Morno: indeciso ou retorno. Frio: sem resposta. Classificação ajustável após contato.</p>

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

      {isError && <p role="alert" className="text-xs text-destructive">Falha ao atualizar a carteira. Confira sua conexão e tente novamente.</p>}
      {/* Lead List */}
      <div className="min-h-0 flex-1 overflow-y-auto space-y-4 pr-1">
        {isLoading && (
          <div className="flex h-20 items-center justify-center">
            <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!isLoading && singleTabList.length === 0 && (
          <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">Nenhum lead corresponde a este filtro e busca.</p>
        )}
        {!isLoading && singleTabList.map((lead) => (
          <LeadCard key={lead.id} lead={lead} isSelected={(selectedLeadId ?? crm?.lead.realId) === lead.id} supervising={!!onSelectLead}
            onSelect={() => onSelectLead ? onSelectLead(lead) : crm?.selectLead(lead as any)}
            onUpdate={(updates) => updateLead.mutate({ id: lead.id, updates })} operatorId={operatorId} />
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
          <span className="text-right font-mono font-bold text-warning">{callbacksDue.length}</span>
          <span className="text-muted-foreground">Retornos futuros</span>
          <span className="text-right font-mono font-bold">{futureCallbacks.length}</span>
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
function LeadCard({ lead, isSelected, onSelect, onUpdate, operatorId, supervising = false }: {
  supervising?: boolean;
  lead: Lead;
  isSelected?: boolean;
  onSelect: () => void;
  onUpdate: (u: Partial<Lead>) => void;
  operatorId: string;
}) {
  const deleteLead = useDeleteLead(operatorId);
  const temp = lead.status === "novo"
    ? { label: "Super quente", icon: Sparkles, badge: "bg-primary/15 text-primary border-primary/30" }
    : TEMP_CONFIG[lead.temperature as Temperature] ?? { label: "Não classificado", icon: Thermometer, badge: "bg-muted text-muted-foreground" };
  const Icon = temp.icon;
  const [showScheduler, setShowScheduler] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  let callbackFormatted: string | null = null;
  let isCallbackDue = false;
  if (lead.callback_at) {
    const cbDate = new Date(lead.callback_at);
    isCallbackDue = cbDate <= new Date();
    callbackFormatted = cbDate.toLocaleDateString("pt-BR", { timeZone: CRM_TIME_ZONE, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
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

      {lead.status === "novo" && (
        <p className="mt-2 text-[10px] font-bold text-primary">
          {Date.now() - Date.parse(lead.data_ultimo_cadastro ?? lead.created_at) >= 60000
            ? "Prioridade: novo lead aguardando há mais de 1 minuto."
            : "Novo lead: faça o primeiro contato agora."}
        </p>
      )}
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
          lead.status === "converted"
            ? "border-success/50 bg-success/15"
            : isCallbackDue ? "border-warning/50 bg-warning/15 animate-pulse" : "border-border bg-muted/40"
        }`}>
          <span className={`flex items-center gap-1 font-semibold ${
            lead.status === "converted" ? "text-success font-bold" : isCallbackDue ? "text-warning-foreground" : "text-muted-foreground"
          }`}>
            <Clock className="size-3" />
            {lead.status === "converted"
              ? `🎯 Pós-Venda: ${callbackFormatted}`
              : `${isCallbackDue ? "⚠️ Retornar HOJE:" : "Retorno:"} ${callbackFormatted}`
            }
          </span>
          <button onClick={() => onUpdate({ callback_at: null })} className="text-[10px] underline hover:text-foreground">
            remover
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2">
        <Button size="sm" variant={isSelected ? "success" : "default"} className="h-7 flex-1 gap-1 text-[11px]" onClick={onSelect}>
          <PhoneCall className="size-3" /> {supervising ? (isSelected ? "Selecionado" : "Ver lead") : (isSelected ? "Em atendimento" : "Atender")}
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
          <button key={t} disabled={lead.temperature === t && lead.status !== "novo"} onClick={() => onUpdate({ temperature: t, ...(lead.status === "novo" ? { status: "contacted" as const } : {}) })}
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

      {/* Standardized Scheduler */}
      {showScheduler && (
        <div className="mt-2 space-y-2 rounded-lg border border-border bg-background p-2.5">
          <DateTimePicker
            label="Reagendar retorno exato:"
            value={lead.callback_at}
            onChange={(iso) => {
              onUpdate({ callback_at: iso || null, ...(lead.status === "novo" ? { status: "contacted" as const } : {}) });
              setShowScheduler(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── LeadForm — Exactly 2 Tabs: Principal & Agendamento ───────────────────────
function LeadForm({ onSubmit, loading }: {
  onSubmit: (values: LeadInput) => Promise<void>;
  loading?: boolean;
}) {
  const { data: midias = [] } = useActiveMidias();
  const { data: cursos = [] } = useActiveCursos();

  const [form, setForm] = useState<LeadInput>(() => {

    return {
      name: "",
      phone: "",
      midia: "",
      curso: DEFAULT_CURSO_NAME,
      temperature: "morno",
      city: "Divinópolis",
      state: "MG",
      origin: "manual",
      callback_at: "",
    };
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const set = (key: keyof LeadInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation for all required fields
    if (!form.name?.trim()) { setErrorMsg("O campo Nome é obrigatório."); return; }
    if (!form.phone?.trim()) { setErrorMsg("O campo Telefone 1 é obrigatório."); return; }
    if (!form.midia?.trim()) { setErrorMsg("Selecione a Origem do lead (mídia)."); return; }
    if (!form.curso?.trim()) { setErrorMsg("Selecione o Curso procurado."); return; }
    if (!form.temperature) { setErrorMsg("Selecione a Temperatura."); return; }
    if (!form.city?.trim()) { setErrorMsg("O campo Cidade é obrigatório."); return; }
    if (!form.state?.trim()) { setErrorMsg("O campo Estado é obrigatório."); return; }

    setErrorMsg(null);
    await onSubmit({
      ...form,
      name: form.name.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      midia: form.midia,
      curso: form.curso,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="pt-1 space-y-4">
      {errorMsg && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-2 text-xs font-bold text-destructive">
          ⚠️ {errorMsg}
        </div>
      )}

      <Tabs defaultValue="principal" className="w-full">
        <TabsList className="grid w-full grid-cols-2 text-xs mb-4">
          <TabsTrigger value="principal">1. Principal (Dados Gerais)</TabsTrigger>
          <TabsTrigger value="agendamento">2. Agendamento de Contato</TabsTrigger>
        </TabsList>

        {/* ── Aba 1: Principal ── */}
        <TabsContent value="principal" className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Nome completo <span className="text-destructive">*</span></Label>
            <Input
              value={form.name ?? ""}
              onChange={set("name")}
              placeholder="Ex: Carlos Eduardo Silva"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Telefone 1 <span className="text-destructive">*</span></Label>
            <Input
              value={form.phone ?? ""}
              onChange={set("phone")}
              placeholder="(37) 99999-0000"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Origem do lead (Mídia) <span className="text-destructive">*</span></Label>
              <Select
                value={form.midia ?? ""}
                onValueChange={(v) => { setForm((f) => ({ ...f, midia: v, origin: v })); setErrorMsg(null); }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione a mídia" />
                </SelectTrigger>
                <SelectContent>
                  {midias.map((m) => (
                    <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>
                  ))}
                  {midias.length === 0 && (
                    <>
                      <SelectItem value="Instagram">Instagram</SelectItem>
                      <SelectItem value="Facebook">Facebook</SelectItem>
                      <SelectItem value="Google Ads">Google Ads</SelectItem>
                      <SelectItem value="Site / Landing Page">Site / Landing Page</SelectItem>
                      <SelectItem value="Indicação">Indicação</SelectItem>
                      <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Curso procurado <span className="text-destructive">*</span></Label>
              <Select
                value={form.curso ?? DEFAULT_CURSO_NAME}
                onValueChange={(v) => { setForm((f) => ({ ...f, curso: v })); setErrorMsg(null); }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione o curso" />
                </SelectTrigger>
                <SelectContent>
                  {cursos.map((c) => (
                    <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                  ))}
                  {cursos.length === 0 && (
                    <SelectItem value={DEFAULT_CURSO_NAME}>{DEFAULT_CURSO_NAME}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Temperatura <span className="text-destructive">*</span></Label>
            <Select
              value={form.temperature ?? "morno"}
              onValueChange={(v) => { setForm((f) => ({ ...f, temperature: v as Temperature })); setErrorMsg(null); }}
            >
              <SelectTrigger className="h-9 text-xs">
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Cidade <span className="text-destructive">*</span></Label>
              <Input
                value={form.city ?? "Divinópolis"}
                onChange={set("city")}
                placeholder="Divinópolis"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Estado (UF) <span className="text-destructive">*</span></Label>
              <Select
                value={form.state ?? "MG"}
                onValueChange={(v) => { setForm((f) => ({ ...f, state: v })); setErrorMsg(null); }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="MG" />
                </SelectTrigger>
                <SelectContent>
                  {BR_STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        {/* ── Aba 2: Agendamento ── */}
        <TabsContent value="agendamento" className="space-y-4">
          <DateTimePicker
            label="Retorno agendado (opcional)"
            value={form.callback_at}
            onChange={(iso) => setForm((f) => ({ ...f, callback_at: iso }))}
          />

          <div className="rounded-lg bg-muted/40 p-3 border border-border text-xs text-muted-foreground">
            Novo lead tem prioridade imediata. O retorno é opcional e não substitui o primeiro contato.
          </div>
        </TabsContent>
      </Tabs>

      <Button type="submit" className="mt-4 w-full" disabled={loading}>
        {loading ? "Cadastrando Lead..." : "Cadastrar Lead"}
      </Button>
    </form>
  );
}
