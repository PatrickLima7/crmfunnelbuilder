import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { generateLead, insightFor, STEPS, type Lead, type StepKey } from "./crm-data";
import { type CallOutcome } from "./call-script";
import { supabase } from "./supabase";

// ─── Supabase presence helper ────────────────────────────────────────────────
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
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("operator_id", operatorId);
}

export interface ProgressPoint {
  label: string;
  contatos: number;
  meta: number;
}

const DAILY_GOAL = 80;
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
  lead: Lead & { realId?: string; callback_at?: string | null };
  loadingLead: boolean;
  stepIndex: number;
  stepDone: boolean[];
  stepSeconds: number;
  nextLeadIn: number;
  alerts: string[];
  pause: { reason: string; startedAt: number; eventId?: string } | null;
  startPause: (reason: string) => Promise<void>;
  endPause: () => Promise<void>;
  answered: () => void;
  notAnswered: () => Promise<void>;
  nextLead: () => void;
  selectLead: (targetLead: { id?: string; name: string; phone?: string | null; profession?: string; status?: string; temperature?: string }) => void;
  registerLead: (name: string, phone: string) => void;
  goalReached: boolean;
  // Ligação em andamento
  callOpen: boolean;
  callSeconds: number;
  finishCall: (outcome: CallOutcome, customCallbackDays?: number) => Promise<void>;
}

const CrmContext = createContext<CrmValue | null>(null);

export function CrmProvider({ children, operatorId }: { children: ReactNode; operatorId: string }) {
  const [contacts, setContacts] = useState(42);
  const [conversions, setConversions] = useState(6);
  const [conversations, setConversations] = useState(19);
  const [negotiations, setNegotiations] = useState(8);
  const [lead, setLead] = useState<Lead & { realId?: string; callback_at?: string | null }>(() => generateLead());
  const [loadingLead, setLoadingLead] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepDone, setStepDone] = useState([false]); // Apenas 1 etapa: Ligação
  const [stepStart, setStepStart] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [pause, setPause] = useState<{ reason: string; startedAt: number; eventId?: string } | null>(null);
  const [alerts, setAlerts] = useState<string[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const talkSecondsRef = useRef(0);
  const pauseSecondsRef = useRef(0);

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

  const [callOpen, setCallOpen] = useState(false);
  const [callStart, setCallStart] = useState<number | null>(null);
  const [history, setHistory] = useState<ProgressPoint[]>(() =>
    Array.from({ length: 6 }, (_, i) => ({
      label: `${8 + i}h`,
      contatos: Math.round(((i + 1) / 6) * 42),
      meta: Math.round(((i + 1) / 9) * DAILY_GOAL),
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

  // Keep refs in sync so async handlers have fresh values
  useEffect(() => { talkSecondsRef.current = callSeconds; }, [callSeconds]);
  useEffect(() => {
    if (pause) pauseSecondsRef.current = Math.floor((Date.now() - pause.startedAt) / 1000);
  }, [now, pause]);

  const allDone = stepDone.every(Boolean);
  const workedHours = Math.max(0.5, (now - shiftStart.current) / 3600000);
  const pace = Math.round((contacts / workedHours) * 10) / 10;
  const progress = Math.min(1, contacts / DAILY_GOAL);
  const insight = insightFor(progress);
  const nextLeadIn = allDone ? Math.max(0, 5 - Math.floor((now - (completedAt.current ?? now)) / 1000)) : 180;

  const pushAlert = (key: string, message: string) => {
    if (firedAlerts.current[key]) return;
    firedAlerts.current[key] = true;
    setAlerts((a) => [...new Set([...a, message])]);
    beep();
    toast.warning(message, { duration: 6000 });
  };

  // Monitoramento de alertas
  useEffect(() => {
    if (pause) return;
    if (stepSeconds > STEP_ALERT_SECONDS) {
      pushAlert(`step-${lead.id}-${stepIndex}`, `Você está há mais de 5 min na ligação.`);
    }
    if (allDone && completedAt.current && (now - completedAt.current) / 1000 > IDLE_ALERT_SECONDS) {
      pushAlert(`idle-${lead.id}`, "Ligação concluída — avance para o próximo lead.");
    }
    const expected = Math.round(workedHours * (DAILY_GOAL / 8));
    if (contacts < expected - 2) {
      pushAlert(`pace-${Math.floor(workedHours)}`, `Ritmo abaixo da meta: esperado ${expected} contatos, você tem ${contacts}.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepSeconds, allDone, contacts, pause]);

  // Alerta discreto de ligação longa
  useEffect(() => {
    if (callOpen && callSeconds > LONG_CALL_SECONDS) {
      if (!firedAlerts.current[`call-${lead.id}`]) {
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
    goal: DAILY_GOAL,
    contacts,
    conversions,
    conversations,
    negotiations,
    pace,
    insight,
    progress,
    history,
    lead,
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
      setPause({ reason, startedAt: nowTime, eventId: data?.id });
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
    answered: () => {
      setConversations((c) => c + 1);
      setNegotiations((n) => n + 1);
      setCallStart(Date.now());
      setCallOpen(true);
      void pushPresence(operatorId, { state: "ligacao", current_lead: lead.name });
    },
    finishCall: async (outcome, customCallbackDays) => {
      const ended = new Date().toISOString();
      setCallOpen(false);
      setCallStart(null);
      advance("call");
      const newContacts = contacts + 1;
      let newConversions = conversions;

      // Calculate callback date if outcome requires return or customCallbackDays specified
      let callbackDays = customCallbackDays;
      if (callbackDays === undefined) {
        if (outcome === "pensar") callbackDays = 3; // Default 3 days for "vai pensar"
        else if (outcome === "revisao") callbackDays = 1;
      }

      let callbackDateIso: string | null = null;
      if (callbackDays && callbackDays > 0) {
        const d = new Date();
        d.setDate(d.getDate() + callbackDays);
        callbackDateIso = d.toISOString();
      }

      if (outcome === "interessado") {
        setConversions((c) => { newConversions = c + 1; return c + 1; });
        toast.success("Cliente interessado!");
      } else if (outcome === "pensar") {
        toast.info(`Retorno agendado para daqui a ${callbackDays ?? 3} dias.`);
      } else if (outcome === "nao") {
        toast("Lead classificado como inativo.");
      } else {
        toast.warning("Contato marcado para revisão.");
      }

      // If lead has a real DB ID, update lead status & callback_at
      if (lead.realId) {
        const newStatus = outcome === "interessado" ? "converted" : outcome === "nao" ? "inactive" : "contacted";
        await supabase
          .from("leads")
          .update({
            status: newStatus,
            callback_at: callbackDateIso,
            updated_at: ended,
          })
          .eq("id", lead.realId);
      }

      await supabase.from("contact_events").insert({
        operator_id: operatorId,
        session_id: sessionIdRef.current,
        lead_name: lead.name,
        lead_phone: lead.phone,
        contact_type: "call",
        outcome: outcome as string,
        started_at: callStart ? new Date(callStart).toISOString() : new Date().toISOString(),
        ended_at: ended,
      });

      await pushPresence(operatorId, {
        state: "ocioso",
        contacts_today: newContacts,
        conversions_today: newConversions,
        talk_seconds: talkSecondsRef.current,
      });
    },
    notAnswered: async () => {
      // Auto schedule return for tomorrow when lead doesn't answer
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const callbackDateIso = tomorrow.toISOString();

      toast("Sem atendimento. Retorno agendado para amanhã!");
      advance("call");

      if (lead.realId) {
        await supabase
          .from("leads")
          .update({
            status: "contacted",
            callback_at: callbackDateIso,
            updated_at: new Date().toISOString(),
          })
          .eq("id", lead.realId);
      }

      await supabase.from("contact_events").insert({
        operator_id: operatorId,
        session_id: sessionIdRef.current,
        lead_name: lead.name,
        lead_phone: lead.phone,
        contact_type: "call",
        outcome: "sem_resposta",
        started_at: new Date().toISOString(),
      });
      await pushPresence(operatorId, { state: "ocioso", contacts_today: contacts + 1 });
    },
    selectLead: (target) => {
      setLoadingLead(true);
      window.setTimeout(() => {
        setLead({
          id: target.id ? `lead-${target.id}` : `lead-${Date.now()}`,
          realId: target.id,
          name: target.name,
          phone: target.phone ?? "(11) 99999-9999",
          profession: target.profession ?? "Cliente cadastrado",
          isNew: false,
          status: (target.temperature ?? target.status ?? "morno") as import("./crm-data").LeadStatus,
          returnTime: "10:00",
        });
        setStepIndex(0);
        setStepDone([false]);
        setStepStart(Date.now());
        completedAt.current = null;
        setAlerts([]);
        setLoadingLead(false);
        toast.success(`Atendendo cliente: ${target.name}`);
      }, 300);
    },
    nextLead: () => {
      setLoadingLead(true);
      window.setTimeout(() => {
        const newCount = contacts + 1;
        setContacts(newCount);
        if (Math.random() > 0.75) setConversions((c) => c + 1);
        setHistory((h) => [
          ...h.slice(-8),
          { label: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), contatos: newCount, meta: DAILY_GOAL },
        ]);
        const fresh = generateLead();
        setLead(fresh);
        setStepIndex(0);
        setStepDone([false]);
        setStepStart(Date.now());
        completedAt.current = null;
        setAlerts([]);
        setLoadingLead(false);
      }, 700);
    },
    registerLead: (name, phone) => {
      toast.success(`Lead ${name} (${phone}) cadastrado na fila.`);
    },
  };

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export function useCrm() {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error("useCrm deve ser usado dentro de CrmProvider");
  return ctx;
}

export function useMemoInsight(progress: number) {
  return useMemo(() => insightFor(progress), [progress]);
}
