import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return reply(405, { error: "Método inválido." });

  const token = req.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return reply(401, { error: "Autenticação obrigatória." });

  try {
    // This key exists only in the Edge Function environment, never in VITE_*.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return reply(401, { error: "Sessão inválida." });
    const { data: caller, error: profileError } = await admin.from("profiles")
      .select("role, active").eq("id", user.id).single();
    if (profileError || caller?.role !== "admin" || caller.active !== true) {
      return reply(403, { error: "Acesso restrito a administradores ativos." });
    }

    let input;
    try { input = await req.json(); } catch { return reply(400, { error: "JSON inválido." }); }
    const email = typeof input?.email === "string" ? input.email.trim() : "";
    const name = typeof input?.name === "string" ? input.name.trim() : "";
    const goal = input?.goal;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
        !name || name.length > 200 || !Number.isInteger(goal) || goal < 0 || goal > 10000) {
      return reply(400, { error: "Informe nome, e-mail e meta válidos." });
    }

    const tempPassword = `Crm!${Array.from(crypto.getRandomValues(new Uint8Array(24)),
      (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email, password: tempPassword, email_confirm: true, user_metadata: { name },
    });
    if (createError || !created.user) return reply(400, { error: "Não foi possível criar a conta. Verifique se o e-mail já está cadastrado." });

    const { data: profile, error: updateError } = await admin.from("profiles")
      .update({ name, role: "operator", active: true, daily_contacts_goal: goal })
      .eq("id", created.user.id).select("id").single();
    if (updateError || !profile) {
      // Roll back Auth if the profile trigger/schema is not deployed correctly.
      const { error: rollbackError } = await admin.auth.admin.deleteUser(created.user.id);
      if (rollbackError) console.error("Operator provisioning rollback failed", created.user.id);
      return reply(500, { error: "Falha ao configurar o perfil. Verifique as migrações do banco." });
    }
    return reply(201, { id: created.user.id, tempPassword });
  } catch {
    return reply(500, { error: "Falha interna ao criar consultor." });
  }
});
