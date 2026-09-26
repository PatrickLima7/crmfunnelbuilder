import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Isolated PostgreSQL. No network, production credentials or real customer data.
const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated;
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
if (process.argv[2]) {
  const bundle = await readFile(process.argv[2], 'utf8');
  await db.exec(bundle);
  await db.exec(bundle);
  console.log('PASS: delivered SQL bundle runs twice on an existing database.');
}
await db.close();
console.log('PASS: repeatable migrations, legacy CSV repair, explicit CSV opt-in, campaign/manual intake and preserved re-registration.');
console.log('PASS: all migrations; signup privilege escalation; anonymous access; operator isolation; profile recreation; admin distribution; inactive accounts.');
