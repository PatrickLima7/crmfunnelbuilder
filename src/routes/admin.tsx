import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  ArrowLeft,
  Coffee,
  GripVertical,
  Phone,
  Plus,
  Save,
  Target,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatClock } from "@/lib/crm-data";
import type { ScriptStep } from "@/lib/call-script";
import {
  DEFAULT_GOALS,
  DEFAULT_SCRIPT,
  STATE_LABEL,
  seedOperators,
  tickOperators,
  type ActivityEvent,
  type AdminGoals,
  type OperatorLive,
  type OperatorState,
} from "@/lib/admin-mock";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel do administrador — Funil de Vendas CRM" },
      {
        name: "description",
        content:
          "Acompanhe operadores em tempo real, defina metas diárias e construa o script de vendas usado no atendimento.",
      },
      { property: "og:title", content: "Painel do administrador — Funil de Vendas CRM" },
      {
        property: "og:description",
        content: "Monitoramento ao vivo de pausas e ligações, metas da equipe e editor de script.",
      },
    ],
  }),
  ssr: false,
  component: AdminPage,
});

const STATE_TONE: Record<OperatorState, string> = {
  ligacao: "bg-success/15 text-success border-success/30",
  whatsapp: "bg-info/15 text-info border-info/30",
  ocioso: "bg-muted text-muted-foreground border-border",
  pausa: "bg-warning/15 text-warning border-warning/30",
};

function AdminPage() {
  const [operators, setOperators] = useState<OperatorLive[]>(() => seedOperators());
  const [feed, setFeed] = useState<ActivityEvent[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [goals, setGoals] = useState<AdminGoals>(DEFAULT_GOALS);
  const [script, setScript] = useState<ScriptStep[]>(DEFAULT_SCRIPT);

  useEffect(() => {
    const t = window.setInterval(() => {
      setNow(Date.now());
      setOperators((prev) => {
        const { operators: next, events } = tickOperators(prev);
        if (events.length) setFeed((f) => [...events.reverse(), ...f].slice(0, 60));
        return next;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  const totals = useMemo(() => {
    const contacts = operators.reduce((s, o) => s + o.contacts, 0);
    const conversions = operators.reduce((s, o) => s + o.conversions, 0);
    const onPause = operators.filter((o) => o.state === "pausa").length;
    const onCall = operators.filter((o) => o.state === "ligacao").length;
    return { contacts, conversions, onPause, onCall };
  }, [operators]);

  const teamGoal = goals.dailyContacts * operators.length;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-sidebar/95 px-4 py-3 backdrop-blur">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary">
          <Activity className="size-4 text-primary-foreground" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-extrabold tracking-tight sm:text-base">
            PAINEL DO ADMINISTRADOR
          </h1>
          <p className="text-[11px] text-muted-foreground">Monitoramento em tempo real (dados simulados)</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden rounded-md border border-border bg-panel px-2.5 py-1 font-mono text-xs sm:inline">
            {new Date(now).toLocaleTimeString("pt-BR")}
          </span>
          <Button asChild variant="secondary" size="sm">
            <Link to="/dashboard">
              <ArrowLeft /> Operação
            </Link>
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={Users} label="Operadores online" value={String(operators.length)} hint={`${totals.onCall} em ligação`} />
          <Kpi icon={Phone} label="Contatos da equipe" value={String(totals.contacts)} hint={`Meta ${teamGoal}`} />
          <Kpi icon={TrendingUp} label="Conversões" value={String(totals.conversions)} hint={`Meta ${goals.dailyConversions * operators.length}`} tone="text-success" />
          <Kpi icon={Coffee} label="Em pausa" value={String(totals.onPause)} hint="Agora" tone="text-warning" />
        </div>

        <Tabs defaultValue="monitor">
          <TabsList>
            <TabsTrigger value="monitor">Monitoramento</TabsTrigger>
            <TabsTrigger value="metas">Metas</TabsTrigger>
            <TabsTrigger value="script">Script de vendas</TabsTrigger>
          </TabsList>

          <TabsContent value="monitor" className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-xl border border-border bg-panel">
              <div className="border-b border-border px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Operadores em tempo real
              </div>
              <div className="divide-y divide-border">
                {operators.map((op) => {
                  const inState = Math.floor((now - op.stateSince) / 1000);
                  const overPause = op.state === "pausa" && inState > goals.maxPauseMinutes * 60;
                  return (
                    <div key={op.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                      <div className="min-w-[150px] flex-1">
                        <p className="truncate font-semibold">{op.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">Lead: {op.currentLead}</p>
                      </div>
                      <span className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${STATE_TONE[op.state]}`}>
                        {STATE_LABEL[op.state]}
                        {op.pauseReason ? ` · ${op.pauseReason}` : ""}
                      </span>
                      <span className={`font-mono text-xs ${overPause ? "text-destructive" : "text-muted-foreground"}`}>
                        {formatClock(inState)}
                      </span>
                      <div className="flex gap-4 text-[11px] text-muted-foreground">
                        <span>
                          Contatos <b className="text-foreground">{op.contacts}</b>/{goals.dailyContacts}
                        </span>
                        <span>
                          Conv. <b className="text-success">{op.conversions}</b>
                        </span>
                        <span>
                          Falado <b className="text-foreground">{formatClock(op.talkSeconds)}</b>
                        </span>
                        <span>
                          Pausa <b className={op.pauseSeconds > goals.maxPauseMinutes * 60 ? "text-warning" : "text-foreground"}>{formatClock(op.pauseSeconds)}</b>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-panel">
              <div className="border-b border-border px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Feed de atividades
              </div>
              <div className="max-h-[420px] space-y-1.5 overflow-y-auto p-3 text-xs">
                {feed.length === 0 && <p className="text-muted-foreground">Aguardando eventos dos operadores…</p>}
                {feed.map((e) => (
                  <div key={e.id} className="flex gap-2 rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {new Date(e.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                    <span className="min-w-0">
                      <b>{e.operator}</b> {e.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="metas" className="mt-4">
            <div className="max-w-2xl rounded-xl border border-border bg-panel p-4">
              <h2 className="mb-1 flex items-center gap-2 text-sm font-bold">
                <Target className="size-4 text-primary" /> Metas e limites da equipe
              </h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Valores aplicados a cada operador. Alterações valem para o próximo expediente.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <GoalField label="Contatos por dia" value={goals.dailyContacts} onChange={(v) => setGoals({ ...goals, dailyContacts: v })} />
                <GoalField label="Conversões por dia" value={goals.dailyConversions} onChange={(v) => setGoals({ ...goals, dailyConversions: v })} />
                <GoalField label="Tempo máx. de pausa (min)" value={goals.maxPauseMinutes} onChange={(v) => setGoals({ ...goals, maxPauseMinutes: v })} />
                <GoalField label="Tempo máx. por etapa (min)" value={goals.maxStepMinutes} onChange={(v) => setGoals({ ...goals, maxStepMinutes: v })} />
                <GoalField label="Duração ideal da ligação (min)" value={goals.callTargetMinutes} onChange={(v) => setGoals({ ...goals, callTargetMinutes: v })} />
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => toast.success("Metas atualizadas para toda a equipe.")}>
                  <Save /> Salvar metas
                </Button>
                <Button variant="secondary" onClick={() => setGoals(DEFAULT_GOALS)}>
                  Restaurar padrão
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="script" className="mt-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <p className="text-xs text-muted-foreground">
                Monte as etapas que o operador segue durante a ligação. Uma frase ou item por linha.
              </p>
              <div className="ml-auto flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setScript((s) => [
                      ...s,
                      {
                        key: `etapa-${s.length + 1}-${Date.now()}`,
                        title: `Nova etapa ${s.length + 1}`,
                        checklist: ["Novo item de checklist"],
                        speech: ["Fala sugerida"],
                        noteLabel: "Observações desta etapa",
                      },
                    ])
                  }
                >
                  <Plus /> Adicionar etapa
                </Button>
                <Button size="sm" onClick={() => toast.success("Script publicado para os operadores.")}>
                  <Save /> Publicar script
                </Button>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {script.map((step, i) => (
                <div key={step.key} className="rounded-xl border border-border bg-panel p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <GripVertical className="size-4 shrink-0 text-muted-foreground" />
                    <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <Input
                      value={step.title}
                      onChange={(e) =>
                        setScript((s) => s.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                      }
                      className="h-8"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="size-8 shrink-0"
                      onClick={() => setScript((s) => s.filter((_, j) => j !== i))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <ListField
                      label="Checklist"
                      value={step.checklist}
                      onChange={(v) => setScript((s) => s.map((x, j) => (j === i ? { ...x, checklist: v } : x)))}
                    />
                    <ListField
                      label="Falas sugeridas"
                      value={step.speech}
                      onChange={(v) => setScript((s) => s.map((x, j) => (j === i ? { ...x, speech: v } : x)))}
                    />
                    <div className="space-y-1">
                      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Rótulo do campo de anotação
                      </Label>
                      <Input
                        value={step.noteLabel}
                        onChange={(e) =>
                          setScript((s) => s.map((x, j) => (j === i ? { ...x, noteLabel: e.target.value } : x)))
                        }
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone = "text-foreground",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-panel px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" /> <span className="truncate">{label}</span>
      </div>
      <p className={`font-mono text-xl font-bold leading-tight ${tone}`}>{value}</p>
      {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function GoalField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
    </div>
  );
}

function ListField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Textarea
        rows={3}
        value={value.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n"))}
        className="text-xs"
      />
    </div>
  );
}
