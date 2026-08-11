import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { generateLead, insightFor, STEPS, type Lead, type StepKey } from "./crm-data";

const AUTH_KEY = "crm.session";

export interface Session {
  name: string;
  login: string;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session, remember: boolean) {
  if (remember) window.localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  else window.sessionStorage.setItem(AUTH_KEY, JSON.stringify(session));
  window.localStorage.setItem("crm.current", JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(AUTH_KEY);
  window.localStorage.removeItem("crm.current");
  window.sessionStorage.removeItem(AUTH_KEY);
}

export function readCurrent(): Session | null {
  if (typeof window === "undefined") return null;
  const raw =
    window.localStorage.getItem("crm.current") ?? window.sessionStorage.getItem(AUTH_KEY);
  try {
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export interface ProgressPoint {
  label: string;
  contatos: number;
  meta: number;
}

const DAILY_GOAL = 80;
const STEP_ALERT_SECONDS = 300;
const IDLE_ALERT_SECONDS = 120;

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
  lead: Lead;
  loadingLead: boolean;
  stepIndex: number;
  stepDone: boolean[];
  stepSeconds: number;
  nextLeadIn: number;
  alerts: string[];
  pause: { reason: string; startedAt: number } | null;
  startPause: (reason: string) => void;
  endPause: () => void;
  answered: () => void;
  notAnswered: () => void;
  sendWhatsappCall: () => void;
  sendWhatsappMessage: () => void;
  nextLead: () => void;
  registerLead: (name: string, phone: string) => void;
  goalReached: boolean;
}

const CrmContext = createContext<CrmValue | null>(null);

export function CrmProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts] = useState(42);
  const [conversions, setConversions] = useState(6);
  const [conversations, setConversations] = useState(19);
  const [negotiations, setNegotiations] = useState(8);
  const [lead, setLead] = useState<Lead>(() => generateLead());
  const [loadingLead, setLoadingLead] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepDone, setStepDone] = useState([false, false, false]);
  const [stepStart, setStepStart] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [pause, setPause] = useState<{ reason: string; startedAt: number } | null>(null);
  const [alerts, setAlerts] = useState<string[]>([]);
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
      pushAlert(`step-${lead.id}-${stepIndex}`, `Você está há mais de 5 min em "${STEPS[stepIndex]!.label}".`);
    }
    if (allDone && completedAt.current && (now - completedAt.current) / 1000 > IDLE_ALERT_SECONDS) {
      pushAlert(`idle-${lead.id}`, "Etapas concluídas há mais de 2 min — avance para o próximo lead.");
    }
    const expected = Math.round(workedHours * (DAILY_GOAL / 8));
    if (contacts < expected - 2) {
      pushAlert(`pace-${Math.floor(workedHours)}`, `Ritmo abaixo da meta: esperado ${expected} contatos, você tem ${contacts}.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepSeconds, allDone, contacts, pause]);

  useEffect(() => {
    if (progress >= 1 && !goalCelebrated.current) {
      goalCelebrated.current = true;
      toast.success("🎉 Meta diária batida! Excelente trabalho!", { duration: 8000 });
    }
  }, [progress]);

  const advance = (key: StepKey) => {
    const index = STEPS.findIndex((s) => s.key === key);
    setStepDone((d) => d.map((v, i) => (i === index ? true : v)));
    const next = index + 1;
    if (next < STEPS.length) {
      setStepIndex(next);
      setStepStart(Date.now());
    } else {
      completedAt.current = Date.now();
    }
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
    startPause: (reason) => {
      setPause({ reason, startedAt: Date.now() });
      toast.info(`Pausa iniciada: ${reason}`);
    },
    endPause: () => {
      setPause(null);
      setStepStart(Date.now());
      toast.success("Pausa encerrada, bom trabalho!");
    },
    answered: () => {
      setConversations((c) => c + 1);
      setNegotiations((n) => n + 1);
      toast.success("Contato atendido registrado.");
      advance("call");
    },
    notAnswered: () => {
      toast("Sem atendimento — siga para a chamada de WhatsApp.");
      advance("call");
    },
    sendWhatsappCall: () => {
      advance("whatsapp_call");
      toast.success("Chamada de WhatsApp registrada.");
    },
    sendWhatsappMessage: () => {
      advance("whatsapp_msg");
      toast.success("Mensagem enviada — etapas concluídas!");
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
        setLead(generateLead());
        setStepIndex(0);
        setStepDone([false, false, false]);
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
