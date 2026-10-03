import { crmDay, crmTime, crmDateTimeToIso } from "./lead-categories";

export const CALLBACK_OUTCOMES = ["interessado", "pensar", "retorno", "desligou"] as const;
export function requiresCallback(outcome: string | null): boolean {
  return CALLBACK_OUTCOMES.some((item) => item === outcome);
}
export function validCallback(value?: string | null): boolean {
  return !!value && Number.isFinite(Date.parse(value));
}
// Calendar arithmetic in Brasília, independent of the browser's timezone.
// At 23:00, +1 day and +2 hours rolls into 01:00 on the following day.
export function suggestCallback(now = new Date()): string {
  const wall = new Date(`${crmDay(now)}T${crmTime(now)}:00Z`);
  wall.setUTCDate(wall.getUTCDate() + 1);
  wall.setUTCHours(wall.getUTCHours() + 2);
  return crmDateTimeToIso(wall.toISOString().slice(0, 10), wall.toISOString().slice(11, 16));
}
