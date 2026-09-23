import { useState } from "react";
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
import { useCrm } from "@/lib/crm-store";
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
export function OpportunitiesPanel({ operatorId }: { operatorId: string }) {
  const crm = useCrm();
  const { data: leads = [], isLoading } = useLeads(operatorId);
  const createLead = useCreateLead(operatorId);
  const updateLead = useUpdateLead(operatorId);

  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"novo" | "callbacks" | "quente" | "morno" | "frio" | "nutricao" | "all">("all");
  const [openForm, setOpenForm] = useState(false);
  const [openImport, setOpenImport] = useState(false);

  const nowIso = new Date().toISOString();
  const callbacksDue = leads.filter((l) => l.callback_at && l.callback_at <= nowIso);
  const allCallbacks = leads.filter((l) => !!l.callback_at);

  const searchedLeads = leads.filter((l) => {
    return (
      !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.phone ?? "").includes(search) ||
      (l.company ?? "").toLowerCase().includes(search.toLowerCase())
    );
  });

  const novosSection = searchedLeads.filter(
    (l) => l.status === "novo" || l.status === "pending"
  );

  const retornosSection = searchedLeads
    .filter((l) => !!l.callback_at && l.status !== "novo" && l.status !== "pending")
    .sort((a, b) => new Date(a.callback_at!).getTime() - new Date(b.callback_at!).getTime());

  const quentesSection = searchedLeads.filter(
    (l) => !l.callback_at && l.temperature === "quente" && l.status !== "novo" && l.status !== "pending" && l.status !== "em_nutricao"
  );

  const mornosSection = searchedLeads.filter(
    (l) => !l.callback_at && l.temperature === "morno" && l.status !== "novo" && l.status !== "pending" && l.status !== "em_nutricao"
  );

  const friosSection = searchedLeads.filter(
    (l) => !l.callback_at && (l.temperature === "frio" || !l.temperature) && l.status !== "novo" && l.status !== "pending" && l.status !== "em_nutricao"
  );

  const nutricaoSection = searchedLeads.filter((l) => l.status === "em_nutricao");

  const singleTabList =
    filterTab === "novo"
      ? novosSection
      : filterTab === "callbacks"
        ? retornosSection
        : filterTab === "quente"
          ? quentesSection
          : filterTab === "morno"
            ? mornosSection
            : filterTab === "frio"
              ? friosSection
              : filterTab === "nutricao"
                ? nutricaoSection
                : [];

  const totalAllSections =
    novosSection.length + retornosSection.length + quentesSection.length + mornosSection.length + friosSection.length + nutricaoSection.length;

  const novoCount = leads.filter((l) => l.status === "novo" || l.status === "pending").length;
  const quenteCount = leads.filter((l) => l.temperature === "quente" && l.status !== "novo" && l.status !== "pending").length;
  const mornoCount  = leads.filter((l) => l.temperature === "morno" && l.status !== "novo" && l.status !== "pending").length;
  const frioCount   = leads.filter((l) => l.temperature === "frio" && l.status !== "novo" && l.status !== "pending").length;

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

      {/* Filter Pills — Sequência Fixa: Novo Lead -> Retornos -> Quente -> Morno -> Frio -> Em Nutrição -> Todos */}
      <div className="flex shrink-0 flex-wrap gap-1.5">
        {(["novo", "callbacks", "quente", "morno", "frio", "nutricao", "all"] as const).map((t) => {
          const count =
            t === "novo" ? novoCount :
            t === "callbacks" ? allCallbacks.length :
            t === "quente" ? quenteCount :
            t === "morno" ? mornoCount :
            t === "frio" ? frioCount :
            t === "nutricao" ? leads.filter(l => l.status === "em_nutricao").length :
            leads.length;

          const label =
            t === "novo" ? "Novo Lead" :
            t === "callbacks" ? "Retornos" :
            t === "nutricao" ? "Em Nutrição" :
            t === "all" ? "Todos" :
            TEMP_CONFIG[t as Temperature].label;

          const Icon =
            t === "novo" ? Sparkles :
            t === "callbacks" ? Calendar :
            t === "nutricao" ? Sprout :
            t === "all" ? Layers :
            TEMP_CONFIG[t as Temperature].icon;

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
      <div className="min-h-0 flex-1 overflow-y-auto space-y-4 pr-1">
        {isLoading && (
          <div className="flex h-20 items-center justify-center">
            <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!isLoading && filterTab === "all" && totalAllSections === 0 && (
          <div className="flex h-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border">
            <Layers className="size-6 text-muted-foreground" />
            <p className="text-xs text-muted-foreground text-center px-4">
              {leads.length === 0
                ? 'Nenhum lead cadastrado ainda. Clique em "Novo lead" para cadastrar.'
                : "Nenhum lead corresponde à busca."}
            </p>
          </div>
        )}

        {!isLoading && filterTab !== "all" && singleTabList.length === 0 && (
          <div className="flex h-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border">
            <Layers className="size-6 text-muted-foreground" />
            <p className="text-xs text-muted-foreground text-center px-4">
              Nenhum lead nesta categoria.
            </p>
          </div>
        )}

        {/* ── Aba "Todos": Ordem Fixa de Prioridade (1. Novo Lead -> 2. Retornos -> 3. Quentes -> 4. Mornos -> 5. Frios -> 6. Em Nutrição) ── */}
        {!isLoading && filterTab === "all" && (
          <>
            {/* 1. Novo Lead */}
            {novosSection.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-1 font-bold text-[11px] text-primary uppercase tracking-wide">
                  <Sparkles className="size-3.5" />
                  <span>Novos Leads ({novosSection.length})</span>
                </div>
                <div className="space-y-2">
                  {novosSection.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      isSelected={crm.lead.realId === lead.id}
                      onSelect={() => crm.selectLead(lead as any)}
                      onUpdate={(updates) => updateLead.mutate({ id: lead.id, updates })}
                      operatorId={operatorId}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 2. Retornos */}
            {retornosSection.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-1 font-bold text-[11px] text-warning uppercase tracking-wide">
                  <Calendar className="size-3.5" />
                  <span>Retornos Agendados ({retornosSection.length})</span>
                </div>
                <div className="space-y-2">
                  {retornosSection.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      isSelected={crm.lead.realId === lead.id}
                      onSelect={() => crm.selectLead(lead as any)}
                      onUpdate={(updates) => updateLead.mutate({ id: lead.id, updates })}
                      operatorId={operatorId}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 3. Quentes */}
            {quentesSection.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-1 font-bold text-[11px] text-hot uppercase tracking-wide">
                  <Flame className="size-3.5" />
                  <span>Quentes ({quentesSection.length})</span>
                </div>
                <div className="space-y-2">
                  {quentesSection.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      isSelected={crm.lead.realId === lead.id}
                      onSelect={() => crm.selectLead(lead as any)}
                      onUpdate={(updates) => updateLead.mutate({ id: lead.id, updates })}
                      operatorId={operatorId}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 4. Mornos */}
            {mornosSection.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-1 font-bold text-[11px] text-warm uppercase tracking-wide">
                  <Thermometer className="size-3.5" />
                  <span>Mornos ({mornosSection.length})</span>
                </div>
                <div className="space-y-2">
                  {mornosSection.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      isSelected={crm.lead.realId === lead.id}
                      onSelect={() => crm.selectLead(lead as any)}
                      onUpdate={(updates) => updateLead.mutate({ id: lead.id, updates })}
                      operatorId={operatorId}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 5. Frios */}
            {friosSection.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-1 font-bold text-[11px] text-muted-foreground uppercase tracking-wide">
                  <Snowflake className="size-3.5" />
                  <span>Frios ({friosSection.length})</span>
                </div>
                <div className="space-y-2">
                  {friosSection.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      isSelected={crm.lead.realId === lead.id}
                      onSelect={() => crm.selectLead(lead as any)}
                      onUpdate={(updates) => updateLead.mutate({ id: lead.id, updates })}
                      operatorId={operatorId}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 6. Em Nutrição */}
            {nutricaoSection.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-1 font-bold text-[11px] text-purple-500 uppercase tracking-wide">
                  <Sprout className="size-3.5" />
                  <span>Em Nutrição ({nutricaoSection.length})</span>
                </div>
                <div className="space-y-2">
                  {nutricaoSection.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      isSelected={crm.lead.realId === lead.id}
                      onSelect={() => crm.selectLead(lead as any)}
                      onUpdate={(updates) => updateLead.mutate({ id: lead.id, updates })}
                      operatorId={operatorId}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Abas de filtro individual (Retornos, Quente, Morno, Frio, Em Nutrição) ── */}
        {!isLoading && filterTab !== "all" && (
          <div className="space-y-2">
            {singleTabList.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                isSelected={crm.lead.realId === lead.id}
                onSelect={() => crm.selectLead(lead as any)}
                onUpdate={(updates) => updateLead.mutate({ id: lead.id, updates })}
                operatorId={operatorId}
              />
            ))}
          </div>
        )}
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

      {/* Standardized Scheduler */}
      {showScheduler && (
        <div className="mt-2 space-y-2 rounded-lg border border-border bg-background p-2.5">
          <DateTimePicker
            label="Reagendar retorno exato:"
            value={lead.callback_at}
            onChange={(iso) => {
              onUpdate({ callback_at: iso });
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
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    return {
      name: "",
      phone: "",
      midia: "",
      curso: DEFAULT_CURSO_NAME,
      temperature: "morno",
      city: "Divinópolis",
      state: "MG",
      origin: "manual",
      callback_at: tomorrow.toISOString(),
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
    if (!form.callback_at) { setErrorMsg("Selecione a Data e Hora de contato."); return; }

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
            label="Data e hora de primeiro contato *"
            value={form.callback_at}
            onChange={(iso) => setForm((f) => ({ ...f, callback_at: iso }))}
            required
          />

          <div className="rounded-lg bg-muted/40 p-3 border border-border text-xs text-muted-foreground">
            💡 O consultor pode agendar livremente para qualquer data e horário futuro.
          </div>
        </TabsContent>
      </Tabs>

      <Button type="submit" className="mt-4 w-full" disabled={loading}>
        {loading ? "Cadastrando Lead..." : "Cadastrar Lead"}
      </Button>
    </form>
  );
}
