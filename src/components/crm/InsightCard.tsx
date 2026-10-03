import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { parseInsights, insightIndex, INSIGHT_INTERVAL_MS } from "@/lib/insight-messages";

const styles = {
  motivacional: { label: "Motivacional", color: "border-success/40 bg-success/10 text-success" },
  tecnica: { label: "Técnica", color: "border-yellow-400/40 bg-yellow-400/10 text-yellow-400" },
  operacao: { label: "Operação", color: "border-primary/40 bg-primary/10 text-primary" },
};
export function InsightCard() {
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);
  const { data } = useQuery({
    queryKey: ["app_config", "insight_messages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_config").select("value").eq("key", "insight_messages").maybeSingle();
      if (error) throw error;
      return data?.value ?? null;
    },
    refetchInterval: INSIGHT_INTERVAL_MS,
  });
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, INSIGHT_INTERVAL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, []);
  const messages = parseInsights(data);
  const message = messages[insightIndex(now - startedAt, messages.length)]!;
  const style = styles[message.category];
  return <div className={`shrink-0 rounded-[var(--radius)] border p-2 ${style.color}`}>
    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide"><Sparkles className="size-3.5" /> Insight · {style.label}</p>
    <p className="mt-0.5 text-xs leading-snug text-foreground" aria-live="polite">{message.text}</p>
  </div>;
}
