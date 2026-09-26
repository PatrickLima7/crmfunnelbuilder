import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transpileModule } from 'typescript';
const source = await readFile(new URL('../src/lib/lead-categories.ts', import.meta.url), 'utf8');
const js = transpileModule(source, { compilerOptions: { target: 9, module: 99 } }).outputText;
const { matchesLeadFilter: matches, crmDay, crmTime, crmDateTimeToIso, importedLeadStatus } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const now = new Date('2026-09-26T15:00:00Z'); // noon in São Paulo
const lead = { status: 'contacted', temperature: 'morno', callback_at: '2026-09-26T23:00:00Z' };
assert.equal(matches(lead, 'callbacks', now), true, 'later today still counts as pending');
assert.equal(matches(lead, 'morno', now), true, 'scheduled warm leads remain visible');
assert.equal(matches({ ...lead, callback_at: '2026-09-27T02:59:59Z' }, 'callbacks', now), true);
assert.equal(matches({ ...lead, callback_at: '2026-09-27T03:00:00Z' }, 'future', now), true);
assert.equal(matches({ ...lead, callback_at: '2026-09-25T20:00:00Z' }, 'callbacks', now), true);
assert.equal(matches({ ...lead, callback_at: null }, 'callbacks', now), false);
assert.equal(matches({ ...lead, callback_at: 'invalid' }, 'future', now), false);
assert.equal(crmDay(new Date('2026-09-27T02:00:00Z')), '2026-09-26');
assert.equal(crmDay(new Date('2026-10-01T02:00:00Z')), '2026-09-30');
assert.equal(crmDateTimeToIso('2026-09-26', '23:30'), '2026-09-27T02:30:00.000Z');
assert.equal(crmTime('2026-09-27T02:30:00Z'), '23:30');
assert.throws(() => crmDateTimeToIso('2026-02-30', '10:00'), /inválida/);
for (const status of ['converted', 'inactive', 'blacklisted']) {
  assert.equal(matches({ ...lead, status }, 'callbacks', now), false);
  assert.equal(matches({ ...lead, status }, 'morno', now), false);
  assert.equal(matches({ ...lead, status }, 'all', now), true);
}
assert.equal(matches({ ...lead, status: 'converted' }, 'converted', now), true);
assert.equal(matches({ ...lead, status: 'pending' }, 'novo', now), false);
assert.equal(matches({ ...lead, status: 'pending' }, 'morno', now), true);
assert.equal(matches({ ...lead, status: 'novo' }, 'novo', now), true);
assert.equal(matches({ ...lead, status: 'novo' }, 'morno', now), false);
assert.equal(importedLeadStatus(undefined), 'pending');
assert.equal(importedLeadStatus(false), 'pending');
assert.equal(importedLeadStatus(true), 'novo');
console.log('PASS: category membership, scheduled temperatures, São Paulo day boundaries, closed leads, explicit CSV priority.');
