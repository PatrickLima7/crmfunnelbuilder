import type { Lead } from "./supabase-types";

export const CRM_TIME_ZONE = "America/Sao_Paulo";
export type LeadFilter = "novo" | "callbacks" | "future" | "quente" | "morno" | "frio" | "nutricao" | "converted" | "all";
type CategorizedLead = Pick<Lead, "status" | "temperature" | "callback_at">;
const calendar = new Intl.DateTimeFormat("en-CA", {
  timeZone: CRM_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
});
export function crmDay(value: string | Date): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = calendar.formatToParts(date);
  return ["year", "month", "day"].map((key) => parts.find((p) => p.type === key)!.value).join("-");
}
export function crmTime(value: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: CRM_TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
}
export function crmDateTimeToIso(day: string, time: string): string {
  const wall = Date.parse(`${day}T${time}:00Z`);
  if (!Number.isFinite(wall)) throw new Error("Data inválida");
  let instant = wall;
  for (let i = 0; i < 2; i++) {
    const represented = Date.parse(`${crmDay(new Date(instant))}T${crmTime(new Date(instant))}:00Z`);
    instant += wall - represented;
  }
  if (crmDay(new Date(instant)) !== day || crmTime(new Date(instant)) !== time) throw new Error("Data inválida");
  return new Date(instant).toISOString();
}
export function isOpenLead(lead: CategorizedLead): boolean {
  return !["converted", "inactive", "blacklisted"].includes(lead.status);
}
export function matchesLeadFilter(lead: CategorizedLead, filter: LeadFilter, now = new Date()): boolean {
  if (filter === "all") return true;
  if (filter === "converted") return lead.status === "converted";
  if (!isOpenLead(lead)) return false;
  if (filter === "novo") return lead.status === "novo";
  if (filter === "nutricao") return lead.status === "em_nutricao";
  if (filter === "callbacks" || filter === "future") {
    const day = lead.callback_at ? crmDay(lead.callback_at) : null;
    if (!day) return false;
    return filter === "callbacks" ? day <= crmDay(now)! : day > crmDay(now)!;
  }
  // New leads have their own Super quente priority. Scheduling never hides a temperature.
  return lead.status !== "novo" && lead.temperature === filter;
}
export function importedLeadStatus(isNew: boolean | undefined): "novo" | "pending" {
  return isNew === true ? "novo" : "pending";
}
