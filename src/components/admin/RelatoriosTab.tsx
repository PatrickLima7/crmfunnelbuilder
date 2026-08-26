import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Calendar, Coffee, Download, Phone, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import type { Profile, PauseEvent, ContactEvent } from "@/lib/supabase-types";
import { formatClock } from "@/lib/crm-data";

// ─── Data hooks ───────────────────────────────────────────────────────────────

function usePauseReport(days: number) {
  return useQuery({
    queryKey: ["report", "pauses", days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from("pause_events")
        .select("*, profile:profiles(name)")
        .gte("started_at", since)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useContactReport(days: number) {
  return useQuery({
    queryKey: ["report", "contacts", days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from("contact_events")
        .select("*, profile:profiles(name)")
        .gte("started_at", since)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useRanking(days: number) {
  return useQuery({
    queryKey: ["report", "ranking", days],
    queryFn: async (): Promise<Array<{ name: string; contacts: number; conversions: number; pause_seconds: number }>> => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();

      // Get all profiles
      const { data: profiles } = await supabase.from("profiles").select("id, name").eq("role", "operator");
      if (!profiles) return [];

      // Aggregate contacts per operator
      const { data: contacts } = await supabase
        .from("contact_events")
        .select("operator_id, outcome")
        .gte("started_at", since);

      // Aggregate pauses per operator
      const { data: pauses } = await supabase
        .from("pause_events")
        .select("operator_id, duration_seconds")
        .gte("started_at", since);

      return profiles.map((p) => {
        const myContacts = (contacts ?? []).filter((c) => c.operator_id === p.id);
        const myPauses = (pauses ?? []).filter((e) => e.operator_id === p.id);
        return {
          name: p.name.split(" ")[0]!,
          contacts: myContacts.length,
          conversions: myContacts.filter((c) => c.outcome === "interessado").length,
          pause_seconds: myPauses.reduce((s, e) => s + (e.duration_seconds ?? 0), 0),
        };
      }).sort((a, b) => b.contacts - a.contacts);
    },
  });
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportCsv(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]!);
  const lines = [
    cols.join(";"),
    ...rows.map((r) => cols.map((c) => String(r[c] ?? "")).join(";")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { label: "Hoje", days: 1 },
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
];

export function RelatoriosTab() {
  const [days, setDays] = useState(7);
  const { data: ranking = [] } = useRanking(days);
  const { data: pauses = [] } = usePauseReport(days);
  const { data: contacts = [] } = useContactReport(days);

  const totalContacts = contacts.length;
  const totalConversions = contacts.filter((c) => c.outcome === "interessado").length;
  const totalPauseSeconds = pauses.reduce((s, p) => s + (p.duration_seconds ?? 0), 0);
  const convRate = totalContacts > 0 ? ((totalConversions / totalContacts) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <Calendar className="size-4 text-muted-foreground" />
        <div className="flex gap-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setDays(opt.days)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                days === opt.days
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Phone} label="Total contatos" value={String(totalContacts)} />
        <Kpi icon={TrendingUp} label="Conversões" value={String(totalConversions)} tone="text-success" />
        <Kpi icon={TrendingUp} label="Taxa conv." value={`${convRate}%`} tone="text-success" />
        <Kpi icon={Coffee} label="Pausa total equipe" value={formatClock(totalPauseSeconds)} tone="text-warning" />
      </div>

      {/* Ranking chart */}
      <div className="rounded-xl border border-border bg-panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold">Ranking de operadores</h3>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => exportCsv(ranking, `ranking_${days}d.csv`)}
          >
            <Download className="size-3.5" /> CSV
          </Button>
        </div>
        {ranking.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sem dados para o período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ranking} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="contacts" name="Contatos" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="conversions" name="Conversões" fill="var(--success)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pause report */}
      <div className="rounded-xl border border-border bg-panel">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Histórico de pausas
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              exportCsv(
                pauses.map((p) => ({
                  operador: (p as { profile?: { name?: string } }).profile?.name ?? p.operator_id,
                  motivo: p.reason,
                  inicio: new Date(p.started_at).toLocaleString("pt-BR"),
                  fim: p.ended_at ? new Date(p.ended_at).toLocaleString("pt-BR") : "Em curso",
                  duracao_min: p.duration_seconds ? Math.round(p.duration_seconds / 60) : "-",
                })),
                `pausas_${days}d.csv`,
              )
            }
          >
            <Download className="size-3" /> Exportar
          </Button>
        </div>
        <div className="max-h-64 overflow-y-auto divide-y divide-border">
          {pauses.length === 0 && (
            <p className="px-4 py-4 text-sm text-muted-foreground">Nenhuma pausa registrada no período.</p>
          )}
          {pauses.slice(0, 50).map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
              <Coffee className="size-3.5 shrink-0 text-warning" />
              <span className="font-semibold">{(p as { profile?: { name?: string } }).profile?.name ?? "—"}</span>
              <span className="text-muted-foreground">{p.reason}</span>
              <span className="ml-auto font-mono text-muted-foreground">
                {p.duration_seconds ? formatClock(p.duration_seconds) : "Em curso"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone = "text-foreground" }: { icon: React.ElementType; label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-panel px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" /> <span className="truncate">{label}</span>
      </div>
      <p className={`font-mono text-xl font-bold leading-tight ${tone}`}>{value}</p>
    </div>
  );
}
