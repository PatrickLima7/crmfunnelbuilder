import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transpileModule } from 'typescript';

// Execute the actual handler with a mocked Supabase boundary, never a real account.
let handler;
let calls;
let scenario;
const client = {
  auth: {
    getUser: async () => ({ data: { user: scenario.valid ? { id: 'admin-id' } : null }, error: null }),
    admin: {
      createUser: async (input) => { calls.push(['create', input]); return { data: { user: { id: 'new-id' } }, error: null }; },
      deleteUser: async (id) => { calls.push(['delete', id]); return { error: null }; },
    },
  },
  from: () => {
    let updating = false;
    const query = {
      select: () => query,
      eq: () => query,
      update: (input) => { updating = true; calls.push(['update', input]); return query; },
      single: async () => updating
        ? { data: scenario.failProfile ? null : { id: 'new-id' }, error: scenario.failProfile ? {} : null }
        : { data: { role: scenario.role, active: scenario.active }, error: null },
      maybeSingle: async () => ({ data: null, error: null }),
    };
    return query;
  },
};
const source = (await readFile(new URL('../supabase/functions/create-operator/index.ts', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?\n/, '');
const compiled = transpileModule(source, { compilerOptions: { target: 9, module: 99 } }).outputText;
new Function('createClient', 'Deno', compiled)(() => client, {
  env: { get: () => 'test-only' }, serve: (fn) => { handler = fn; },
});
async function invoke(overrides = {}, body = { email: 'person@example.test', name: 'Person', goal: 80 }, token = true) {
  calls = [];
  scenario = { valid: true, role: 'admin', active: true, ...overrides };
  return handler(new Request('https://example.test', {
    method: 'POST', headers: token ? { Authorization: 'Bearer test' } : {}, body: JSON.stringify(body),
  }));
}
assert.equal((await invoke({}, undefined, false)).status, 401);
assert.equal(calls.length, 0);
assert.equal((await invoke({ valid: false })).status, 401);
assert.equal((await invoke({ role: 'operator' })).status, 403);
assert.equal(calls.length, 0);
assert.equal((await invoke({ active: false })).status, 403);
assert.equal((await invoke({}, { email: 'invalid', name: 'Person', goal: -1 })).status, 400);
assert.equal(calls.length, 0);
const response = await invoke();
assert.equal(response.status, 201);
assert.equal(response.headers.get('Cache-Control'), 'no-store');
const data = await response.json();
assert.match(data.tempPassword, /^Crm![0-9a-f]{48}$/);
assert.equal(calls[0][1].password, data.tempPassword);
assert.equal(calls[1][1].role, 'operator');
assert.equal(calls[1][1].active, true);
assert.equal((await invoke({ failProfile: true })).status, 500);
assert.deepEqual(calls.at(-1), ['delete', 'new-id']);
console.log('PASS: operator provisioning authentication, admin authorization, validation, secure password and rollback.');

const csvSource = await readFile(new URL('../src/lib/csv.ts', import.meta.url), 'utf8');
const csvJs = transpileModule(csvSource, { compilerOptions: { target: 9, module: 99 } }).outputText;
const { csvCell } = await import(`data:text/javascript;base64,${Buffer.from(csvJs).toString('base64')}`);
assert.equal(csvCell('=HYPERLINK("https://example.test")'), '"\'=HYPERLINK(""https://example.test"")"');
assert.equal(csvCell('  +SUM(1,2)'), '"\'  +SUM(1,2)"');
assert.equal(csvCell('a;"b"\nc'), '"a;""b""\nc"');
assert.equal(csvCell(null), '""');
assert.equal(csvCell('José'), '"José"');
console.log('PASS: CSV escaping and spreadsheet formula injection.');
