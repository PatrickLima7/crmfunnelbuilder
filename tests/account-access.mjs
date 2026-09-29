import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { transpileModule } from 'typescript';

async function handlerFor(file, client) {
  let handler;
  const source = (await readFile(new URL(file, import.meta.url), 'utf8')).replace(/^import .*;\r?\n/gm, '');
  const js = transpileModule(source, { compilerOptions: { target: 9, module: 99 } }).outputText;
  new Function('createClient', 'Deno', js)(() => client, {
    env: { get: () => 'test-only' }, serve: (fn) => { handler = fn; },
  });
  return handler;
}
let scenario = {};
let calls = [];
const id = '10000000-0000-0000-0000-000000000001';
const client = {
  rpc: async () => ({ data: scenario.allowed !== false, error: scenario.rateError ? {} : null }),
  auth: {
    getUser: async () => ({ data: { user: scenario.valid === false ? null : { id: 'caller' } }, error: null }),
    signInWithPassword: async (input) => {
      calls.push(['signIn', input]);
      return scenario.wrongPassword
        ? { data: {}, error: {} }
        : { data: { user: { id }, session: { access_token: 'access-test', refresh_token: 'refresh-test' } }, error: null };
    },
    admin: {
      createUser: async (input) => { calls.push(['create', input]); return { data: { user: { id } }, error: null }; },
      updateUserById: async (target, input) => { calls.push(['reset', target, input]); return { error: scenario.resetError ? {} : null }; },
      deleteUser: async (target) => { calls.push(['delete', target]); return { error: null }; },
      getUserById: async (target) => { calls.push(['lookupAuth', target]); return { data: { user: { email: 'private@example.test' } }, error: null }; },
    },
  },
  from: () => {
    let value, field, update;
    const result = async () => {
      if (update) return { data: { id }, error: scenario.editError ? { code: '23505' } : null };
      if (field === 'username') return { data: scenario.login ? (scenario.unknown ? null : { id, active: scenario.active !== false }) : (scenario.usernameTaken ? { id } : null), error: null };
      return value === 'caller'
        ? { data: { role: scenario.role ?? 'admin', active: scenario.active !== false }, error: null }
        : { data: { id, role: scenario.targetRole ?? 'operator' }, error: null };
    };
    const query = {
      select: () => query,
      eq: (key, val) => { field = key; value = val; return query; },
      update: (input) => { update = input; calls.push(['update', input]); return query; },
      single: result, maybeSingle: result,
    };
    return query;
  },
};
const management = await handlerFor('../supabase/functions/create-operator/index.ts', client);
const login = await handlerFor('../supabase/functions/login-username/index.ts', client);
const request = (body, token = true) => new Request('https://example.test', {
  method: 'POST', headers: token ? { Authorization: 'Bearer caller-test' } : {}, body: JSON.stringify(body),
});
const payload = { name: 'João Silva', goal: 150, password: 'Initial-Test!92', role: 'admin' };
async function manage(body = payload, options = {}, token = true) {
  scenario = options; calls = []; return management(request(body, token));
}
assert.equal((await manage(payload, {}, false)).status, 401);
assert.equal((await manage(payload, { role: 'operator' })).status, 403);
assert.equal(calls.length, 0);
assert.equal((await manage(payload, { active: false })).status, 403);
assert.equal((await manage({ ...payload, password: 'short' })).status, 400);
const created = await manage();
assert.equal(created.status, 201);
const account = await created.json();
assert.equal(account.username, 'joao.silva');
assert.equal(account.tempPassword, undefined, 'Never echo the chosen password');
assert.equal(calls[0][1].password, payload.password);
assert.match(calls[0][1].email, /@users\.crm\.invalid$/);
assert.equal(calls[1][1].role, 'operator', 'Ignore injected role');
assert.equal(calls[1][1].username, account.username);
assert.match((await (await manage(payload, { usernameTaken: true })).json()).username, /^joao\.silva\.[a-f0-9]{8}$/);
const reset = { action: 'reset-password', id, password: 'Replacement-Test!92' };
assert.equal((await manage(reset)).status, 200);
assert.deepEqual(calls[0], ['reset', id, { password: reset.password, email_confirm: true }]);
assert.equal((await manage(reset, { targetRole: 'admin' })).status, 403);
assert.equal(calls.length, 0);
assert.equal((await manage(reset, { resetError: true })).status, 400);
const edit = { action: 'edit', id, name: 'Ana', username: 'ana.silva', goal: 123 };
assert.equal((await manage(edit)).status, 200);
assert.equal(calls[0][1].username, 'ana.silva');
assert.equal((await manage(edit, { editError: true })).status, 400);
assert.equal((await manage({ ...edit, username: 'bad@name' })).status, 400);

async function signIn(options = {}, username = 'joao.silva') {
  scenario = { login: true, ...options }; calls = []; return login(request({ username, password: 'login-test' }, false));
}
assert.equal((await signIn({ allowed: false })).status, 429);
assert.equal(calls.length, 0);
assert.equal((await signIn({ rateError: true })).status, 503);
const unknown = await signIn({ unknown: true });
const disabled = await signIn({ active: false });
const wrong = await signIn({ wrongPassword: true });
assert.equal(unknown.status, 401); assert.equal(disabled.status, 401); assert.equal(wrong.status, 401);
assert.deepEqual(await unknown.json(), await wrong.json(), 'No account enumeration via error messages');
const signedIn = await signIn();
assert.equal(signedIn.status, 200);
assert.deepEqual(await signedIn.json(), { access_token: 'access-test', refresh_token: 'refresh-test' });
assert.equal(calls[1][1].email, 'private@example.test', 'Resolve existing Auth account, not a new account');
assert.equal(signedIn.headers.get('cache-control'), 'no-store');

// Logout must never discard the session before the transaction succeeds.
const shiftSource = (await readFile(new URL('../src/lib/shift-actions.ts', import.meta.url), 'utf8')).replace(/^import .*;\r?\n/gm, '');
const shiftJs = transpileModule(shiftSource, { compilerOptions: { target: 9, module: 99 } }).outputText.replace(/export /g, '');
let failClose = false;
const order = [];
const { closeShiftAndSignOut } = new Function('supabase', `${shiftJs}; return { closeShiftAndSignOut };`)({
  rpc: async () => { order.push('finish'); return { error: failClose ? {} : null }; },
  auth: { signOut: async () => { order.push('signOut'); return { error: null }; } },
});
await closeShiftAndSignOut(); assert.deepEqual(order, ['finish', 'signOut']);
order.length = 0; failClose = true;
await assert.rejects(closeShiftAndSignOut(), /sessão foi mantida/);
assert.deepEqual(order, ['finish']);
console.log('PASS: chosen passwords, admin-only reset/edit, username login, throttling, hidden email, preserved sessions and logout ordering.');
