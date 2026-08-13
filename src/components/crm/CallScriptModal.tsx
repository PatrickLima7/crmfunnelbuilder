import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  FileText,
  MessageCircle,
  PhoneOff,
  Timer,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { WhatsappChat } from "./WhatsappChat";
import { useCrm } from "@/lib/crm-store";
import { CALL_OUTCOMES, QUICK_MESSAGES, SCRIPT_STEPS, type CallOutcome } from "@/lib/call-script";
import { formatClock } from "@/lib/crm-data";
import { toast } from "sonner";

export function CallScriptModal() {
  const crm = useCrm();
  const [index, setIndex] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [asking, setAsking] = useState(false);
  const [outcome, setOutcome] = useState<CallOutcome | null>(null);

  const step = SCRIPT_STEPS[index]!;
  const last = index === SCRIPT_STEPS.length - 1;
  const progress = ((index + 1) / SCRIPT_STEPS.length) * 100;

  const reset = () => {
    setIndex(0);
    setNotes({});
    setChecked({});
    setAsking(false);
    setOutcome(null);
  };

  return (
    <Dialog open={crm.callOpen}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[92vh] max-h-[92vh] w-[96vw] max-w-[1200px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1200px]"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-panel px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Ligação em andamento
            </p>
            <h2 className="truncate text-lg font-bold">{crm.lead.name}</h2>
            <p className="font-mono text-sm text-muted-foreground">{crm.lead.phone}</p>
          </div>
          <div className="flex items-center gap-2">
            {crm.callSeconds > 600 && <Badge className="bg-warning text-warning-foreground">Boa ligação! ⏱️</Badge>}
            <span className="flex items-center gap-1.5 rounded-md bg-success/15 px-2.5 py-1 font-mono text-sm text-success">
              <Timer className="size-3.5" /> {formatClock(crm.callSeconds)}
            </span>
            <Button variant="destructive" size="sm" onClick={() => setAsking(true)}>
              <PhoneOff /> Concluir ligação
            </Button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[3fr_2fr] lg:overflow-hidden">
          {/* Script */}
          <div className="flex min-h-0 flex-col gap-3 lg:overflow-y-auto">
            <div className="rounded-[var(--radius)] border border-border bg-panel p-3">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Passo {index + 1} de {SCRIPT_STEPS.length}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
              <ol className="mt-3 flex flex-wrap gap-2">
                {SCRIPT_STEPS.map((s, i) => (
                  <li key={s.key}>
                    <button
                      type="button"
                      onClick={() => setIndex(i)}
                      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                        i === index
                          ? "bg-primary text-primary-foreground"
                          : i < index
                            ? "bg-success/20 text-success"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i < index ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}
                      {i + 1}. {s.title}
                    </button>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-[var(--radius)] border border-primary/50 bg-primary/5 p-4">
              <h3 className="text-base font-bold uppercase tracking-wide text-primary">
                Passo {index + 1}: {step.title}
              </h3>

              <ul className="mt-3 space-y-2">
                {step.checklist.map((item) => {
                  const key = `${step.key}-${item}`;
                  const on = !!checked[key];
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => setChecked((c) => ({ ...c, [key]: !on }))}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                          on ? "text-success" : "text-foreground hover:bg-muted"
                        }`}
                      >
                        {on ? <CheckCircle2 className="size-4 shrink-0" /> : <Circle className="size-4 shrink-0 text-muted-foreground" />}
                        {item}
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-3 space-y-2">
                {step.speech.map((s) => (
                  <p key={s} className="rounded-[var(--radius)] border border-success/40 bg-success/10 p-3 text-sm font-bold text-success">
                    “{s}”
                  </p>
                ))}
              </div>

              {step.key === "proposta" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="info" onClick={() => toast.success("Calendário aberto — escolha o horário da demo.")}>
                    <CalendarDays /> Agendar demo
                  </Button>
                  <Button
                    size="sm"
                    variant="whatsapp"
                    onClick={() => crm.sendMessage(QUICK_MESSAGES[1]!.text)}
                  >
                    <FileText /> Enviar proposta por WhatsApp
                  </Button>
                  <Button size="sm" variant="warning" onClick={() => toast("Marcado: cliente quer pensar.")}>
                    <Clock3 /> Cliente quer pensar
                  </Button>
                </div>
              )}

              <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {step.noteLabel}
              </label>
              <Textarea
                className="mt-1.5 min-h-24 bg-background"
                value={notes[step.key] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [step.key]: e.target.value }))}
                placeholder="Anote aqui durante a conversa..."
              />
            </div>

            <div className="flex flex-wrap gap-2 pb-1">
              <Button variant="secondary" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
                <ArrowUp /> Passo anterior
              </Button>
              {!last ? (
                <Button onClick={() => setIndex((i) => i + 1)}>
                  <ArrowDown /> Próximo passo
                </Button>
              ) : (
                <Button variant="destructive" onClick={() => setAsking(true)}>
                  <PhoneOff /> Concluir ligação
                </Button>
              )}
            </div>
          </div>

          {/* Chat + anotações */}
          <div className="flex min-h-0 flex-col gap-3">
            <WhatsappChat className="min-h-[380px] flex-1" />
            <div className="rounded-[var(--radius)] border border-border bg-panel p-3">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <MessageCircle className="size-3.5" /> Anotações gerais da ligação
              </label>
              <Textarea
                className="mt-1.5 min-h-20 bg-background"
                value={notes["geral"] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, geral: e.target.value }))}
                placeholder="Resumo, objeções, próximos passos..."
              />
            </div>
          </div>
        </div>

        {asking && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/85 p-4">
            <div className="w-full max-w-md rounded-[var(--radius)] border border-border bg-panel p-5">
              <h3 className="text-lg font-bold">Qual foi o resultado da ligação?</h3>
              <div className="mt-4 space-y-2">
                {CALL_OUTCOMES.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setOutcome(o.key)}
                    className={`flex w-full items-start gap-3 rounded-[var(--radius)] border p-3 text-left transition-colors ${
                      outcome === o.key ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                    }`}
                  >
                    {outcome === o.key ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    ) : (
                      <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span>
                      <span className="block text-sm font-semibold">{o.label}</span>
                      <span className="block text-xs text-muted-foreground">{o.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setAsking(false)}>
                  Voltar à ligação
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={!outcome}
                  onClick={() => {
                    crm.finishCall(outcome!);
                    reset();
                  }}
                >
                  Encerrar
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
