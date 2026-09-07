import { useCallback, useRef, useState } from "react";
import { FileUp, AlertCircle, CheckCircle2, ChevronDown, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useImportLeads, type LeadInput } from "@/hooks/useLeads";
import { toast } from "sonner";

// ─── CSV parser ───────────────────────────────────────────────────────────────
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        result.push(cur.trim()); cur = "";
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  };

  // Try semicolon if comma gives 1 column
  const firstLine = lines[0]!;
  const separator = firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";
  const fixedParse = separator === ";"
    ? (line: string) => line.split(";").map((s) => s.replace(/^"|"$/g, "").trim())
    : parseRow;

  const headers = fixedParse(firstLine);
  const rows = lines.slice(1).map((line) => {
    const values = fixedParse(line);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
  return { headers, rows };
}

// ─── Lead field definitions ───────────────────────────────────────────────────
const LEAD_FIELDS: { key: keyof LeadInput; label: string; required?: boolean }[] = [
  { key: "name",       label: "Nome completo",        required: true },
  { key: "phone",      label: "Telefone principal" },
  { key: "phone2",     label: "Telefone secundário" },
  { key: "cpf",        label: "CPF" },
  { key: "email",      label: "E-mail" },
  { key: "city",       label: "Cidade" },
  { key: "state",      label: "Estado (UF)" },
  { key: "profession", label: "Profissão" },
  { key: "company",    label: "Empresa" },
  { key: "temperature",label: "Temperatura (quente/morno/frio)" },
  { key: "notes",      label: "Observações" },
];

// ─── Component ────────────────────────────────────────────────────────────────
interface LeadImportModalProps {
  open: boolean;
  onClose: () => void;
  operatorId: string;
}

type Step = "upload" | "map" | "preview" | "done";

export function LeadImportModal({ open, onClose, operatorId }: LeadImportModalProps) {
  const importLeads = useImportLeads(operatorId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<keyof LeadInput, string>>({} as Record<keyof LeadInput, string>);
  const [result, setResult] = useState<{ totalInserted: number; errors: string[] } | null>(null);

  const reset = () => {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setMapping({} as Record<keyof LeadInput, string>);
    setResult(null);
  };

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Selecione um arquivo .csv. Para Excel: Arquivo → Salvar como → CSV.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: h, rows: r } = parseCSV(text);
      if (h.length === 0) { toast.error("Arquivo CSV vazio ou inválido."); return; }
      setHeaders(h);
      setRows(r);
      // Auto-map by similarity
      const autoMap: Record<string, string> = {};
      LEAD_FIELDS.forEach(({ key }) => {
        const match = h.find((header) => {
          const hLower = header.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const kLower = String(key).toLowerCase();
          return hLower === kLower || hLower.includes(kLower) || kLower.includes(hLower.slice(0, 4));
        });
        if (match) autoMap[key] = match;
      });
      // Common aliases
      if (!autoMap.name) {
        const alias = h.find((header) => /nome|name/i.test(header));
        if (alias) autoMap.name = alias;
      }
      if (!autoMap.phone) {
        const alias = h.find((header) => /fone|phone|celular|tel/i.test(header));
        if (alias) autoMap.phone = alias;
      }
      setMapping(autoMap as Record<keyof LeadInput, string>);
      setStep("map");
    };
    reader.readAsText(file, "UTF-8");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const mappedRows = (): LeadInput[] =>
    rows.map((row) => {
      const lead: Record<string, string> = {};
      LEAD_FIELDS.forEach(({ key }) => {
        const col = mapping[key];
        if (col && row[col]) lead[key] = row[col].trim();
      });
      // Normalise temperature
      if (lead.temperature) {
        const t = lead.temperature.toLowerCase();
        if (t.includes("quente") || t.includes("hot")) lead.temperature = "quente";
        else if (t.includes("frio") || t.includes("cold") || t.includes("fria")) lead.temperature = "frio";
        else lead.temperature = "morno";
      }
      lead.origin = "csv";
      return lead as LeadInput;
    }).filter((l) => !!l.name);

  const handleImport = async () => {
    const leads = mappedRows();
    if (leads.length === 0) { toast.error("Nenhum lead com nome encontrado."); return; }
    const res = await importLeads.mutateAsync(leads);
    setResult(res);
    setStep("done");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="size-5 text-primary" /> Importar Leads (CSV)
          </DialogTitle>
        </DialogHeader>

        {/* ── Step 1: Upload ── */}
        {step === "upload" && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Importe sua base de contatos a partir de um arquivo <strong>.csv</strong>.{" "}
              Se tiver Excel, use <em>Arquivo → Salvar como → CSV UTF-8</em>.
            </p>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-colors ${
                dragOver ? "border-primary bg-primary/10" : "border-border bg-muted/30 hover:bg-muted/60"
              }`}
            >
              <FileUp className={`size-10 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
              <p className="text-sm font-semibold">Arraste o arquivo aqui ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground">Apenas arquivos .csv (separado por vírgula ou ponto-e-vírgula)</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />

            <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs space-y-1 text-muted-foreground">
              <p className="font-bold text-foreground">Colunas suportadas (qualquer nome em português/inglês):</p>
              <p>nome, telefone, celular, email, cpf, cidade, estado, profissão, empresa, temperatura, observações</p>
            </div>
          </div>
        )}

        {/* ── Step 2: Column mapping ── */}
        {step === "map" && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                {rows.length} linha(s) encontrada(s). Mapeie as colunas do seu CSV:
              </p>
              <Button variant="ghost" size="sm" onClick={reset}><X className="size-4" /></Button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {LEAD_FIELDS.map(({ key, label, required }) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-xs font-semibold">
                    {label}{required && <span className="ml-1 text-destructive">*</span>}
                  </span>
                  <Select
                    value={mapping[key] ?? "__none__"}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [key]: v === "__none__" ? "" : v }))}
                  >
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="— não importar —" />
                      <ChevronDown className="size-3 opacity-50" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— não importar —</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="secondary" onClick={reset}>Voltar</Button>
              <Button
                className="flex-1"
                disabled={!mapping.name}
                onClick={() => setStep("preview")}
              >
                Ver prévia ({mappedRows().length} leads)
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Preview ── */}
        {step === "preview" && (
          <div className="space-y-4 pt-2">
            <p className="text-sm font-semibold">
              Prévia dos primeiros 5 leads ({mappedRows().length} total):
            </p>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    {["Nome", "Telefone", "E-mail", "Cidade", "Temperatura"].map((h) => (
                      <th key={h} className="border-b px-2 py-1.5 text-left font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mappedRows().slice(0, 5).map((lead, i) => (
                    <tr key={i} className="border-b border-border/40 last:border-0">
                      <td className="px-2 py-1.5 font-medium">{lead.name}</td>
                      <td className="px-2 py-1.5 font-mono">{lead.phone ?? "—"}</td>
                      <td className="px-2 py-1.5">{lead.email ?? "—"}</td>
                      <td className="px-2 py-1.5">{lead.city ?? "—"}</td>
                      <td className="px-2 py-1.5 capitalize">{lead.temperature ?? "morno"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {mappedRows().length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                + {mappedRows().length - 5} lead(s) adicionais serão importados
              </p>
            )}

            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep("map")}>Ajustar mapeamento</Button>
              <Button
                className="flex-1"
                disabled={importLeads.isPending}
                onClick={handleImport}
              >
                {importLeads.isPending ? (
                  <><Loader2 className="size-4 animate-spin" /> Importando...</>
                ) : (
                  `Importar ${mappedRows().length} leads`
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Done ── */}
        {step === "done" && result && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="size-14 text-success" />
              <h3 className="text-xl font-bold">{result.totalInserted} leads importados!</h3>
              <p className="text-sm text-muted-foreground">Sua carteira de clientes foi atualizada com sucesso.</p>
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 space-y-1">
                <p className="flex items-center gap-1.5 text-xs font-bold text-destructive">
                  <AlertCircle className="size-4" /> {result.errors.length} erro(s):
                </p>
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-muted-foreground ml-5">{e}</p>
                ))}
              </div>
            )}

            <Button className="w-full" onClick={() => { reset(); onClose(); }}>
              Fechar e ver leads
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
