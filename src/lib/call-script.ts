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
    label: "✅ Convertido",
    hint: "Cliente fechou negócio",
    temperature: "quente" as const,
  },
  {
    key: "agendado",
    label: "📅 Agendado",
    hint: "Visita ou reunião agendada",
    temperature: "quente" as const,
  },
  {
    key: "interessado",
    label: "🎯 Interessado",
    hint: "Demonstrou interesse real",
    temperature: "quente" as const,
  },
  {
    key: "retorno",
    label: "🔄 Agendar retorno",
    hint: "Escolha data e hora para retornar",
    temperature: "morno" as const,
  },
  {
    key: "pensar",
    label: "🤔 Vai pensar",
    hint: "Precisa de tempo para decidir",
    temperature: "morno" as const,
  },
  {
    key: "em_nutricao",
    label: "🌱 Em nutrição",
    hint: "Lead entrou em fluxo de automação",
    temperature: "morno" as const,
  },
  {
    key: "sem_interesse",
    label: "❌ Sem interesse",
    hint: "Motivo obrigatório",
    temperature: "frio" as const,
  },
  {
    key: "numero_invalido",
    label: "⚠️ Número inválido",
    hint: "Telefone incorreto ou inexistente",
    temperature: "frio" as const,
  },
  {
    key: "sem_resposta",
    label: "📵 Não atendeu",
    hint: "Retorno automático amanhã",
    temperature: "frio" as const,
  },
] as const;

export type CallOutcome = (typeof CALL_OUTCOMES)[number]["key"];

// Temperature mapping for each outcome
export const OUTCOME_TEMPERATURE: Record<CallOutcome, "quente" | "morno" | "frio"> = {
  convertido:      "quente",
  agendado:        "quente",
  interessado:     "quente",
  retorno:         "morno",
  pensar:          "morno",
  em_nutricao:     "morno",
  sem_interesse:   "frio",
  numero_invalido: "frio",
  sem_resposta:    "frio",
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
