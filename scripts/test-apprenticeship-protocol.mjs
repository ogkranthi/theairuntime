import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startMission, submitDecision, visibleStep, decisionRecord, PHASES } from '../src/apprenticeship/protocol.ts';

const pack = JSON.parse(readFileSync(new URL('../docs/product/open-engineering-apprenticeship/mission-pack.v0.json', import.meta.url), 'utf8'));
const mission = pack.missions[0];
const transfer = pack.transferVariants[0];
let s = startMission(mission, transfer);
assert.equal(visibleStep(mission, transfer, s).phase, 'decide');
assert.deepEqual(visibleStep(mission, transfer, s).brief, mission.brief);
assert.ok(!JSON.stringify(visibleStep(mission, transfer, s)).includes('criticalErrors'));
assert.ok(!JSON.stringify(visibleStep(mission, transfer, s)).includes(transfer.brief));
assert.throws(() => submitDecision(mission, transfer, s, { expectedRevision: 0, phase: 'prove', answer: 'I would add a test for this.' }), /phase or revision/);
assert.throws(() => submitDecision(mission, transfer, s, { expectedRevision: 0, phase: 'decide', answer: 'short' }), /10–2000/);
for (const [index, phase] of PHASES.entries()) {
  const view = visibleStep(mission, transfer, s);
  assert.equal(view.phase, phase);
  if (phase === 'break') assert.match(view.simulatedTeammate.label, /FICTIONAL/);
  if (phase === 'transfer') {
    assert.equal(view.hintsAllowed, false);
    assert.match(view.brief, /document-sharing/);
    assert.throws(() => submitDecision(mission, transfer, s, { expectedRevision: index, phase, answer: 'Unassisted decision with specific verification.' }, true), /without coaching hints/);
  }
  const previous = s;
  s = submitDecision(mission, transfer, s, {
    expectedRevision: index, phase,
    answer: 'My decision for ' + phase + ' is to verify the authority boundary through a reproducible negative test.',
  }, phase === 'defend');
  assert.equal(previous.answers.length, index);
  assert.equal(s.revision, index + 1);
  assert.throws(() => submitDecision(mission, transfer, s, { expectedRevision: index, phase, answer: 'Replayed answer with no new permission.' }), /phase or revision|complete/);
}
assert.equal(visibleStep(mission, transfer, s).phase, 'complete');
const record = decisionRecord(mission, transfer, s);
assert.equal(record.verification, 'self-reported-not-independently-verified');
assert.equal(record.answers.length, 5);
assert.equal(record.answers[4].assisted, false);
assert.throws(() => decisionRecord(mission, transfer, startMission(mission, transfer)), /Complete the unassisted transfer/);
assert.throws(() => visibleStep(mission, { ...transfer, id: 'not-the-approved-variant' }, s), /authored transfer/);
console.log('Apprenticeship pure protocol assertions passed (no AI or Cloudflare calls).');
