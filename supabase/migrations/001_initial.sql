-- ============================================================
-- CRM Funil de Vendas — Schema Supabase
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================================

-- --------------------------------------------------------
-- 1. PROFILES (extends auth.users)
-- --------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  role       text not null default 'operator' check (role in ('admin', 'operator')),
  cpf        text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'operator')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- --------------------------------------------------------
-- 2. GOALS (metas da equipe)
-- --------------------------------------------------------
create table if not exists public.goals (
  id                   uuid primary key default gen_random_uuid(),
  daily_contacts       int  not null default 80,
  daily_conversions    int  not null default 12,
  max_pause_minutes    int  not null default 20,
  max_step_minutes     int  not null default 5,
  call_target_minutes  int  not null default 6,
  updated_by           uuid references public.profiles(id),
  updated_at           timestamptz not null default now()
);

-- Seed default goals row
insert into public.goals (daily_contacts, daily_conversions, max_pause_minutes, max_step_minutes, call_target_minutes)
values (80, 12, 20, 5, 6)
on conflict do nothing;

-- --------------------------------------------------------
-- 3. SCRIPT STEPS (etapas do script de vendas)
-- --------------------------------------------------------
create table if not exists public.script_steps (
  id          uuid primary key default gen_random_uuid(),
  position    int  not null,
  title       text not null,
  checklist   text[] not null default '{}',
  speech      text[] not null default '{}',
  note_label  text not null default 'Observações',
  updated_at  timestamptz not null default now()
);

-- Seed default script
insert into public.script_steps (position, title, checklist, speech, note_label) values
(1, 'Abertura', ARRAY['Confirmar nome do lead','Verificar disponibilidade','Apresentar motivo do contato'], ARRAY['Oi [nome], aqui é [seu nome] da equipe comercial, tudo bem?','Tenho uma oportunidade rápida para te apresentar, você tem 3 minutos?'], 'Observações da abertura'),
(2, 'Apresentação', ARRAY['Explicar o produto','Destacar benefício principal','Verificar interesse'], ARRAY['Nós ajudamos empresas como a sua a [benefício principal].','Qual o seu maior desafio hoje com [problema que resolve]?'], 'Nível de interesse do lead'),
(3, 'Fechamento', ARRAY['Confirmar interesse','Propor próximo passo','Registrar desfecho'], ARRAY['Faz sentido para você avançarmos?','Posso te enviar os detalhes pelo WhatsApp agora?'], 'Resultado da ligação')
on conflict do nothing;

-- --------------------------------------------------------
-- 4. OPERATOR PRESENCE (realtime)
-- --------------------------------------------------------
create table if not exists public.operator_presence (
  id                uuid primary key default gen_random_uuid(),
  operator_id       uuid not null references public.profiles(id) on delete cascade,
  state             text not null default 'ocioso' check (state in ('ligacao','whatsapp','ocioso','pausa')),
  pause_reason      text,
  current_lead      text,
  contacts_today    int  not null default 0,
  conversions_today int  not null default 0,
  talk_seconds      int  not null default 0,
  pause_seconds     int  not null default 0,
  updated_at        timestamptz not null default now(),
  unique(operator_id)
);

-- --------------------------------------------------------
-- 5. WORK SESSIONS
-- --------------------------------------------------------
create table if not exists public.work_sessions (
  id          uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.profiles(id) on delete cascade,
  date        date not null default current_date,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  unique(operator_id, date)
);

-- --------------------------------------------------------
-- 6. PAUSE EVENTS
-- --------------------------------------------------------
create table if not exists public.pause_events (
  id              uuid primary key default gen_random_uuid(),
  operator_id     uuid not null references public.profiles(id) on delete cascade,
  session_id      uuid references public.work_sessions(id),
  reason          text not null,
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  duration_seconds int generated always as (
    case when ended_at is not null
    then extract(epoch from (ended_at - started_at))::int
    else null end
  ) stored
);

-- --------------------------------------------------------
-- 7. CONTACT EVENTS (ligações e whatsapp)
-- --------------------------------------------------------
create table if not exists public.contact_events (
  id               uuid primary key default gen_random_uuid(),
  operator_id      uuid not null references public.profiles(id) on delete cascade,
  session_id       uuid references public.work_sessions(id),
  lead_name        text,
  lead_phone       text,
  contact_type     text not null check (contact_type in ('call','whatsapp')),
  outcome          text check (outcome in ('interessado','pensar','nao','sem_resposta','revisao')),
  started_at       timestamptz not null default now(),
  ended_at         timestamptz,
  duration_seconds int generated always as (
    case when ended_at is not null
    then extract(epoch from (ended_at - started_at))::int
    else null end
  ) stored
);

-- --------------------------------------------------------
-- 8. LEADS
-- --------------------------------------------------------
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  email       text,
  status      text not null default 'pending' check (status in ('pending','contacted','converted','inactive')),
  assigned_to uuid references public.profiles(id),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- --------------------------------------------------------
-- 9. APP CONFIG (configurações gerais)
-- --------------------------------------------------------
create table if not exists public.app_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.app_config (key, value) values
  ('company_name',   '"Funil de Vendas"'),
  ('pause_types',    '["Almoço","Café","Banheiro","Reunião","Treinamento","Médico"]'),
  ('work_hours',     '{"start":"08:00","end":"18:00"}')
on conflict do nothing;

-- --------------------------------------------------------
-- 10. ROW LEVEL SECURITY
-- --------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.goals              enable row level security;
alter table public.script_steps       enable row level security;
alter table public.operator_presence  enable row level security;
alter table public.work_sessions      enable row level security;
alter table public.pause_events       enable row level security;
alter table public.contact_events     enable row level security;
alter table public.leads              enable row level security;
alter table public.app_config         enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- PROFILES
create policy "users can read own profile"          on public.profiles for select using (auth.uid() = id);
create policy "admin can read all profiles"         on public.profiles for select using (public.is_admin());
create policy "admin can update all profiles"       on public.profiles for update using (public.is_admin());

-- GOALS — anyone auth can read; only admin writes
create policy "auth users read goals"               on public.goals for select using (auth.role() = 'authenticated');
create policy "admin write goals"                   on public.goals for all using (public.is_admin());

-- SCRIPT STEPS — anyone auth reads; only admin writes
create policy "auth users read script"              on public.script_steps for select using (auth.role() = 'authenticated');
create policy "admin write script"                  on public.script_steps for all using (public.is_admin());

-- OPERATOR PRESENCE — operators write own; admin reads all
create policy "operator manage own presence"        on public.operator_presence for all using (auth.uid() = operator_id);
create policy "admin read all presence"             on public.operator_presence for select using (public.is_admin());

-- WORK SESSIONS
create policy "operator manage own sessions"        on public.work_sessions for all using (auth.uid() = operator_id);
create policy "admin read all sessions"             on public.work_sessions for select using (public.is_admin());

-- PAUSE EVENTS
create policy "operator manage own pauses"          on public.pause_events for all using (auth.uid() = operator_id);
create policy "admin read all pauses"               on public.pause_events for select using (public.is_admin());

-- CONTACT EVENTS
create policy "operator manage own contacts"        on public.contact_events for all using (auth.uid() = operator_id);
create policy "admin read all contacts"             on public.contact_events for select using (public.is_admin());

-- LEADS
create policy "operator read assigned leads"        on public.leads for select using (auth.uid() = assigned_to or assigned_to is null);
create policy "operator update assigned leads"      on public.leads for update using (auth.uid() = assigned_to);
create policy "admin manage all leads"              on public.leads for all using (public.is_admin());

-- APP CONFIG — anyone auth reads; only admin writes
create policy "auth users read config"              on public.app_config for select using (auth.role() = 'authenticated');
create policy "admin write config"                  on public.app_config for all using (public.is_admin());

-- --------------------------------------------------------
-- 11. REALTIME — habilitar para presença
-- --------------------------------------------------------
alter publication supabase_realtime add table public.operator_presence;
alter publication supabase_realtime add table public.goals;
alter publication supabase_realtime add table public.script_steps;
