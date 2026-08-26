import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Coffee,
  GripVertical,
  LogOut,
  Phone,
  Plus,
  Save,
  Settings,
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
import { supabase } from "@/lib/supabase";
import { useGoals, useSaveGoals } from "@/hooks/useGoals";
import { useScript, useSaveScript } from "@/hooks/useScript";
import { useOperatorsRealtime } from "@/hooks/useOperators";
import { VendedoresTab } from "@/components/admin/VendedoresTab";
import { RelatoriosTab } from "@/components/admin/RelatoriosTab";
import { ConfiguracaoTab } from "@/components/admin/ConfiguracaoTab";
import type { ScriptStepRow } from "@/lib/supabase-types";

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

const STATE_TONE: Record<string, string> = {
  ligacao: "bg-success/15 text-success border-success/30",
  whatsapp: "bg-info/15 text-info border-info/30",
  ocioso: "bg-muted text-muted-foreground border-border",
  pausa: "bg-warning/15 text-warning border-warning/30",
};

const STATE_LABEL: Record<string, string> = {
  ligacao: "Em ligação",
  whatsapp: "No WhatsApp",
  ocioso: "Ocioso",
  pausa: "Em pausa",
};

function AdminPage() {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());
  const [adminName, setAdminName] = useState("Admin");

  // Real data hooks
  const { operators, loading: opsLoading } = useOperatorsRealtime();
  const { data: goalsData } = useGoals();
  const { data: scriptData } = useScript();
  const saveGoals = useSaveGoals();
  const saveScript = useSaveScript();

  // Local editable state (initialised from DB)
  const [goals, setGoals] = useState({
    daily_contacts: 80,
    daily_conversions: 12,
    max_pause_minutes: 20,
    max_step_minutes: 5,
    call_target_minutes: 6,
  });

  const [script, setScript] = useState<ScriptStepRow[]>([]);

  // Realtime feed (activity events derived from presence changes)
  const [feed, setFeed] = useState<Array<{ id: string; at: number; name: string; text: string }>>([]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // Sync goals from DB
  useEffect(() => {
    if (goalsData) {
      setGoals({
        daily_contacts: goalsData.daily_contacts,
        daily_conversions: goalsData.daily_conversions,
        max_pause_minutes: goalsData.max_pause_minutes,
        max_step_minutes: goalsData.max_step_minutes,
        call_target_minutes: goalsData.call_target_minutes,
      });
    }
  }, [goalsData]);

  // Sync script from DB
  useEffect(() => {
    if (scriptData && scriptData.length > 0) {
      setScript(scriptData);
    }
  }, [scriptData]);

  // Load admin name
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate({ to: "/" }); return; }
      supabase.from("profiles").select("name, role").eq("id", user.id).single().then(({ data }) => {
        if (!data || data.role !== "admin") {
          toast.error("Acesso restrito a administradores.");
          navigate({ to: "/dashboard" });
        } else {
          setAdminName(data.name);
        }
      });
    });
  }, [navigate]);

  // Track presence changes for feed
  const prevOpsRef = useMemo(() => new Map<string, string>(), []);
  useEffect(() => {
    for (const op of operators) {
      const prev = prevOpsRef.get(op.operator_id);
      if (prev !== undefined && prev !== op.state) {
        const name = op.profile?.name ?? "Operador";
        let text = "";
        if (op.state === "pausa") text = `iniciou pausa${op.pause_reason ? `: ${op.pause_reason}` : ""}`;
        else if (prev === "pausa") text = "retornou da pausa";
        else if (op.state === "ligacao") text = `iniciou ligação com ${op.current_lead ?? "lead"}`;
        else if (op.state === "whatsapp") text = `foi para WhatsApp`;
        else text = `ficou ocioso`;
        setFeed((f) => [{ id: `${op.operator_id}-${Date.now()}`, at: Date.now(), name, text }, ...f].slice(0, 60));
      }
      prevOpsRef.set(op.operator_id, op.state);
    }
  }, [operators, prevOpsRef]);

  const totals = useMemo(() => {
    const contacts = operators.reduce((s, o) => s + o.contacts_today, 0);
    const conversions = operators.reduce((s, o) => s + o.conversions_today, 0);
    const onPause = operators.filter((o) => o.state === "pausa").length;
    const onCall = operators.filter((o) => o.state === "ligacao").length;
    return { contacts, conversions, onPause, onCall };
  }, [operators]);

  const teamGoal = goals.daily_contacts * Math.max(1, operators.length);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-sidebar/95 px-4 py-3 backdrop-blur">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary">
          <Activity className="size-4 text-primary-foreground" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-extrabold tracking-tight sm:text-base">
            PAINEL DO ADMINISTRADOR
          </h1>
          <p className="text-[11px] text-muted-foreground">Olá, {adminName} · Dados em tempo real</p>
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
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="size-3.5" />
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {/* KPIs */}
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={Users} label="Operadores online" value={String(operators.length)} hint={`${totals.onCall} em ligação`} />
          <Kpi icon={Phone} label="Contatos da equipe" value={String(totals.contacts)} hint={`Meta ${teamGoal}`} />
          <Kpi icon={TrendingUp} label="Conversões" value={String(totals.conversions)} hint={`Meta ${goals.daily_conversions * Math.max(1, operators.length)}`} tone="text-success" />
          <Kpi icon={Coffee} label="Em pausa" value={String(totals.onPause)} hint="Agora" tone="text-warning" />
        </div>

        <Tabs defaultValue="monitor">
          <TabsList className="flex-wrap">
            <TabsTrigger value="monitor">Monitoramento</TabsTrigger>
            <TabsTrigger value="metas">Metas</TabsTrigger>
            <TabsTrigger value="script">Script</TabsTrigger>
            <TabsTrigger value="vendedores">
              <Users className="size-3.5" /> Vendedores
            </TabsTrigger>
            <TabsTrigger value="relatorios">
              <BarChart3 className="size-3.5" /> Relatórios
            </TabsTrigger>
            <TabsTrigger value="config">
              <Settings className="size-3.5" /> Config.
            </TabsTrigger>
          </TabsList>

          {/* ── MONITORAMENTO ── */}
          <TabsContent value="monitor" className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-xl border border-border bg-panel">
              <div className="border-b border-border px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Operadores em tempo real · {operators.length} online
              </div>
              <div className="divide-y divide-border">
                {opsLoading && (
                  <div className="flex h-24 items-center justify-center">
                    <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}
                {!opsLoading && operators.length === 0 && (
                  <p className="px-4 py-6 text-sm text-muted-foreground">Nenhum operador online no momento.</p>
                )}
                {operators.map((op) => {
                  const inState = Math.floor((now - new Date(op.updated_at).getTime()) / 1000);
                  const overPause = op.state === "pausa" && inState > goals.max_pause_minutes * 60;
                  return (
                    <div key={op.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                      <div className="min-w-[150px] flex-1">
                        <p className="truncate font-semibold">{op.profile?.name ?? "Operador"}</p>
                        <p className="truncate text-[11px] text-muted-foreground">Lead: {op.current_lead ?? "—"}</p>
                      </div>
                      <span className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${STATE_TONE[op.state]}`}>
                        {STATE_LABEL[op.state]}
                        {op.pause_reason ? ` · ${op.pause_reason}` : ""}
                      </span>
                      <span className={`font-mono text-xs ${overPause ? "text-destructive" : "text-muted-foreground"}`}>
                        {formatClock(inState)}
                      </span>
                      <div className="flex gap-4 text-[11px] text-muted-foreground">
                        <span>Contatos <b className="text-foreground">{op.contacts_today}</b>/{goals.daily_contacts}</span>
                        <span>Conv. <b className="text-success">{op.conversions_today}</b></span>
                        <span>Falado <b className="text-foreground">{formatClock(op.talk_seconds)}</b></span>
                        <span>Pausa <b className={op.pause_seconds > goals.max_pause_minutes * 60 ? "text-warning" : "text-foreground"}>{formatClock(op.pause_seconds)}</b></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity feed */}
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
                    <span className="min-w-0"><b>{e.name}</b> {e.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ── METAS ── */}
          <TabsContent value="metas" className="mt-4">
            <div className="max-w-2xl rounded-xl border border-border bg-panel p-4">
              <h2 className="mb-1 flex items-center gap-2 text-sm font-bold">
                <Target className="size-4 text-primary" /> Metas e limites da equipe
              </h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Valores aplicados a todos os operadores em tempo real.
                {goalsData && <span className="ml-1 text-muted-foreground/70">Última atualização: {new Date(goalsData.updated_at).toLocaleString("pt-BR")}</span>}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <GoalField label="Contatos por dia" value={goals.daily_contacts} onChange={(v) => setGoals({ ...goals, daily_contacts: v })} />
                <GoalField label="Conversões por dia" value={goals.daily_conversions} onChange={(v) => setGoals({ ...goals, daily_conversions: v })} />
                <GoalField label="Tempo máx. de pausa (min)" value={goals.max_pause_minutes} onChange={(v) => setGoals({ ...goals, max_pause_minutes: v })} />
                <GoalField label="Tempo máx. por etapa (min)" value={goals.max_step_minutes} onChange={(v) => setGoals({ ...goals, max_step_minutes: v })} />
                <GoalField label="Duração ideal da ligação (min)" value={goals.call_target_minutes} onChange={(v) => setGoals({ ...goals, call_target_minutes: v })} />
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => saveGoals.mutate(goals)} disabled={saveGoals.isPending}>
                  <Save /> {saveGoals.isPending ? "Salvando..." : "Salvar metas"}
                </Button>
                <Button variant="secondary" onClick={() => setGoals({ daily_contacts: 80, daily_conversions: 12, max_pause_minutes: 20, max_step_minutes: 5, call_target_minutes: 6 })}>
                  Restaurar padrão
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ── SCRIPT ── */}
          <TabsContent value="script" className="mt-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <p className="text-xs text-muted-foreground">
                Monte as etapas que o operador segue durante a ligação.
              </p>
              <div className="ml-auto flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setScript((s) => [
                      ...s,
                      {
                        id: "",
                        position: s.length + 1,
                        title: `Nova etapa ${s.length + 1}`,
                        checklist: ["Novo item"],
                        speech: ["Fala sugerida"],
                        note_label: "Observações",
                        updated_at: new Date().toISOString(),
                      },
                    ])
                  }
                >
                  <Plus /> Adicionar etapa
                </Button>
                <Button
                  size="sm"
                  onClick={() => saveScript.mutate(script)}
                  disabled={saveScript.isPending}
                >
                  <Save /> {saveScript.isPending ? "Publicando..." : "Publicar script"}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {script.map((step, i) => (
                <div key={step.id || i} className="rounded-xl border border-border bg-panel p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <GripVertical className="size-4 shrink-0 text-muted-foreground" />
                    <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <Input
                      value={step.title}
                      onChange={(e) => setScript((s) => s.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
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
                        value={step.note_label}
                        onChange={(e) => setScript((s) => s.map((x, j) => (j === i ? { ...x, note_label: e.target.value } : x)))}
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── VENDEDORES ── */}
          <TabsContent value="vendedores" className="mt-4">
            <VendedoresTab />
          </TabsContent>

          {/* ── RELATÓRIOS ── */}
          <TabsContent value="relatorios" className="mt-4">
            <RelatoriosTab />
          </TabsContent>

          {/* ── CONFIG ── */}
          <TabsContent value="config" className="mt-4">
            <ConfiguracaoTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Kpi({ icon: Icon, label, value, hint, tone = "text-foreground" }: {
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

function ListField({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Textarea rows={3} value={value.join("\n")} onChange={(e) => onChange(e.target.value.split("\n"))} className="text-xs" />
    </div>
  );
}
