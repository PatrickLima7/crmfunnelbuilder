import { supabase } from "./supabase";

export async function callAccountFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = "Não foi possível concluir. Verifique a conexão e a publicação das funções no Supabase.";
    if (error.context instanceof Response) {
      const payload = await error.context.json().catch(() => null);
      if (typeof payload?.error === "string") message = payload.error;
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

export async function loginWithUsername(username: string, password: string) {
  // Preserve access for existing administrators and operators.
  if (username.includes("@")) {
    const result = await supabase.auth.signInWithPassword({ email: username.trim(), password });
    if (result.error) throw new Error("Usuário ou senha incorretos.");
    return result.data;
  }
  const session = await callAccountFunction<{ access_token: string; refresh_token: string }>("login-username", { username, password });
  if (!session?.access_token || !session.refresh_token) throw new Error("Resposta de login inválida.");
  const { data, error } = await supabase.auth.setSession(session);
  if (error) throw new Error("Não foi possível iniciar sua sessão.");
  return data;
}
