import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Circle,
  FileText,
  PhoneOff,
  Timer,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useCrm } from "@/lib/crm-store";
import { useScript } from "@/hooks/useScript";
import { CALL_OUTCOMES, SCRIPT_STEPS as FALLBACK_STEPS, SEM_INTERESSE_MOTIVOS, type CallOutcome, type SemInteresseMotivo } from "@/lib/call-script";
import { formatClock } from "@/lib/crm-data";

export function CallScriptModal() {
  const crm = useCrm();
  const { data: dbScript = [] } = useScript();

  // Use DB script if available, otherwise fallback to local static steps
  const steps = dbScript.length > 0
    ? dbScript.map((s) => ({
        key: s.id,
        title: s.title,
        checklist: s.checklist,
        speech: s.speech,
        noteLabel: s.note_label,
      }))
    : FALLBACK_STEPS;

  const [index, setIndex] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [asking, setAsking] = useState(false);
  const [outcome, setOutcome] = useState<CallOutcome | null>(null);
  const [semInteresseMotivo, setSemInteresseMotivo] = useState<SemInteresseMotivo | null>(null);
  const [returnDate, setReturnDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0]!;
  });
  const [returnTime, setReturnTime] = useState<string>("10:00");
  const [retornoError, setRetornoError] = useState<string | null>(null);

  const safeIndex = Math.min(index, Math.max(0, steps.length - 1));
  const step = steps[safeIndex] ?? FALLBACK_STEPS[0]!;
  const last = safeIndex === steps.length - 1;
  const progress = ((safeIndex + 1) / steps.length) * 100;

  const reset = () => {
    setIndex(0);
    setNotes({});
    setChecked({});
    setAsking(false);
    setOutcome(null);
    setSemInteresseMotivo(null);
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setReturnDate(d.toISOString().split("T")[0]!);
    setReturnTime("10:00");
    setRetornoError(null);
  };

  // Outcomes that require a scheduling date/time (all except convertido and sem_interesse)
  const needsScheduling = outcome !== null && outcome !== "convertido" && outcome !== "sem_interesse";

  const validateAndFinish = async () => {
    if (!outcome) return;

    // sem_interesse: motivo obrigatório, sem agendamento
    if (outcome === "sem_interesse") {
      if (!semInteresseMotivo) {
        setRetornoError("Selecione o motivo do desinteresse para continuar.");
        return;
      }
      setRetornoError(null);
      await crm.finishCall(outcome, undefined, semInteresseMotivo);
      reset();
      return;
    }

    let callbackIso: string | undefined = undefined;

    // All outcomes except convertido and sem_interesse need optional/required scheduling
    if (needsScheduling) {
      if (returnDate && returnTime) {
        const selected = new Date(`${returnDate}T${returnTime}`);
        if (selected < new Date()) {
          setRetornoError("A data/hora de retorno deve ser no futuro.");
          return;
        }
        callbackIso = selected.toISOString();
      } else if (outcome === "retorno") {
        setRetornoError("Por favor, selecione data e hora de retorno.");
        return;
      }
    }

    setRetornoError(null);
    await crm.finishCall(outcome, callbackIso);
    reset();
  };

  return (
    <Dialog open={crm.callOpen} onOpenChange={(open) => { if (!open) setAsking(true); }}>
      <DialogContent className="flex h-[92vh] max-h-[92vh] w-[96vw] max-w-[900px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[900px]">
        <DialogTitle className="sr-only">Script de ligação</DialogTitle>

        {/* ── Header ── */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-panel px-5 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              📞 Ligação em andamento
            </p>
            <h2 className="truncate text-lg font-bold">{crm.lead.name}</h2>
            <p className="font-mono text-sm text-muted-foreground">{crm.lead.phone}</p>
          </div>
          <div className="flex items-center gap-2">
            {crm.callSeconds > 600 && <Badge className="bg-warning text-warning-foreground">Boa ligação! ⏱️</Badge>}
            <span className="flex items-center gap-1.5 rounded-md bg-success/15 px-2.5 py-1 font-mono text-sm font-bold text-success">
              <Timer className="size-3.5" /> {formatClock(crm.callSeconds)}
            </span>
            <Button variant="destructive" size="sm" onClick={() => setAsking(true)}>
              <PhoneOff /> Concluir ligação
            </Button>
          </div>
        </header>

        {/* ── Body ── */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
          {/* Progress bar + Step tabs */}
          <div className="rounded-xl border border-border bg-panel p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold">
                Etapa {safeIndex + 1} de {steps.length}: {step.title}
              </span>
              <span className="font-mono font-bold">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <ol className="mt-3 flex flex-wrap gap-2">
              {steps.map((s, i) => (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      i === safeIndex
                        ? "bg-primary text-primary-foreground"
                        : i < safeIndex
                          ? "bg-success/20 text-success"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {i < safeIndex ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}
                    {i + 1}. {s.title}
                  </button>
                </li>
              ))}
            </ol>
          </div>

          {/* Current Step Content */}
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-4">
            <h3 className="text-base font-bold uppercase tracking-wide text-primary">
              Etapa {safeIndex + 1}: {step.title}
            </h3>

            {/* Checklist */}
            {step.checklist.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Checklist de verificação
                </p>
                <ul className="space-y-1">
                  {step.checklist.map((item) => {
                    const key = `${step.key}-${item}`;
                    const on = !!checked[key];
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => setChecked((c) => ({ ...c, [key]: !on }))}
                          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                            on ? "bg-success/15 font-semibold text-success" : "text-foreground hover:bg-muted"
                          }`}
                        >
                          {on ? <CheckCircle2 className="size-4 shrink-0 text-success" /> : <Circle className="size-4 shrink-0 text-muted-foreground" />}
                          {item}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Speeches */}
            {step.speech.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Falas sugeridas
                </p>
                {step.speech.map((s) => (
                  <div key={s} className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm font-medium text-success">
                    “{s}”
                  </div>
                ))}
              </div>
            )}

            {/* Note taking */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                <FileText className="inline size-3.5 mr-1" />
                {step.noteLabel || "Anotações desta etapa"}
              </label>
              <Textarea
                className="min-h-20 bg-background text-xs"
                value={notes[step.key] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [step.key]: e.target.value }))}
                placeholder="Anote detalhes importantes mencionados pelo cliente…"
              />
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button variant="secondary" size="sm" disabled={safeIndex === 0} onClick={() => setIndex((i) => i - 1)}>
              <ArrowUp /> Etapa anterior
            </Button>
            {!last ? (
              <Button size="sm" onClick={() => setIndex((i) => i + 1)}>
                Próxima etapa <ArrowDown />
              </Button>
            ) : (
              <Button variant="destructive" size="sm" onClick={() => setAsking(true)}>
                <PhoneOff /> Concluir ligação
              </Button>
            )}
          </div>
        </div>

        {/* ── Conclusion Overlay ── */}
        {asking && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-panel p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div>
                <h3 className="text-lg font-bold">Qual foi o resultado da ligação?</h3>
                <p className="text-xs text-muted-foreground">Selecione o desfecho para registrar no relatório do dia.</p>
              </div>

              {/* Outcome selection */}
              <div className="space-y-2">
                {CALL_OUTCOMES.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => {
                      setOutcome(o.key);
                      setSemInteresseMotivo(null);
                      setRetornoError(null);
                    }}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                      outcome === o.key ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border hover:bg-muted"
                    }`}
                  >
                    {outcome === o.key ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    ) : (
                      <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    )}
                    <div>
                      <span className="block text-sm font-semibold">{o.label}</span>
                      <span className="block text-xs text-muted-foreground font-normal">{o.hint}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* sem_interesse: motivo obrigatório — não aparece agendamento */}
              {outcome === "sem_interesse" && (
                <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-xs font-bold text-destructive">❌ Selecione o motivo do desinteresse (obrigatório):</p>
                  <div className="space-y-1">
                    {SEM_INTERESSE_MOTIVOS.map((motivo) => (
                      <button
                        key={motivo}
                        type="button"
                        onClick={() => { setSemInteresseMotivo(motivo); setRetornoError(null); }}
                        className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                          semInteresseMotivo === motivo
                            ? "border-destructive bg-destructive/10 font-semibold text-destructive"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        {semInteresseMotivo === motivo ? (
                          <CheckCircle2 className="size-3.5 shrink-0 text-destructive" />
                        ) : (
                          <Circle className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                        {motivo}
                      </button>
                    ))}
                  </div>
                  {retornoError && (
                    <p className="text-xs font-bold text-destructive">{retornoError}</p>
                  )}
                </div>
              )}

              {/* All other outcomes except convertido: data/hora de retorno */}
              {needsScheduling && (
                <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
                  <p className="text-xs font-bold text-primary">
                    📅 Definir data e hora do retorno {outcome === "retorno" ? "(obrigatório)" : "(opcional)"}:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase">Data</label>
                      <input
                        type="date"
                        value={returnDate}
                        onChange={(e) => { setReturnDate(e.target.value); setRetornoError(null); }}
                        className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase">Hora</label>
                      <input
                        type="time"
                        value={returnTime}
                        onChange={(e) => { setReturnTime(e.target.value); setRetornoError(null); }}
                        className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                      />
                    </div>
                  </div>
                  {retornoError && (
                    <p className="text-xs font-bold text-destructive">{retornoError}</p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="secondary" className="flex-1" onClick={() => setAsking(false)}>
                  Voltar à ligação
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={
                    !outcome ||
                    (outcome === "sem_interesse" && !semInteresseMotivo)
                  }
                  onClick={() => void validateAndFinish()}
                >
                  Encerrar ligação
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
