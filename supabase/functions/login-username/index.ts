import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
const denied = () => reply(401, { error: "Usuário ou senha incorretos." });

// Public login endpoint. verify_jwt=false; credentials are verified by Supabase Auth.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return reply(405, { error: "Método inválido." });
  try {
    let input;
    try { input = await req.json(); } catch { return denied(); }
    const username = typeof input?.username === "string" ? input.username.trim().toLowerCase() : "";
    const password = input?.password;
    if (!/^[a-z0-9][a-z0-9._-]{2,79}$/.test(username) || typeof password !== "string" || !password || password.length > 128) return denied();
    const url = Deno.env.get("SUPABASE_URL")!;
    const options = { auth: { persistSession: false, autoRefreshToken: false } };
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, options);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(username));
    const key = Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, "0")).join("");
    const { data: allowed, error: limitError } = await admin.rpc("consume_username_login_attempt", { p_key: key });
    if (limitError) return reply(503, { error: "Login indisponível. Tente novamente mais tarde." });
    if (!allowed) return reply(429, { error: "Muitas tentativas. Aguarde 5 minutos." });
    const { data: profile, error } = await admin.from("profiles").select("id, active").eq("username", username).maybeSingle();
    if (error || !profile?.active) return denied();
    const { data: account, error: accountError } = await admin.auth.admin.getUserById(profile.id);
    if (accountError || !account.user?.email) return denied();
    const auth = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, options);
    const { data, error: signInError } = await auth.auth.signInWithPassword({ email: account.user.email, password });
    if (signInError || !data.session || data.user?.id !== profile.id) return denied();
    return reply(200, { access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  } catch {
    return reply(503, { error: "Login indisponível. Tente novamente mais tarde." });
  }
});
