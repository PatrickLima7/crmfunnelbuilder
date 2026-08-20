import { SCRIPT_STEPS, type ScriptStep } from "./call-script";

export type OperatorState = "ligacao" | "whatsapp" | "ocioso" | "pausa";

export interface OperatorLive {
  id: string;
  name: string;
  state: OperatorState;
  stateSince: number;
  pauseReason?: string;
  currentLead: string;
  contacts: number;
  conversions: number;
  calls: number;
  talkSeconds: number;
  pauseSeconds: number;
}

export interface ActivityEvent {
  id: string;
  at: number;
  operator: string;
  kind: "call" | "whatsapp" | "pause" | "resume" | "conversion" | "alert";
  text: string;
}

export interface AdminGoals {
  dailyContacts: number;
  dailyConversions: number;
  maxPauseMinutes: number;
  maxStepMinutes: number;
  callTargetMinutes: number;
}

export const DEFAULT_GOALS: AdminGoals = {
  dailyContacts: 80,
  dailyConversions: 12,
  maxPauseMinutes: 20,
  maxStepMinutes: 5,
  callTargetMinutes: 6,
};

export const DEFAULT_SCRIPT: ScriptStep[] = SCRIPT_STEPS.map((s) => ({ ...s }));

const NAMES = [
  "Amanda Reis",
  "Bruno Tavares",
  "Carla Menezes",
  "Diego Furtado",
  "Elisa Prado",
  "Fábio Moraes",
  "Gabi Lousada",
  "Henrique Sá",
];

const LEADS = ["Matheus S.", "Felipe A.", "Ana Paula C.", "Carlos N.", "Juliana R.", "Rafael M."];
const PAUSES = ["Almoço", "Café", "Banheiro", "Reunião"];

const rnd = <T,>(l: readonly T[]) => l[Math.floor(Math.random() * l.length)]!;

export function seedOperators(): OperatorLive[] {
  const now = Date.now();
  const states: OperatorState[] = ["ligacao", "whatsapp", "ocioso", "pausa"];
  return NAMES.map((name, i) => {
    const state = states[i % 4]!;
    return {
      id: `op-${i}`,
      name,
      state,
      stateSince: now - Math.floor(Math.random() * 400) * 1000,
      ...(state === "pausa" ? { pauseReason: rnd(PAUSES) } : {}),
      currentLead: rnd(LEADS),
      contacts: 18 + Math.floor(Math.random() * 50),
      conversions: 2 + Math.floor(Math.random() * 11),
      calls: 20 + Math.floor(Math.random() * 60),
      talkSeconds: 1800 + Math.floor(Math.random() * 5400),
      pauseSeconds: Math.floor(Math.random() * 2200),
    };
  });
}

export function tickOperators(list: OperatorLive[]): { operators: OperatorLive[]; events: ActivityEvent[] } {
  const events: ActivityEvent[] = [];
  const now = Date.now();
  const operators = list.map((op) => {
    const next = { ...op };
    if (op.state === "ligacao") next.talkSeconds += 1;
    if (op.state === "pausa") next.pauseSeconds += 1;

    if (Math.random() < 0.035) {
      const wasPause = op.state === "pausa";
      const options: OperatorState[] = wasPause
        ? ["ligacao", "whatsapp", "ocioso"]
        : ["ligacao", "whatsapp", "ocioso", "pausa"];
      const state = rnd(options);
      next.state = state;
      next.stateSince = now;
      delete next.pauseReason;
      if (state === "pausa") {
        next.pauseReason = rnd(PAUSES);
        events.push(evt(op.name, "pause", `iniciou pausa: ${next.pauseReason}`));
      } else if (wasPause) {
        events.push(evt(op.name, "resume", "retornou da pausa"));
      } else if (state === "ligacao") {
        next.currentLead = rnd(LEADS);
        next.calls += 1;
        next.contacts += 1;
        events.push(evt(op.name, "call", `iniciou ligação com ${next.currentLead}`));
        if (Math.random() > 0.75) {
          next.conversions += 1;
          events.push(evt(op.name, "conversion", `converteu ${next.currentLead} 🎉`));
        }
      } else if (state === "whatsapp") {
        events.push(evt(op.name, "whatsapp", `enviou mensagem para ${next.currentLead}`));
      }
    }
    return next;
  });
  return { operators, events };
}

let seq = 0;
export function evt(operator: string, kind: ActivityEvent["kind"], text: string): ActivityEvent {
  seq += 1;
  return { id: `ev-${Date.now()}-${seq}`, at: Date.now(), operator, kind, text };
}

export const STATE_LABEL: Record<OperatorState, string> = {
  ligacao: "Em ligação",
  whatsapp: "No WhatsApp",
  ocioso: "Ocioso",
  pausa: "Em pausa",
};
