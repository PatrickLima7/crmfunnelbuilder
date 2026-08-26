import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flame, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/")(({
  head: () => ({
    meta: [
      { title: "Login — Funil de Vendas CRM" },
      { name: "description", content: "Acesse o painel do operador do CRM Funil de Vendas e gerencie leads, metas e conversões em tempo real." },
      { property: "og:title", content: "Login — Funil de Vendas CRM" },
      { property: "og:description", content: "Acesse o painel do operador do CRM Funil de Vendas." },
    ],
  }),
  component: LoginPage,
}));

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        if (profile?.role === "admin") {
          navigate({ to: "/admin" });
        } else {
          navigate({ to: "/dashboard" });
        }
      } else {
        setCheckingSession(false);
      }
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const value = email.trim();
    if (!value) return setError("Informe seu e-mail.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return setError("Use um e-mail válido.");
    if (password.length < 4) return setError("A senha deve ter pelo menos 4 caracteres.");

    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: value,
      password,
    });

    if (authError) {
      setLoading(false);
      if (authError.message.includes("Invalid login credentials")) {
        return setError("E-mail ou senha incorretos.");
      }
      return setError(authError.message);
    }

    if (data.user) {
      // Fetch profile to determine redirect
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profile?.role === "admin") {
        navigate({ to: "/admin" });
      } else {
        navigate({ to: "/dashboard" });
      }
    }

    setLoading(false);
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden flex-col justify-between bg-sidebar p-12 lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary">
            <Flame className="size-5 text-primary-foreground" />
          </span>
          <span className="text-lg font-extrabold tracking-tight">FUNIL DE VENDAS</span>
        </div>
        <div>
          <h1 className="max-w-md text-4xl font-extrabold leading-tight">
            Cada minuto do seu turno vira <span className="text-success">conversão</span>.
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Meta do dia, ritmo por hora, fila de oportunidades e protocolo de contato em uma única
            tela de operação.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            ["3.450", "leads na fila"],
            ["8.6/h", "ritmo médio"],
            ["150", "nutridos hoje"],
          ].map(([v, l]) => (
            <div key={l} className="stat-card">
              <p className="font-mono text-xl font-bold">{v}</p>
              <p className="text-xs text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <h2 className="text-2xl font-bold">Acesso ao painel</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Entre com seu e-mail corporativo.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="login">E-mail</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="login"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                className="pl-9"
                autoComplete="username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="pl-9"
                autoComplete="current-password"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={remember} onCheckedChange={(v) => setRemember(Boolean(v))} />
            Lembrar-me neste computador
          </label>

          {error && (
            <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar no painel"}
          </Button>
        </form>
      </section>
    </main>
  );
}
