import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Isolated PostgreSQL. No network, production credentials or real customer data.
const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.role() returns text language sql as $$ select current_user::text $$;
  grant usage on schema auth, public to authenticated, anon;
  grant execute on all functions in schema auth to authenticated, anon;
`);
for (const file of (await readdir(new URL('../supabase/migrations/', import.meta.url))).sort()) {
  const sql = await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8');
  // PGlite does not run the Supabase Realtime publication service.
  await db.exec(sql.replace(/^alter publication .*;$/gmi, ''));
}
await db.exec('grant select, insert, update, delete on all tables in schema public to authenticated;');
const ids = {
  admin: '00000000-0000-0000-0000-000000000001',
  operator: '00000000-0000-0000-0000-000000000002',
  other: '00000000-0000-0000-0000-000000000003',
  attacker: '00000000-0000-0000-0000-000000000004',
};
for (const [name, id] of Object.entries(ids)) {
  await db.query(`insert into auth.users values ($1, $2, '{"role":"admin","active":true}')`, [id, `${name}@example.test`]);
}
assert.deepEqual((await db.query('select distinct role, active from public.profiles')).rows, [{ role: 'operator', active: false }]);
await db.query(`update public.profiles set active = true where id <> $1`, [ids.attacker]);
await db.query(`update public.profiles set role = 'admin' where id = $1`, [ids.admin]);
await db.query(`insert into public.leads (name, assigned_to) values ('mine', $1), ('theirs', $2), ('unassigned', null)`, [ids.operator, ids.other]);
await db.query(`insert into public.expediente_logs (operator_id) values ($1), ($2)`, [ids.operator, ids.other]);
async function asUser(id, fn) {
  await db.exec('set role authenticated');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  try { await fn(); } finally { await db.exec('reset role'); }
}
await db.exec('set role anon');
await assert.rejects(db.query('select * from public.leads'), /permission denied/);
await assert.rejects(db.query("select * from public.distribute_leads_batch('{}')"), /permission denied/);
await db.exec('reset role');
await asUser(ids.operator, async () => {
  assert.deepEqual((await db.query('select name from public.leads')).rows, [{ name: 'mine' }]);
  assert.equal((await db.query('select * from public.expediente_logs')).rows.length, 1);
  await assert.rejects(db.query("select * from public.distribute_leads_batch('{}')"), /administradores/);
  assert.equal((await db.query("update public.profiles set role = 'admin' returning id")).rows.length, 0);
  await assert.rejects(db.query(`update public.leads set assigned_to = '${ids.other}'`), /row-level security/);
});
await asUser(ids.attacker, async () => {
  assert.equal((await db.query('select * from public.leads')).rows.length, 0);
  await assert.rejects(db.query(`insert into public.leads(name, assigned_to) values ('blocked', '${ids.attacker}')`), /row-level security/);
});
// Deleted profiles cannot be recreated by their former owner as an administrator.
await db.query('delete from public.profiles where id = $1', [ids.attacker]);
await asUser(ids.attacker, async () => {
  await assert.rejects(db.query(`insert into public.profiles(id,name,role) values ('${ids.attacker}', 'attacker', 'admin')`), /row-level security/);
});
await asUser(ids.admin, async () => {
  assert.equal((await db.query('select * from public.leads')).rows.length, 3);
  const result = await db.query('select * from public.distribute_leads_batch(array(select id from public.leads), true)');
  assert.equal(result.rows[0].total_updated, 1);
  assert.equal(result.rows[0].operator_count, 2);
});
await db.query('update public.profiles set active = false where id = $1', [ids.operator]);
await asUser(ids.operator, async () => {
  assert.equal((await db.query('select * from public.leads')).rows.length, 0);
  assert.equal((await db.query('select * from public.contact_events')).rows.length, 0);
});
await db.query('update public.profiles set active = false where id = $1', [ids.admin]);
await asUser(ids.admin, async () => {
  await assert.rejects(db.query("select * from public.distribute_leads_batch('{}')"), /administradores/);
});
// Existing CSV rows from the old UI must be repaired without changing opt-in imports.
await db.exec(`insert into public.leads(name, origin, status, historico) values
  ('legacy-csv', 'csv', 'novo', '[{"acao":"importacao_csv","detalhes":"Importado via CSV"}]'),
  ('explicit-csv', 'csv', 'novo', '[{"acao":"importacao_csv","detalhes":"Importado via CSV como novo lead"}]'),
  ('reregistered-csv', 'csv', 'novo', '[{"acao":"importacao_csv","detalhes":"Importado via CSV"},{"acao":"recadastro"}]'),
  ('plain-csv', 'csv', 'pending', '[]'),
  ('campaign-intake', 'instagram', 'pending', '[]'),
  ('manual-intake', 'manual', 'pending', '[]'),
  ('closed-import', 'csv', 'converted', '[{"acao":"importacao_csv","detalhes":"Importado via CSV"}]');`);
for (const file of ['018_security_hardening.sql', '019_lead_priority.sql', '019_lead_priority.sql']) {
  await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
}
const statuses = Object.fromEntries((await db.query("select name, status from public.leads")).rows.map((row) => [row.name, row.status]));
assert.equal(statuses['legacy-csv'], 'pending');
assert.equal(statuses['plain-csv'], 'pending');
assert.equal(statuses['explicit-csv'], 'novo');
assert.equal(statuses['reregistered-csv'], 'novo');
assert.equal(statuses['campaign-intake'], 'novo');
assert.equal(statuses['manual-intake'], 'novo');
assert.equal(statuses['closed-import'], 'converted');

// Username uniqueness and private login throttling.
await db.query('update public.profiles set active = true where id in ($1, $2)', [ids.admin, ids.operator]);
await db.query("update public.profiles set username = 'Ana.Silva' where id = $1", [ids.operator]);
assert.equal((await db.query('select username from public.profiles where id = $1', [ids.operator])).rows[0].username, 'ana.silva');
await assert.rejects(db.query("update public.profiles set username = 'ANA.SILVA' where id = $1", [ids.other]), /unique/);
await asUser(ids.operator, async () => {
  await assert.rejects(db.query("select public.consume_username_login_attempt(repeat('a',64))"), /permission denied/);
  await assert.rejects(db.query("select * from private.login_attempts"), /permission denied/);
  await assert.rejects(db.query("select public.admin_append_lead_note(gen_random_uuid(), 'bad')"), /restrito/);
});
await db.exec('set role service_role');
for (let i = 1; i <= 21; i++) {
  const response = await db.query("select public.consume_username_login_attempt(repeat('a',64)) as allowed");
  assert.equal(response.rows[0].allowed, i <= 20);
}
await db.exec('reset role');
const leadId = (await db.query("select id from public.leads where name = 'mine'")).rows[0].id;
await asUser(ids.admin, async () => {
  await db.query('select public.admin_append_lead_note($1, $2)', [leadId, 'Primeira orientaÃ§Ã£o']);
  await db.query('select public.admin_append_lead_note($1, $2)', [leadId, 'Segunda orientaÃ§Ã£o']);
});
const supervised = (await db.query('select notes, historico from public.leads where id = $1', [leadId])).rows[0];
assert.match(supervised.notes, /Primeira orientaÃ§Ã£o[\s\S]*Segunda orientaÃ§Ã£o/);
assert.equal(supervised.historico.at(-1).operador_id, ids.admin);

// Atomic logout closes own log, pause, session and presence; never another operator.
await db.query("insert into public.work_sessions(operator_id) values ($1), ($2)", [ids.operator, ids.other]);
await db.query("insert into public.pause_events(operator_id,reason,started_at) values ($1,'CafÃ©', now() - interval '2 minutes'),($2,'CafÃ©', now() - interval '2 minutes')", [ids.operator, ids.other]);
await db.query("insert into public.operator_presence(operator_id,state) values ($1,'pausa'),($2,'pausa')", [ids.operator, ids.other]);
await db.exec('set role anon');
await assert.rejects(db.query('select public.finish_own_shift()'), /permission denied/);
await db.exec('reset role');
await asUser(ids.operator, async () => {
  await db.query(`select public.finish_own_shift('{"contacts_count":7,"conversions_count":2}', true)`);
});
const closed = (await db.query('select * from public.expediente_logs where operator_id = $1', [ids.operator])).rows[0];
assert.ok(closed.ended_at);
assert.equal(closed.contacts_count, 7);
assert.equal(closed.conversions_count, 2);
assert.ok((await db.query('select ended_at from public.pause_events where operator_id = $1', [ids.operator])).rows[0].ended_at);
assert.ok((await db.query('select ended_at from public.work_sessions where operator_id = $1', [ids.operator])).rows[0].ended_at);
assert.equal((await db.query('select state from public.operator_presence where operator_id = $1', [ids.operator])).rows[0].state, 'offline');
assert.equal((await db.query('select ended_at from public.expediente_logs where operator_id = $1', [ids.other])).rows[0].ended_at, null);
assert.equal((await db.query('select ended_at from public.pause_events where operator_id = $1', [ids.other])).rows[0].ended_at, null);
await asUser(ids.operator, async () => { await db.query("select public.finish_own_shift('{}', true)"); });
assert.deepEqual((await db.query('select * from public.expediente_logs where operator_id = $1', [ids.operator])).rows[0], closed);
await db.exec(await readFile(new URL('../supabase/migrations/020_usernames_and_shift_logout.sql', import.meta.url), 'utf8'));
console.log('PASS: usernames, throttling, supervisor audit, atomic logout, isolation and repeatable closure.');

// Regression: creation stays restricted to an active consultant's own portfolio.
let owned;
await asUser(ids.operator, async () => {
  owned = (await db.query("insert into public.leads(name,assigned_to) values ('new-owned',$1) returning id", [ids.operator])).rows[0].id;
  await assert.rejects(db.query("insert into public.leads(name,assigned_to) values ('foreign',$1)", [ids.other]), /row-level security/);
  await assert.rejects(db.query("insert into public.leads(name) values ('unassigned-by-operator')"), /row-level security/);
});
await asUser(ids.admin, async () => {
  assert.equal((await db.query("insert into public.leads(name,assigned_to) values ('admin-create',$1) returning id", [ids.other])).rows.length, 1);
});
await asUser(ids.attacker, async () => {
  await assert.rejects(db.query("insert into public.leads(name,assigned_to) values ('inactive-create',$1)", [ids.attacker]), /row-level security/);
});
const call = (id, outcome, callback = null, type = 'call', target = owned) => db.query(
  "select public.finish_lead_call($1,$2,$3,now() - interval '1 minute',$4,null,null,$5)", [id,target,outcome,callback,type]);
const eventId = '00000000-0000-0000-0001-000000000001';
const callback = '2026-10-04T18:00:00Z';
await asUser(ids.operator, async () => {
  for (const outcome of ['interessado','pensar','retorno','desligou']) {
    await assert.rejects(call(eventId,outcome), /data e hora/);
    await assert.rejects(db.query("insert into public.contact_events(operator_id,contact_type,outcome) values ($1,'call',$2)", [ids.operator,outcome]), /contact_callback_required/);
  }
  await assert.rejects(call(eventId,'retorno',callback,'invalid'), /contact_type/);
});
assert.equal((await db.query('select status from public.leads where id=$1',[owned])).rows[0].status,'novo', 'event failure rolls back lead update');
assert.equal((await db.query('select count(*)::int as n from public.contact_events where id=$1',[eventId])).rows[0].n,0);
await asUser(ids.operator, async () => {
  await call(eventId,'retorno',callback);
  await call(eventId,'retorno',callback); // Retry must not count twice.
});
assert.equal((await db.query('select count(*)::int as n from public.contact_events where id=$1',[eventId])).rows[0].n,1);
assert.equal(new Date((await db.query('select callback_at from public.leads where id=$1',[owned])).rows[0].callback_at).toISOString(),new Date(callback).toISOString());
await asUser(ids.other, async () => { await assert.rejects(call('00000000-0000-0000-0001-000000000002','retorno',callback), /indisponível/); });
await asUser(ids.admin, async () => { await call('00000000-0000-0000-0001-000000000003','desligou',callback); });
await asUser(ids.operator, async () => {
  await call('00000000-0000-0000-0001-000000000004','convertido');
  await assert.rejects(db.query("update public.app_config set value='[]' where key='insight_messages' returning key").then(r => { if (!r.rows.length) throw Error('denied'); }), /denied|row-level/);
});
await db.exec(await readFile(new URL('../supabase/migrations/021_lead_registration_and_callbacks.sql', import.meta.url),'utf8'));
console.log('PASS: operator/admin lead creation, ownership, required callback, atomic save, retries, admin supervision and protected insights.');
if (process.argv[2]) {
  const bundle = await readFile(process.argv[2], 'utf8');
  await db.exec(bundle);
  await db.exec(bundle);
  console.log('PASS: delivered SQL bundle runs twice on an existing database.');
}
await db.close();
console.log('PASS: repeatable migrations, legacy CSV repair, explicit CSV opt-in, campaign/manual intake and preserved re-registration.');
console.log('PASS: all migrations; signup privilege escalation; anonymous access; operator isolation; profile recreation; admin distribution; inactive accounts.');
