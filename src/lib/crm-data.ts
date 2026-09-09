export type LeadStatus = "quente" | "morno" | "frio";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  profession: string;
  isNew: boolean;
  status: LeadStatus;
  returnTime: string;
}

export const PAUSE_REASONS = [
  "Almoço",
  "Café",
  "Banheiro",
  "Reunião",
  "Treinamento",
  "Suporte técnico",
] as const;

export const STEPS = [
  {
    key: "call",
    label: "Ligação telefônica",
    hint: "Apresente-se, confirme o interesse e use o script como guia.",
  },
  {
    key: "whatsapp",
    label: "Mensagem WhatsApp",
    hint: "Envie mensagem de acompanhamento via WhatsApp.",
  },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];

const FIRST = [
  "Matheus",
  "Felipe",
  "Ana Paula",
  "Carlos",
  "Juliana",
  "Rafael",
  "Bianca",
  "Eduardo",
  "Larissa",
  "Thiago",
  "Camila",
  "Rodrigo",
];
const LAST = ["Silva", "Almeida", "Souza", "Costa", "Ferreira", "Nunes", "Ribeiro", "Martins"];
const JOBS = [
  "Enfermagem",
  "Administração",
  "Autônomo",
  "Educação",
  "Logística",
  "TI / Suporte",
  "Comércio",
  "Estética",
];

let seq = 0;
function pick<T>(list: readonly T[]) {
  return list[Math.floor(Math.random() * list.length)]!;
}

export function generateLead(): Lead {
  seq += 1;
  const statuses: LeadStatus[] = ["quente", "quente", "morno", "morno", "frio"];
  return {
    id: `lead-${Date.now()}-${seq}`,
    name: `${pick(FIRST)} ${pick(LAST)}`,
    phone: `(11) 9${Math.floor(1000 + Math.random() * 8999)}-${Math.floor(1000 + Math.random() * 8999)}`,
    profession: pick(JOBS),
    isNew: Math.random() > 0.35,
    status: pick(statuses),
    returnTime: `${String(8 + Math.floor(Math.random() * 11)).padStart(2, "0")}:${pick(["00", "15", "30", "45"])}`,
  };
}

export const PRIORITY_LEADS: { name: string; time: string; status: LeadStatus }[] = [
  { name: "Matheus", time: "10:30", status: "quente" },
  { name: "Felipe", time: "14:30", status: "quente" },
  { name: "Ana Paula", time: "15:00", status: "quente" },
  { name: "Carlos", time: "16:15", status: "morno" },
  { name: "Juliana", time: "17:00", status: "morno" },
  { name: "Rafael", time: "17:45", status: "frio" },
  { name: "Bianca", time: "18:20", status: "frio" },
];

export const QUEUE = {
  total: 3450,
  nutrindo: 2760,
  nutridosHoje: 150,
  reativar: 3262,
};

export function insightFor(progress: number): string {
  if (progress >= 1) return "Meta batida! Cada contato agora é bônus 🚀";
  if (progress >= 0.85) return "Falta pouco para bater a meta!";
  if (progress >= 0.6) return "Você está no caminho certo, mantenha o ritmo!";
  if (progress >= 0.3) return "Bom progresso — constância vence talento.";
  return "Não desista, você consegue! Comece pelos leads quentes.";
}

export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
