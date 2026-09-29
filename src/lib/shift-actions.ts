import { supabase } from "./supabase";

export type ShiftSummary = { contacts_count?: number; conversions_count?: number; talk_seconds?: number };
export async function finishOwnShift(summary: ShiftSummary = {}, logout = false) {
  const { error } = await supabase.rpc("finish_own_shift", { p_summary: summary, p_logout: logout });
  if (error) throw new Error("Não foi possível finalizar o expediente. Sua sessão foi mantida; tente novamente.");
}
export async function closeShiftAndSignOut() {
  await finishOwnShift({}, true);
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error("Expediente encerrado, mas não foi possível sair. Tente novamente.");
}
