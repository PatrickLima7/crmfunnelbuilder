import { Activity, Flame, Sparkles, Target, TrendingUp, Users } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useCrm } from "@/lib/crm-store";

function Metric({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: typeof Target;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="stat-card shrink-0 py-2 transition-colors">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <p className={`font-mono text-xl font-bold ${toneClass}`}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>

  );
}

export function MetricsSidebar() {
  const crm = useCrm();
  const pct = Math.round(crm.progress * 100);

  return (
    <aside className="flex min-h-0 flex-col gap-2 border-border bg-sidebar p-3 lg:h-full lg:overflow-hidden lg:border-r">
      <div className="grid shrink-0 grid-cols-2 gap-2">
        <Metric icon={Target} label="Meta" value={String(crm.goal)} />
        <Metric
          icon={Users}
          label="Contatos"
          value={String(crm.contacts)}
          hint={`${pct}% da meta`}
          tone={crm.goalReached ? "success" : "default"}
        />
      </div>
      <div className="h-2 shrink-0 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${crm.goalReached ? "bg-success" : pct > 60 ? "bg-primary" : "bg-warning"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-2">
        <Metric icon={Flame} label="Conversões" value={String(crm.conversions)} tone="success" />
        <Metric icon={Activity} label="Conversas" value={String(crm.conversations)} />
        <Metric icon={TrendingUp} label="Negociações" value={String(crm.negotiations)} />
        <Metric icon={Activity} label="Ritmo/h" value={crm.pace.toFixed(1)} tone="warning" />
      </div>

      <div className="shrink-0 rounded-[var(--radius)] border border-success/40 bg-success/10 p-2">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-success">
          <Sparkles className="size-3.5" /> Insight
        </p>
        <p className="mt-0.5 text-xs leading-snug">{crm.insight}</p>
      </div>



      <div className="stat-card flex min-h-0 flex-1 flex-col">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Progressão do dia
        </p>
        <div className="mt-2 min-h-24 flex-1">

          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={crm.history} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line type="monotone" dataKey="contatos" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="meta" stroke="var(--chart-3)" strokeWidth={1} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </aside>
  );
}
