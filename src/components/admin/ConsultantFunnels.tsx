import { suggestCallback, validCallback } from "@/lib/callback-scheduling";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Lead, Profile } from "@/lib/supabase-types";
import type { OperatorLiveData } from "@/hooks/useOperators";
import { useUpdateLead } from "@/hooks/useLeads";
import { matchesLeadFilter } from "@/lib/lead-categories";
import { OpportunitiesPanel } from "@/components/crm/OpportunitiesPanel";
import { DateTimePicker } from "@/components/crm/DateTimePicker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function ConsultantFunnels({ operators }: { operators: OperatorLiveData[] }) {
  const qc = useQueryClient();
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const team = useQuery({
    queryKey: ["profiles", "operators"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    }, refetchInterval: 10000,
  });
  const portfolio = useQuery({
    queryKey: ["admin-leads", "supervision"],
    queryFn: async () => {
      const rows: Lead[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from("leads").select("*")
          .order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < 500) return rows;
      }
    }, refetchInterval: 5000,
  });
  useEffect(() => {
    const channel = supabase.channel("admin-funnel-leads").on("postgres_changes",
      { event: "*", schema: "public", table: "leads" }, () => {
        void qc.invalidateQueries({ queryKey: ["admin-leads", "supervision"] });
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [qc]);
  const profiles = team.data ?? [];
  const consultants = profiles.filter((profile) => profile.role === "operator");
  const all = portfolio.data ?? [];
  const selected = profiles.find((profile) => profile.id === operatorId);
  const leads = all.filter((lead) => lead.assigned_to === operatorId);
  const current = leads.find((lead) => lead.id === leadId);
  const presence = operators.find((op) => op.operator_id === operatorId);
  if (team.isLoading || portfolio.isLoading) return <p>Carregando funis…</p>;
  if (team.isError || portfolio.isError) return <p role="alert" className="text-destructive">Não foi possível carregar os funis. Verifique sua conexão.</p>;
  return <section className="space-y-3">
    <div className="flex flex-wrap gap-2" aria-label="Selecionar consultor">
      <Button variant={operatorId === null ? "default" : "outline"} onClick={() => { setOperatorId(null); setLeadId(null); }}>Todos ({all.length})</Button>
      {consultants.map((profile) => <Button key={profile.id} variant={operatorId === profile.id ? "default" : "outline"}
        onClick={() => { setOperatorId(profile.id); setLeadId(null); }}>
        {profile.name} ({all.filter((lead) => lead.assigned_to === profile.id).length}){!profile.active ? " · inativo" : ""}
      </Button>)}
    </div>
    {!selected ? <div className="rounded-xl border bg-panel p-4">
      <h3 className="font-bold">Todas as carteiras</h3>
      <p className="mb-3 text-xs text-muted-foreground">Selecione um consultor acima para acompanhar seu funil e atuar nos leads.</p>
      <input aria-label="Buscar em todas as carteiras" className="mb-3 w-full rounded border bg-background p-2" placeholder="Buscar lead ou telefone" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="max-h-[65vh] overflow-auto">
        <table className="w-full text-left text-sm"><thead><tr><th>Lead</th><th>Consultor</th><th>Status</th><th>Temperatura</th><th /></tr></thead>
          <tbody>{all.filter((lead) => `${lead.name} ${lead.phone ?? ""}`.toLowerCase().includes(search.toLowerCase())).map((lead) => {
            const owner = profiles.find((profile) => profile.id === lead.assigned_to);
            return <tr key={lead.id} className="border-t"><td className="py-2">{lead.name}<br /><span className="text-xs text-muted-foreground">{lead.phone}</span></td>
              <td>{owner?.name ?? "Sem consultor"}</td><td>{lead.status}</td><td>{lead.status === "novo" ? "Super quente" : lead.temperature}</td>
              <td>{owner && <Button size="sm" variant="outline" onClick={() => { setOperatorId(owner.id); setLeadId(lead.id); }}>Ver funil</Button>}</td></tr>;
          })}</tbody></table>
        {!all.length && <p className="py-4 text-muted-foreground">Nenhum lead cadastrado.</p>}
      </div>
    </div> : <>
      <div className="rounded-lg border bg-primary/5 p-3 text-sm">
        <strong>Supervisão: {selected.name}</strong> · Usuário: {selected.username}
        <p className="text-xs text-muted-foreground">Você continua como administrador. Visualizar este funil não inicia expediente nem registra contatos do consultor.</p>
      </div>
      <div className="grid gap-3 lg:h-[75vh] lg:min-h-[560px] lg:grid-cols-[210px_minmax(0,1fr)_330px]">
        <div className="space-y-2 rounded-xl border bg-sidebar p-3">
          <Metric label="Meta de contatos" value={selected.daily_contacts_goal ?? "Meta global"} />
          <Metric label="Contatos registrados" value={presence?.contacts_today ?? 0} />
          <Metric label="Conversões registradas" value={presence?.conversions_today ?? 0} />
          <Metric label="Total na carteira" value={leads.length} />
          <Metric label="Novos / Super quentes" value={leads.filter((lead) => matchesLeadFilter(lead, "novo")).length} />
          <Metric label="Retornos pendentes" value={leads.filter((lead) => matchesLeadFilter(lead, "callbacks")).length} />
          <Metric label="Retornos futuros" value={leads.filter((lead) => matchesLeadFilter(lead, "future")).length} />
          <Metric label="Convertidos na carteira" value={leads.filter((lead) => matchesLeadFilter(lead, "converted")).length} />
          <p className="text-xs">Atividade: {presence?.state ?? "offline"}</p>
          {presence?.current_lead && <p className="text-xs">Lead em atendimento: {presence.current_lead}</p>}
          {presence?.pause_reason && <p className="text-xs">Pausa: {presence.pause_reason}</p>}
        </div>
        <div className="min-h-0 overflow-auto rounded-xl border bg-panel p-4">
          {current ? <SupervisorLead key={current.id} lead={current} operator={selected} /> : <p className="text-sm text-muted-foreground">Selecione um lead na carteira para ver os detalhes, orientar o consultor ou registrar uma ação.</p>}
        </div>
        <div className="min-h-0 overflow-auto rounded-xl border">
          <OpportunitiesPanel key={selected.id} operatorId={selected.id} leadData={leads} selectedLeadId={current?.id} onSelectLead={(lead) => setLeadId(lead.id)} />
        </div>
      </div>
    </>}
  </section>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg border p-2"><p className="text-[11px] text-muted-foreground">{label}</p><strong>{value}</strong></div>;
}

function SupervisorLead({ lead, operator }: { lead: Lead; operator: Profile }) {
  const qc = useQueryClient();
  const update = useUpdateLead(operator.id);
  const [note, setNote] = useState("");
  const [callbackDraft, setCallbackDraft] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  async function save(updates: Partial<Lead>) {
    try { await update.mutateAsync({ id: lead.id, updates }); toast.success("Lead atualizado na carteira do consultor."); return true; }
    catch { toast.error("Não foi possível salvar. Atualize o funil e tente novamente."); return false; }
  }
  return <div className="space-y-4">
    <h3 className="text-xl font-bold">{lead.name}</h3>
    <p>{lead.phone ?? "Sem telefone"} · {lead.email ?? "Sem e-mail"}</p>
    <p className="text-sm">Curso: {lead.curso ?? "Não informado"} · Origem: {lead.midia ?? lead.origin}</p>
    <p className="whitespace-pre-wrap rounded border p-3 text-sm">{lead.notes || "Sem observações."}</p>
    <label className="block text-sm font-semibold">Orientação do administrador
      <Textarea value={note} maxLength={5000} onChange={(e) => setNote(e.target.value)} placeholder="Registre uma orientação para ajudar no fechamento" />
    </label>
    <Button disabled={savingNote || !note.trim()} onClick={async () => {
      setSavingNote(true);
      try {
        const { error } = await supabase.rpc("admin_append_lead_note", { p_lead_id: lead.id, p_note: note.trim() });
        if (error) throw error;
        setNote(""); toast.success("Orientação registrada.");
        await qc.invalidateQueries({ queryKey: ["admin-leads"] });
        await qc.invalidateQueries({ queryKey: ["leads"] });
      } catch { toast.error("Não foi possível salvar a orientação."); }
      finally { setSavingNote(false); }
    }}>Salvar orientação</Button>
    <div className="flex flex-wrap gap-2">
      {(["quente", "morno", "frio"] as const).map((temperature) => <Button key={temperature} variant="outline" disabled={update.isPending}
        onClick={() => void save({ temperature, ...(lead.status === "novo" ? { status: "contacted" as const } : {}) })}>{temperature}</Button>)}
      <Button variant="success" disabled={update.isPending || lead.status === "converted"} onClick={() => void save({ status: "converted", callback_at: null })}>Marcar convertido</Button>
    </div>
    {callbackDraft === null ? <Button variant="outline" onClick={() => setCallbackDraft(suggestCallback())}>Agendar retorno para o consultor</Button> : <div className="space-y-2">
      <DateTimePicker label="Agendar retorno para o consultor" value={callbackDraft} onChange={setCallbackDraft} required />
      <Button disabled={update.isPending || !validCallback(callbackDraft)} onClick={async () => {
        if (await save({ callback_at: callbackDraft, ...(lead.status === "novo" ? { status: "contacted" as const } : {}) })) setCallbackDraft(null);
      }}>Confirmar retorno</Button>
    </div>}
    <p className="text-xs text-muted-foreground">As alterações ficam na carteira de {operator.name}. Os contadores de atividade do consultor não são incrementados por estas ações.</p>
  </div>;
}
