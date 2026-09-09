export interface ScriptStep {
  key: string;
  title: string;
  checklist: string[];
  speech: string[];
  noteLabel: string;
}

export const SCRIPT_STEPS: ScriptStep[] = [
  {
    key: "apresentacao",
    title: "Apresentação",
    checklist: [
      "Cumprimento inicial",
      "Se identificar pelo nome e empresa",
      "Confirmar se está em horário apropriado",
    ],
    speech: ["[Seu nome], da [Empresa]. Você tem 2 minutos?"],
    noteLabel: "Observações desta etapa",
  },
  {
    key: "descoberta",
    title: "Descoberta",
    checklist: [
      "Confirmar interesse no serviço",
      "Perguntar qual é a necessidade principal",
      "Ouvir atentamente a resposta",
    ],
    speech: ["Qual é seu principal interesse?", "Já conhece nossos serviços?"],
    noteLabel: "O que o cliente disse",
  },
  {
    key: "qualificacao",
    title: "Qualificação",
    checklist: [
      "Verificar disponibilidade do cliente",
      "Conversar sobre orçamento (se aplicável)",
      "Validar se é o tomador de decisão",
    ],
    speech: ["Qual seria um investimento viável para você?"],
    noteLabel: "Informações de orçamento e disponibilidade",
  },
  {
    key: "proposta",
    title: "Proposta",
    checklist: [
      "Apresentar a solução ideal",
      "Explicar benefícios principais",
      "Oferecer opções de próximos passos",
    ],
    speech: ["Posso enviar um link para você agendar?"],
    noteLabel: "Reação do cliente à proposta",
  },
  {
    key: "encerramento",
    title: "Encerramento",
    checklist: [
      "Agradecer a atenção",
      "Confirmar próxima ação e data",
      "Desligar profissionalmente",
    ],
    speech: ["Obrigado! Vou enviar tudo por WhatsApp e confirmamos por lá."],
    noteLabel: "Próximos passos acordados",
  },
];

export const CALL_OUTCOMES = [
  {
    key: "convertido",
    label: "✅ Lead convertido",
    hint: "Cliente fechou negócio — gera registro de conversão",
    temperature: "quente" as const,
  },
  {
    key: "interessado",
    label: "🎯 Lead interessado",
    hint: "Demonstrou interesse real — reagendar como Quente",
    temperature: "quente" as const,
  },
  {
    key: "pensar",
    label: "🤔 Lead indeciso",
    hint: "Precisa de tempo para decidir — reagendar como Morno",
    temperature: "morno" as const,
  },
  {
    key: "retorno",
    label: "🔄 Lead reagendar retorno",
    hint: "Solicita retorno em data específica — reagendar como Morno",
    temperature: "morno" as const,
  },
  {
    key: "desligou",
    label: "📵 Lead desligou",
    hint: "Desligou durante a ligação — reagendar como Frio",
    temperature: "frio" as const,
  },
  {
    key: "sem_interesse",
    label: "❌ Lead sem interesse",
    hint: "Motivo obrigatório — não agenda retorno",
    temperature: "frio" as const,
  },
] as const;

/** Motivos obrigatórios quando outcome = sem_interesse */
export const SEM_INTERESSE_MOTIVOS = [
  "Lead está muito longe",
  "Lead desistiu do curso",
  "Lead disse que mudou de ideia",
  "Lead disse que realmente não quer mais fazer o curso",
  "Unidade não tem o curso que a pessoa quer",
  "Lead disse já ter feito o curso",
] as const;

export type SemInteresseMotivo = (typeof SEM_INTERESSE_MOTIVOS)[number];

export type CallOutcome =
  | (typeof CALL_OUTCOMES)[number]["key"]
  | "sem_resposta"
  | "em_nutricao"
  | "numero_invalido";

// Temperature mapping for each outcome
export const OUTCOME_TEMPERATURE: Record<CallOutcome, "quente" | "morno" | "frio"> = {
  convertido:      "quente",
  interessado:     "quente",
  pensar:          "morno",
  retorno:         "morno",
  desligou:        "frio",
  sem_interesse:   "frio",
  sem_resposta:    "frio",
  em_nutricao:     "morno",
  numero_invalido: "frio",
};

export const QUICK_MESSAGES = [
  { key: "demo",      label: "Agendar demo",       text: "Segue o link para agendar sua demo: agenda.empresa.com/demo 📅" },
  { key: "proposta",  label: "Enviar proposta",     text: "Enviei sua proposta em PDF: empresa.com/proposta.pdf 📄" },
  { key: "presenca",  label: "Confirmar presença",  text: "Consegue confirmar sua presença na reunião? ✅" },
  { key: "retorno",   label: "Agendar retorno",     text: "Posso te ligar amanhã às 10h ou às 15h? ⏰" },
] as const;

export const CLIENT_REPLIES = [
  "Oi! Pode mandar sim 👍",
  "Legal, vou olhar e te falo.",
  "Qual o valor mesmo?",
  "Consegue me ligar mais tarde?",
  "Perfeito, obrigado!",
];

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
