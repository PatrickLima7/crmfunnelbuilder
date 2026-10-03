export type InsightMessage = { category: "motivacional" | "tecnica" | "operacao"; text: string };
export const INSIGHT_INTERVAL_MS = 15 * 60 * 1000;
export const DEFAULT_INSIGHTS: InsightMessage[] = [
  { category: "motivacional", text: "Cada conversa é uma nova oportunidade. Escute com atenção e avance um passo de cada vez." },
  { category: "tecnica", text: "Antes de apresentar uma proposta, confirme a necessidade e o objetivo do cliente." },
  { category: "operacao", text: "Retornos pendentes incluem hoje e datas anteriores. Use Retornos futuros para planejar os próximos dias." },
];
export function parseInsights(value: unknown): InsightMessage[] {
  if (!Array.isArray(value)) return DEFAULT_INSIGHTS;
  const seen = new Set<string>();
  const messages = value.filter((item): item is InsightMessage => {
    if (!item || !["motivacional", "tecnica", "operacao"].includes(item.category) ||
        typeof item.text !== "string" || !item.text.trim() || seen.has(item.text.trim())) return false;
    seen.add(item.text.trim()); return true;
  });
  return messages.length ? messages : DEFAULT_INSIGHTS;
}
export function insightIndex(elapsedMs: number, count: number): number {
  return count > 0 ? Math.floor(Math.max(0, elapsedMs) / INSIGHT_INTERVAL_MS) % count : 0;
}
