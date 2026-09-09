import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Check, CheckCheck, Clock, Image as ImageIcon, Paperclip, Send, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCrm } from "@/lib/crm-store";
import { QUICK_MESSAGES, formatTime } from "@/lib/call-script";

const EMOJIS = ["😀", "👍", "🙏", "🚀", "📅", "💰", "✅", "😉", "📄", "⏰"];

export function WhatsappChat({ className = "" }: { className?: string }) {
  const crm = useCrm();
  const [draft, setDraft] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [(crm as any).messages?.length, (crm as any).clientTyping]);

  const send = (text: string) => {
    const value = text.trim();
    if (!value) return;
    (crm as any).sendMessage?.(value);
    setDraft("");
    setShowEmoji(false);
  };

  const attach = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    (crm as any).sendMessage?.(file.name, { name: file.name, kind: file.type.startsWith("image/") ? "image" : "file" });
  };

  return (
    <div className={`flex min-h-0 flex-col rounded-[var(--radius)] border border-border bg-panel ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-whatsapp" />
          <p className="truncate text-sm font-semibold">WhatsApp — {crm.lead.name}</p>
          {((crm as any).unread ?? 0) > 0 && (
            <Badge className="animate-pulse-alert bg-whatsapp text-success-foreground">{(crm as any).unread}</Badge>
          )}
        </div>
        <Button size="icon" variant="ghost" onClick={(crm as any).toggleMute} aria-label={(crm as any).muted ? "Ativar som" : "Silenciar"}>
          {(crm as any).muted ? <BellOff className="size-4" /> : <Bell className="size-4" />}
        </Button>
      </div>

      <div ref={scrollRef} onClick={(crm as any).markChatRead} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {((crm as any).messages as any[] ?? []).map((m: any) => {
          const mine = m.from === "operator";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-[var(--radius)] px-3 py-2 text-sm ${
                  mine ? "bg-whatsapp/20 text-foreground" : "bg-muted text-foreground"
                }`}
              >
                {m.attachment && (
                  <span className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {m.attachment.kind === "image" ? <ImageIcon className="size-3.5" /> : <Paperclip className="size-3.5" />}
                    {m.attachment.kind === "image" ? "Imagem" : "Documento"}
                  </span>
                )}
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <span className="mt-1 flex items-center justify-end gap-1 font-mono text-[10px] text-muted-foreground">
                  {formatTime(m.at)}
                  {mine &&
                    (m.status === "sent" ? (
                      <Clock className="size-3" />
                    ) : m.status === "delivered" ? (
                      <Check className="size-3" />
                    ) : (
                      <CheckCheck className="size-3 text-info" />
                    ))}
                </span>
              </div>
            </div>
          );
        })}
        {(crm as any).clientTyping && (
          <p className="animate-pulse text-xs text-whatsapp">Cliente está digitando...</p>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
        {QUICK_MESSAGES.map((q) => (
          <Button key={q.key} size="sm" variant="secondary" onClick={() => send(q.text)}>
            {q.label}
          </Button>
        ))}
      </div>

      {showEmoji && (
        <div className="flex flex-wrap gap-1 border-t border-border px-3 py-2">
          {EMOJIS.map((e) => (
            <button key={e} type="button" className="rounded-md px-1.5 text-lg hover:bg-muted" onClick={() => setDraft((d) => d + e)}>
              {e}
            </button>
          ))}
        </div>
      )}

      <form
        className="flex items-center gap-1.5 border-t border-border p-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <Button type="button" size="icon" variant="ghost" onClick={() => setShowEmoji((v) => !v)} aria-label="Emojis">
          <Smile className="size-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" onClick={() => fileRef.current?.click()} aria-label="Anexar arquivo">
          <Paperclip className="size-4" />
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            attach(e.target.files);
            e.target.value = "";
          }}
        />
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escreva uma mensagem"
          className="h-9"
        />
        <Button type="submit" size="icon" variant="whatsapp" aria-label="Enviar">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
