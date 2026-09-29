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
    const action = input?.action ?? "create";
    if (!["create", "edit", "reset-password"].includes(action)) return reply(400, { error: "Ação inválida." });
    if (action !== "create") {
      if (typeof input?.id !== "string" || !/^[0-9a-f-]{36}$/i.test(input.id)) return reply(400, { error: "Consultor inválido." });
      const { data: target, error: targetError } = await admin.from("profiles").select("id, role").eq("id", input.id).single();
      if (targetError || target?.role !== "operator") return reply(403, { error: "Selecione um consultor válido." });
      if (action === "reset-password") {
        if (typeof input.password !== "string" || input.password.length < 8 || input.password.length > 128) return reply(400, { error: "A senha deve ter entre 8 e 128 caracteres." });
        const { error: passwordError } = await admin.auth.admin.updateUserById(target.id, { password: input.password, email_confirm: true });
        if (passwordError) return reply(400, { error: "Não foi possível redefinir a senha. Confira os requisitos de senha do projeto." });
        return reply(200, { success: true });
      }
      const name = typeof input.name === "string" ? input.name.trim() : "";
      const username = typeof input.username === "string" ? input.username.trim().toLowerCase() : "";
      if (!name || name.length > 200 || !/^[a-z0-9][a-z0-9._-]{2,79}$/.test(username) || !Number.isInteger(input.goal) || input.goal < 1 || input.goal > 10000) return reply(400, { error: "Confira nome, usuário e meta (1 a 10000)." });
      const { error: editError } = await admin.from("profiles").update({ name, username, daily_contacts_goal: input.goal, updated_at: new Date().toISOString() }).eq("id", target.id).select("id").single();
      if (editError) return reply(400, { error: editError.code === "23505" ? "Este usuário já está em uso." : "Não foi possível editar o consultor." });
      return reply(200, { success: true, username });
    }
    const name = typeof input?.name === "string" ? input.name.trim() : "";
    const goal = input?.goal;
    // Keep the previous email-based client compatible during deployment.
    const legacy = typeof input?.email === "string" && input.password === undefined;
    const email = legacy ? input.email.trim() : `${crypto.randomUUID()}@users.crm.invalid`;
    if (!name || name.length > 200 || !Number.isInteger(goal) || goal < 1 || goal > 10000 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return reply(400, { error: "Informe nome e meta válidos." });
    const tempPassword = legacy
      ? `Crm!${Array.from(crypto.getRandomValues(new Uint8Array(24)), (byte) => byte.toString(16).padStart(2, "0")).join("")}`
      : input.password;
    if (typeof tempPassword !== "string" || tempPassword.length < 8 || tempPassword.length > 128) return reply(400, { error: "A senha deve ter entre 8 e 128 caracteres." });
    const base = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "").slice(0, 32) || "consultor";
    const simpleUsername = base.length >= 3 ? base : `${base}.consultor`;
    const { data: taken, error: lookupError } = await admin.from("profiles").select("id").eq("username", simpleUsername).maybeSingle();
    if (lookupError) return reply(500, { error: "Não foi possível verificar o usuário. Confira a migração 020." });
    const username = taken ? `${simpleUsername}.${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}` : simpleUsername;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email, password: tempPassword, email_confirm: true, user_metadata: { name },
    });
    if (createError || !created.user) return reply(400, { error: "Não foi possível criar a conta. Verifique se o e-mail já está cadastrado." });

    const { data: profile, error: updateError } = await admin.from("profiles")
      .update({ name, username, role: "operator", active: true, daily_contacts_goal: goal })
      .eq("id", created.user.id).select("id").single();
    if (updateError || !profile) {
      // Roll back Auth if the profile trigger/schema is not deployed correctly.
      const { error: rollbackError } = await admin.auth.admin.deleteUser(created.user.id);
      if (rollbackError) console.error("Operator provisioning rollback failed", created.user.id);
      return reply(500, { error: "Falha ao configurar o perfil. Verifique as migrações do banco." });
    }
    return reply(201, { id: created.user.id, username, ...(legacy ? { tempPassword } : {}) });
  } catch {
    return reply(500, { error: "Falha interna ao criar consultor." });
  }
});
