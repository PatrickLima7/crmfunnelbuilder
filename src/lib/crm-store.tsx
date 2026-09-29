import { finishOwnShift } from "./shift-actions";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { generateLead, insightFor, STEPS, type Lead, type LeadStatus, type StepKey } from "./crm-data";
import { type CallOutcome, OUTCOME_TEMPERATURE } from "./call-script";
import { supabase } from "./supabase";
import { LEADS_QUERY_KEY } from "@/hooks/useLeads";

// ─── Supabase presence helper ─────────────────────────────────────────────────
async function pushPresence(
  operatorId: string,
  patch: {
    state?: string;
    pause_reason?: string | null;
    current_lead?: string | null;
    contacts_today?: number;
    conversions_today?: number;
    talk_seconds?: number;
    pause_seconds?: number;
  },
) {
  await supabase
    .from("operator_presence")
    .update({ ...(patch as any), updated_at: new Date().toISOString() })
    .eq("operator_id", operatorId);
}

// ─── Priority Queue Fetcher ───────────────────────────────────────────────────
// Sequence: 1. Novo Lead -> 2. Retornos Agendados -> 3. Quente -> 4. Morno -> 5. Frio -> 6. Em Nutrição
async function fetchNextPriorityLead(operatorId: string) {
  // 1. Novo Lead — explicit intake priority only
  const { data: novos } = await supabase
    .from("leads")
    .select("*")
    .eq("assigned_to", operatorId)
    .eq("status", "novo")
    .order("data_ultimo_cadastro", { ascending: true })
    .limit(1);

  if (novos && novos.length > 0) return novos[0]!;

  // 2. Retornos Agendados (callback_at set)
  const { data: retornos } = await supabase
    .from("leads")
    .select("*")
    .eq("assigned_to", operatorId)
    .or(`callback_at.is.null,callback_at.lte.${new Date().toISOString()}`)
    .not("callback_at", "is", null)
    .in("status", ["contacted", "novo", "pending"])
    .order("callback_at", { ascending: true })
    .limit(1);

  if (retornos && retornos.length > 0) return retornos[0]!;

  // 3. Quente (temperature = 'quente')
  const { data: quentes } = await supabase
    .from("leads")
    .select("*")
    .eq("assigned_to", operatorId)
    .or(`callback_at.is.null,callback_at.lte.${new Date().toISOString()}`)
    .eq("temperature", "quente")
    .in("status", ["contacted", "pending"])
    .order("updated_at", { ascending: true })
    .limit(1);

  if (quentes && quentes.length > 0) return quentes[0]!;

  // 4. Morno (temperature = 'morno')
  const { data: mornos } = await supabase
    .from("leads")
    .select("*")
    .eq("assigned_to", operatorId)
    .or(`callback_at.is.null,callback_at.lte.${new Date().toISOString()}`)
    .eq("temperature", "morno")
    .in("status", ["contacted", "pending"])
    .order("updated_at", { ascending: true })
    .limit(1);

  if (mornos && mornos.length > 0) return mornos[0]!;

  // 5. Frio (temperature = 'frio')
  const { data: frios } = await supabase
    .from("leads")
    .select("*")
    .eq("assigned_to", operatorId)
    .or(`callback_at.is.null,callback_at.lte.${new Date().toISOString()}`)
    .eq("temperature", "frio")
    .in("status", ["contacted", "pending"])
    .order("updated_at", { ascending: true })
    .limit(1);

  if (frios && frios.length > 0) return frios[0]!;

  // 6. Em Nutrição (status = 'em_nutricao')
  const { data: nutricao } = await supabase
    .from("leads")
    .select("*")
    .eq("assigned_to", operatorId)
    .or(`callback_at.is.null,callback_at.lte.${new Date().toISOString()}`)
    .eq("status", "em_nutricao")
    .order("updated_at", { ascending: true })
    .limit(1);

  if (nutricao && nutricao.length > 0) return nutricao[0]!;

  return null;
}

export interface ProgressPoint {
  label: string;
  contatos: number;
  meta: number;
}

const DEFAULT_DAILY_GOAL = 80;
const STEP_ALERT_SECONDS = 300;
const IDLE_ALERT_SECONDS = 120;
const LONG_CALL_SECONDS = 600;

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    /* áudio indisponível */
  }
}

interface CrmValue {
  goal: number;
  contacts: number;
  conversions: number;
  conversations: number;
  negotiations: number;
  pace: number;
  insight: string;
  progress: number;
  history: ProgressPoint[];
  lead: Lead & { 
    realId?: string; 
    callback_at?: string | null;
    email?: string | null;
    company?: string | null;
    cpf?: string | null;
    city?: string | null;
    state?: string | null;
    curso?: string | null;
    origin?: string;
    createdAt?: string;
    midia?: string | null;
    campanha?: string | null;
    notes?: string | null;
    observacao?: string | null;
  };
  loadingLead: boolean;
  stepIndex: number;
  stepDone: boolean[];
  stepSeconds: number;
  nextLeadIn: number;
  alerts: string[];
  pause: { reason: string; startedAt: number; eventId?: string } | null;
  startPause: (reason: string) => Promise<void>;
  endPause: () => Promise<void>;
  answered: (stepIdx: number) => void;
  notAnswered: (stepIdx: number) => Promise<void>;
  whatsappSent: () => Promise<void>;
  completeStep: (stepIndex: number) => void;
  nextLead: () => void;
  selectLead: (targetLead: { id?: string; name: string; phone?: string | null; profession?: string; status?: string; temperature?: string }) => void;
  registerLead: (name: string, phone: string) => void;
  goalReached: boolean;
  callOpen: boolean;
  callSeconds: number;
  finishCall: (outcome: CallOutcome, callbackAt?: string, motivoDesinteresse?: string) => Promise<void>;
  opportunities: number;
  returns: number;
  hotLeads: number;
  monthlyConverted: number;
  shiftActive: boolean;
  shiftStartedAt: string | null;
  shiftDurationSeconds: number;
  startShift: () => Promise<void>;
  finishShift: () => Promise<void>;
  blockingAlert: { message: string; action: string; onResolve: () => void } | null;
  step3ScheduleOpen: boolean;
  finishStep3Schedule: (callbackAtIso: string) => Promise<void>;
  closeStep3Schedule: () => void;
}

const CrmContext = createContext<CrmValue | null>(null);

export function CrmProvider({ children, operatorId }: { children: ReactNode; operatorId: string }) {
  const qc = useQueryClient();
  const [dailyGoal, setDailyGoal] = useState(DEFAULT_DAILY_GOAL);
  const [contacts, setContacts] = useState(0);
  const [conversions, setConversions] = useState(0);
  const [conversations, setConversations] = useState(0);
  const [negotiations, setNegotiations] = useState(0);
  // null = no real lead in queue
  const [lead, setLead] = useState<CrmValue['lead'] | null>(null);
  const [loadingLead, setLoadingLead] = useState(true); // starts loading
  const [stepIndex, setStepIndex] = useState(0);
  const [stepDone, setStepDone] = useState([false, false, false]);
  const [stepStart, setStepStart] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  
  const [opportunities, setOpportunities] = useState(0);
  const [returns, setReturns] = useState(0);
  const [hotLeads, setHotLeads] = useState(0);
  const [monthlyConverted, setMonthlyConverted] = useState(0);
  const [shiftActive, setShiftActive] = useState(false);
  const [shiftStartedAt, setShiftStartedAt] = useState<string | null>(null);
  const [activeExpedienteId, setActiveExpedienteId] = useState<string | null>(null);
  const [pause, setPause] = useState<{ reason: string; startedAt: number; eventId?: string } | null>(null);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [blockingAlertInfo, setBlockingAlertInfo] = useState<{ type: "pause" | "idle" } | null>(null);
  const [step3ScheduleOpen, setStep3ScheduleOpen] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const talkSecondsRef = useRef(0);
  const pauseSecondsRef = useRef(0);
  const activeStepIdxRef = useRef<number>(0); // which step triggered the current call
  const fnsRef = useRef<{ endPause?: () => Promise<void>; nextLead?: () => void }>({});

  // Sync active expediente state
  useEffect(() => {
    async function syncExpediente() {
      const { data } = await supabase
        .from("expediente_logs")
        .select("*")
        .eq("operator_id", operatorId)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const active = data[0]!;
        setShiftActive(true);
        setShiftStartedAt(active.started_at);
        setActiveExpedienteId(active.id);
        setContacts(active.contacts_count ?? 0);
        setConversions(active.conversions_count ?? 0);
      } else {
        setShiftActive(false);
        setShiftStartedAt(null);
        setActiveExpedienteId(null);
      }
    }
    syncExpediente();
  }, [operatorId]); 

  // Load today's session id
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("work_sessions")
      .select("id")
      .eq("operator_id", operatorId)
      .eq("date", today)
      .single()
      .then(({ data }) => { if (data) sessionIdRef.current = data.id; });
  }, [operatorId]);

  // Load initial real lead from Supabase according to Priority Order (Novo Lead -> Retornos -> Quente -> Morno -> Frio -> Em Nutrição)
  useEffect(() => {
    async function loadFirstLead() {
      const target = await fetchNextPriorityLead(operatorId);

      if (target) {
        setLead({
          id: `lead-${target.id}`,
          realId: target.id,
          name: target.name,
          phone: target.phone ?? "",
          profession: target.profession ?? "Cliente cadastrado",
          isNew: target.status === "novo",
          status: (target.temperature ?? "morno") as LeadStatus,
          returnTime: "10:00",
          email: target.email,
          company: target.company,
          cpf: target.cpf,
          city: target.city,
          state: target.state,
          curso: target.curso,
          origin: target.origin,
          createdAt: target.created_at,
          midia: target.midia,
          campanha: target.campanha,
        });
      } else {
        setLead(null);
      }
      setLoadingLead(false);
    }
    loadFirstLead();
  }, [operatorId]);

  // Load operator's individual daily goal (falls back to global goal)
  useEffect(() => {
    async function loadGoal() {
      // 1. Try individual goal on profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("daily_contacts_goal")
        .eq("id", operatorId)
        .single();

      if ((profile as any)?.daily_contacts_goal != null) {
        setDailyGoal((profile as any).daily_contacts_goal);
        return;
      }

      // 2. Fallback to global goals table
      const { data: globalGoal } = await supabase
        .from("goals")
        .select("daily_contacts")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (globalGoal?.daily_contacts) {
        setDailyGoal(globalGoal.daily_contacts);
      }
    }
    loadGoal();
  }, [operatorId]);

  // Load today's counters from presence
  useEffect(() => {
    supabase
      .from("operator_presence")
      .select("contacts_today, conversions_today, talk_seconds, pause_seconds")
      .eq("operator_id", operatorId)
      .single()
      .then(({ data }) => {
        if (data) {
          setContacts(data.contacts_today ?? 0);
          setConversions(data.conversions_today ?? 0);
          talkSecondsRef.current = data.talk_seconds ?? 0;
          pauseSecondsRef.current = data.pause_seconds ?? 0;
        }
      });
  }, [operatorId]);

  useEffect(() => {
    async function loadMetrics() {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
  
      const [opp, ret, hot, conv] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("assigned_to", operatorId).eq("status", "novo"),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("assigned_to", operatorId).not("callback_at", "is", null).lte("callback_at", todayEnd),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("assigned_to", operatorId).eq("temperature", "quente"),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("assigned_to", operatorId).eq("status", "converted").gte("updated_at", monthStart),
      ]);
  
      setOpportunities(opp.count ?? 0);
      setReturns(ret.count ?? 0);
      setHotLeads(hot.count ?? 0);
      setMonthlyConverted(conv.count ?? 0);
    }
    loadMetrics();
  }, [operatorId, contacts]);

  const [callOpen, setCallOpen] = useState(false);
  const [callStart, setCallStart] = useState<number | null>(null);
  const [history, setHistory] = useState<ProgressPoint[]>(() =>
    Array.from({ length: 6 }, (_, i) => ({
      label: `${8 + i}h`,
      contatos: 0,
      meta: Math.round(((i + 1) / 9) * DEFAULT_DAILY_GOAL),
    })),
  );
  const shiftStart = useRef(Date.now() - 4 * 3600 * 1000);
  const completedAt = useRef<number | null>(null);
  const firedAlerts = useRef<Record<string, boolean>>({});
  const goalCelebrated = useRef(false);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const stepSeconds = pause ? 0 : Math.floor((now - stepStart) / 1000);
  const callSeconds = callStart ? Math.floor((now - callStart) / 1000) : 0;

  useEffect(() => { talkSecondsRef.current = callSeconds; }, [callSeconds]);
  useEffect(() => {
    if (pause) pauseSecondsRef.current = Math.floor((Date.now() - pause.startedAt) / 1000);
  }, [now, pause]);

  const allDone = stepDone.every(Boolean);
  const workedHours = Math.max(0.5, (now - shiftStart.current) / 3600000);
  const pace = Math.round((contacts / workedHours) * 10) / 10;
  const progress = Math.min(1, contacts / dailyGoal);
  const insight = insightFor(progress);
  const nextLeadIn = allDone ? Math.max(0, 5 - Math.floor((now - (completedAt.current ?? now)) / 1000)) : 180;

  const pushAlert = (key: string, message: string) => {
    if (firedAlerts.current[key]) return;
    firedAlerts.current[key] = true;
    setAlerts((a) => [...new Set([...a, message])]);
    beep();
    toast.warning(message, { duration: 6000 });
  };

  useEffect(() => {
    if (pause && pauseSecondsRef.current > 7200) { // 2 hours hard limit
      if (!blockingAlertInfo || blockingAlertInfo.type !== "pause") {
        setBlockingAlertInfo({ type: "pause" });
      }
    }

    if (!pause && allDone && completedAt.current && (now - completedAt.current) / 1000 > 600) { // 10 min idle
      if (!blockingAlertInfo || blockingAlertInfo.type !== "idle") {
        setBlockingAlertInfo({ type: "idle" });
      }
    }

    if (pause) return;
    if (!lead) return; // no lead, no alerts
    if (stepSeconds > STEP_ALERT_SECONDS) {
      pushAlert(`step-${lead.id}-${stepIndex}`, `Você está há mais de 5 min na ligação.`);
    }
    if (allDone && completedAt.current && (now - completedAt.current) / 1000 > IDLE_ALERT_SECONDS) {
      pushAlert(`idle-${lead.id}`, "Ligação concluída — avance para o próximo lead.");
    }
    const expected = Math.round(workedHours * (dailyGoal / 8));
    if (contacts < expected - 2) {
      pushAlert(`pace-${Math.floor(workedHours)}`, `Ritmo abaixo da meta: esperado ${expected} contatos, você tem ${contacts}.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepSeconds, allDone, contacts, pause, now]);

  useEffect(() => {
    if (callOpen && callSeconds > LONG_CALL_SECONDS) {
      if (lead && !firedAlerts.current[`call-${lead.id}`]) {
        firedAlerts.current[`call-${lead.id}`] = true;
        toast("Boa ligação! ⏱️", { description: "Já são mais de 10 minutos de conversa." });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callSeconds, callOpen]);

  useEffect(() => {
    if (progress >= 1 && !goalCelebrated.current) {
      goalCelebrated.current = true;
      toast.success("🎉 Meta diária batida! Excelente trabalho!", { duration: 8000 });
    }
  }, [progress]);

  const advance = (key: StepKey) => {
    const index = STEPS.findIndex((s) => s.key === key);
    setStepDone((d) => d.map((v, i) => (i === (index >= 0 ? index : 0) ? true : v)));
    completedAt.current = Date.now();
  };

  const value: CrmValue = {
    goal: dailyGoal,
    contacts,
    conversions,
    conversations,
    negotiations,
    pace,
    insight,
    progress,
    history,
    lead: lead ?? {
      id: "empty",
      name: "Nenhum lead disponível",
      phone: "",
      profession: "",
      isNew: false,
      status: "morno" as LeadStatus,
      returnTime: "",
    },
    loadingLead,
    stepIndex,
    stepDone,
    stepSeconds,
    nextLeadIn,
    alerts,
    pause,
    goalReached: progress >= 1,
    callOpen,
    callSeconds,
    opportunities,
    returns,
    hotLeads,
    monthlyConverted,
    step3ScheduleOpen,
    blockingAlert: blockingAlertInfo ? {
      message: blockingAlertInfo.type === "pause" 
        ? "Sua pausa já ultrapassou 2 horas. Isso é acima do limite máximo permitido."
        : "Você está ocioso há mais de 10 minutos após concluir o atendimento. Avance para o próximo lead.",
      action: blockingAlertInfo.type === "pause" ? "Encerrar pausa agora" : "Avançar para próximo lead",
      onResolve: () => {
        if (blockingAlertInfo.type === "pause") void fnsRef.current.endPause?.();
        else void fnsRef.current.nextLead?.();
        setBlockingAlertInfo(null);
      }
    } : null,

    startPause: async (reason) => {
      const nowTime = Date.now();
      setPause({ reason, startedAt: nowTime });
      toast.info(`Pausa iniciada: ${reason}`);
      const { data } = await supabase.from("pause_events").insert({
        operator_id: operatorId,
        session_id: sessionIdRef.current,
        reason,
        started_at: new Date(nowTime).toISOString(),
      }).select("id").single();
      setPause({ reason, startedAt: nowTime, ...(data?.id ? { eventId: data.id } : {}) });
      await pushPresence(operatorId, { state: "pausa", pause_reason: reason });
    },

    endPause: async () => {
      const ended = new Date().toISOString();
      const eventId = pause?.eventId;
      setPause(null);
      setStepStart(Date.now());
      toast.success("Pausa encerrada, bom trabalho!");
      if (eventId) {
        await supabase.from("pause_events").update({ ended_at: ended }).eq("id", eventId);
      }
      await pushPresence(operatorId, { state: "ocioso", pause_reason: null, pause_seconds: pauseSecondsRef.current });
    },

    completeStep: (stepIndex: number) => {
      setStepDone((d) => d.map((v, i) => (i === stepIndex ? true : v)));
      completedAt.current = Date.now();
    },

    whatsappSent: async () => {
      // step 2 = whatsapp_message (idx 2) — mark all steps done and record event
      setStepDone([true, true, true]);
      completedAt.current = Date.now();
      toast.info("✅ Mensagem WhatsApp enviada! Defina a data e horário do próximo retorno.");

      if (lead) {
        await supabase.from("contact_events").insert({
          operator_id: operatorId,
          session_id: sessionIdRef.current,
          lead_name: lead.name,
          lead_phone: lead.phone,
          contact_type: "whatsapp_message",
          outcome: "sem_resposta",
          started_at: new Date().toISOString(),
        });

        const newContacts = contacts + 1;
        setContacts(newContacts);
        await pushPresence(operatorId, { state: "ocioso", contacts_today: newContacts });
        qc.invalidateQueries({ queryKey: [...LEADS_QUERY_KEY, operatorId] });
      }

      // Open mandatory Step 3 return scheduling modal
      setStep3ScheduleOpen(true);
    },

    finishStep3Schedule: async (callbackAtIso: string) => {
      setStep3ScheduleOpen(false);

      if (lead?.realId) {
        await supabase
          .from("leads")
          .update({
            status: "contacted",
            temperature: "morno",
            callback_at: callbackAtIso,
            updated_at: new Date().toISOString(),
          })
          .eq("id", lead.realId);
      }

      toast.success("✅ Retorno agendado com sucesso! Avançando para o próximo lead...");
      qc.invalidateQueries({ queryKey: [...LEADS_QUERY_KEY, operatorId] });

      setTimeout(() => {
        if (fnsRef.current.nextLead) {
          void fnsRef.current.nextLead();
        }
      }, 500);
    },

    closeStep3Schedule: () => {
      setStep3ScheduleOpen(false);
    },

    // stepIdx = index of the step (0=call_phone, 1=call_whatsapp)
    answered: (stepIdx: number) => {
      activeStepIdxRef.current = stepIdx;
      setConversations((c) => c + 1);
      setNegotiations((n) => n + 1);
      setCallStart(Date.now());
      setCallOpen(true);
      void pushPresence(operatorId, { state: "ligacao", current_lead: lead?.name ?? null });
    },

    // callbackAt = ISO string of chosen datetime; motivoDesinteresse = optional reason for sem_interesse
    finishCall: async (outcome, callbackAt, motivoDesinteresse) => {
      const ended = new Date().toISOString();
      setCallOpen(false);
      setCallStart(null);

      // Lead answered or was classified — mark ALL steps as completed so remaining steps are skipped!
      setStepDone([true, true, true]);
      completedAt.current = Date.now();

      const newContacts = contacts + 1;
      setContacts(newContacts);

      let newConversions = conversions;
      const callbackDateIso: string | null = callbackAt ?? null;

      // Map outcome → temperature and status
      const temperature = OUTCOME_TEMPERATURE[outcome];
      const newStatus =
        outcome === "convertido" ? "converted" :
        outcome === "sem_interesse" ? "blacklisted" :
        ["numero_invalido"].includes(outcome) ? "inactive" :
        "contacted";

      if (!lead) return; // safety guard

      // Toast feedback
      if (outcome === "convertido") {
        newConversions = conversions + 1;
        setConversions(newConversions);
        toast.success("🎉 Cliente convertido! Registro de conversão criado.");
      } else if (outcome === "interessado") {
        toast.success("🎯 Lead interessado! Marcado como Quente e agendado.");
      } else if (outcome === "pensar") {
        toast.info("Lead indeciso — marcado como Morno e agendado.");
      } else if (outcome === "retorno") {
        toast.info("Retorno agendado com sucesso! Lead marcado como Morno.");
      } else if (outcome === "desligou") {
        toast.warning("Lead desligou — marcado como Frio e agendado.");
      } else if (outcome === "sem_resposta") {
        toast.warning("Sem resposta — retorno agendado para amanhã.");
      } else if (outcome === "sem_interesse") {
        toast.warning(`🚫 Lead movido para Blacklist (${motivoDesinteresse ?? "Sem interesse"}). Avançando para o próximo lead...`);
      } else {
        toast.warning("Lead marcado como inválido/frio.");
      }

      // Update lead in DB — temperature + status + callback
      if (lead.realId) {
        await supabase
          .from("leads")
          .update({
            temperature,
            status: newStatus as any,
            callback_at: outcome === "sem_interesse" ? null : callbackDateIso,
            updated_at: ended,
          })
          .eq("id", lead.realId);


      }

      await supabase.from("contact_events").insert({
        operator_id: operatorId,
        session_id: sessionIdRef.current,
        lead_name: lead.name,
        lead_phone: lead.phone,
        contact_type: activeStepIdxRef.current === 1 ? "whatsapp" : "call",
        outcome: outcome as any,
        ...(motivoDesinteresse ? { motivo_desinteresse: motivoDesinteresse } : {}),
        started_at: callStart ? new Date(callStart).toISOString() : new Date().toISOString(),
        ended_at: ended,
      });

      await pushPresence(operatorId, {
        state: "ocioso",
        contacts_today: newContacts,
        conversions_today: newConversions,
        talk_seconds: talkSecondsRef.current,
      });

      // Update history chart
      setHistory((h) => [
        ...h.slice(-8),
        { label: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), contatos: newContacts, meta: dailyGoal },
      ]);

      qc.invalidateQueries({ queryKey: [...LEADS_QUERY_KEY, operatorId] });

      // Automatically advance queue after classification
      setTimeout(() => {
        if (fnsRef.current.nextLead) {
          void fnsRef.current.nextLead();
        }
      }, 500);
    },

    // stepIdx = index of the step (0=call_phone, 1=call_whatsapp)
    notAnswered: async (stepIdx: number) => {
      // Mark current step as completed and advance active focus to next step
      setStepDone((d) => d.map((v, i) => (i === stepIdx ? true : v)));
      completedAt.current = Date.now();

      const label = stepIdx === 0 ? "1ª Ligação (operadora)" : "2ª Ligação (WhatsApp)";
      const nextStepLabel = stepIdx === 0 ? "Etapa 2 (Ligação WhatsApp)" : "Etapa 3 (Mensagem WhatsApp)";
      toast.info(`Não atendeu na ${label} — avançando para ${nextStepLabel}.`);

      if (lead?.realId) {
        await supabase
          .from("leads")
          .update({
            temperature: "frio",
            status: "contacted",
            updated_at: new Date().toISOString(),
          })
          .eq("id", lead.realId);
      }

      await supabase.from("contact_events").insert({
        operator_id: operatorId,
        session_id: sessionIdRef.current,
        lead_name: lead?.name ?? "",
        lead_phone: lead?.phone ?? "",
        contact_type: stepIdx === 1 ? "whatsapp" : "call",
        outcome: "sem_resposta",
        started_at: new Date().toISOString(),
      });

      const newContacts = contacts + 1;
      setContacts(newContacts);
      await pushPresence(operatorId, { state: "ocioso", contacts_today: newContacts });
      qc.invalidateQueries({ queryKey: [...LEADS_QUERY_KEY, operatorId] });
    },

    selectLead: (target) => {
      setLoadingLead(true);
      window.setTimeout(() => {
        setLead({
          id: target.id ? `lead-${target.id}` : `lead-${Date.now()}`,
          ...(target.id ? { realId: target.id } : {}),
          name: target.name,
          phone: target.phone ?? "(11) 99999-9999",
          profession: target.profession ?? "Cliente cadastrado",
          isNew: target.status === "novo",
          status: (target.temperature ?? target.status ?? "morno") as import("./crm-data").LeadStatus,
          returnTime: "10:00",
          email: (target as any).email,
          company: (target as any).company,
          cpf: (target as any).cpf,
          city: (target as any).city,
          state: (target as any).state,
          curso: (target as any).curso,
          origin: (target as any).origin,
          createdAt: (target as any).created_at,
          midia: (target as any).midia,
          campanha: (target as any).campanha,
        });
        setStepIndex(0);
        setStepDone([false, false, false]);
        setStepStart(Date.now());
        completedAt.current = null;
        setAlerts([]);
        setLoadingLead(false);
        toast.success(`Atendendo: ${target.name}`);
      }, 300);
    },

    nextLead: async () => {
      if (!stepDone.every(Boolean)) {
        toast.warning("Complete todas as etapas antes de avançar.");
        return;
      }
      setLoadingLead(true);
      const target = await fetchNextPriorityLead(operatorId);

      if (target) {
        setLead({
          id: `lead-${target.id}`,
          realId: target.id,
          name: target.name,
          phone: target.phone ?? "",
          profession: target.profession ?? "Cliente cadastrado",
          isNew: target.status === "novo",
          status: (target.temperature ?? "morno") as LeadStatus,
          returnTime: "10:00",
          email: target.email,
          company: target.company,
          cpf: target.cpf,
          city: target.city,
          state: target.state,
          curso: target.curso,
          origin: target.origin,
          createdAt: target.created_at,
          midia: target.midia,
          campanha: target.campanha,
        });
      } else {
        setLead(null); // empty queue
      }
      setStepIndex(0);
      setStepDone([false, false, false]);
      setStepStart(Date.now());
      completedAt.current = null;
      setAlerts([]);
      setLoadingLead(false);
    },

    registerLead: (name, phone) => {
      toast.success(`Lead ${name} (${phone}) cadastrado na fila.`);
    },

    shiftActive,
    shiftStartedAt,
    shiftDurationSeconds: shiftStartedAt ? Math.max(0, Math.floor((now - new Date(shiftStartedAt).getTime()) / 1000)) : 0,

    startShift: async () => {
      const nowIso = new Date().toISOString();
      const { data: session, error: sessionError } = await supabase.from("work_sessions")
        .upsert({ operator_id: operatorId, date: nowIso.slice(0, 10), ended_at: null }, { onConflict: "operator_id,date" })
        .select("id").single();
      if (sessionError) { toast.error("Não foi possível iniciar o expediente."); return; }
      sessionIdRef.current = session.id;
      await supabase.from("expediente_logs").update({ ended_at: nowIso }).eq("operator_id", operatorId).is("ended_at", null);

      const { data: newLog } = await supabase.from("expediente_logs").insert({
        operator_id: operatorId,
        started_at: nowIso,
        contacts_count: 0,
        conversions_count: 0,
        talk_seconds: 0,
        pause_seconds: 0,
      }).select().single();

      if (newLog) setActiveExpedienteId(newLog.id);
      setShiftActive(true);
      setShiftStartedAt(nowIso);
      setContacts(0);
      setConversions(0);

      await pushPresence(operatorId, { state: "ocioso", contacts_today: 0, conversions_today: 0 });
      toast.success("Expediente iniciado! Boas vendas!");
    },

    finishShift: async () => {
      await finishOwnShift({ contacts_count: contacts, conversions_count: conversions, talk_seconds: talkSecondsRef.current });
      setShiftActive(false);
      setShiftStartedAt(null);
      setActiveExpedienteId(null);
      setPause(null);
      setCallOpen(false);
      setCallStart(null);
      toast.success("Expediente finalizado com sucesso!");
    },
  };

  fnsRef.current.endPause = value.endPause;
  fnsRef.current.nextLead = value.nextLead;

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export function useOptionalCrm() { return useContext(CrmContext); }

export function useCrm() {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error("useCrm deve ser usado dentro de CrmProvider");
  return ctx;
}

export function useMemoInsight(progress: number) {
  return useMemo(() => insightFor(progress), [progress]);
}
