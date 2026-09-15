import test from 'node:test';
import assert from 'node:assert/strict';
import { crossItemPhotoGroups, syncAuditTags } from './inventory-duplicate-candidates.mjs';
const duplicate = 'audit-duplicate-candidate';
const ignored = 'audit-ignore-duplicate-candidate';
const manual = 'audit-manual-duplicate-candidate';
const config = { [duplicate]: ignored };
test('shared secondary photos qualify despite different item metadata; repeats within one item do not', () => {
  const shared = { photos: [{ item_id: 'a', item_name: 'Vase', sort_order: 2 }, { item_id: 'b', item_name: 'Bowl', sort_order: 0 }] };
  assert.deepEqual(crossItemPhotoGroups([{ photos: [{ item_id: 'a' }, { item_id: 'a' }] }, shared]), [shared]);
});
test('cleared candidates stay suppressed when matching photos are rediscovered', () => {
  assert.deepEqual(syncAuditTags([ignored, 'blue'], [duplicate], config, true), [ignored, 'blue']);
});
test('manual flags survive a scan with no automatic matches', () => {
  assert.deepEqual(syncAuditTags([manual, duplicate], [], config, true), [duplicate, manual]);
});
test('duplicate-only synchronization preserves unrelated audit flags', () => {
  assert.deepEqual(syncAuditTags([duplicate, 'audit-bad-image'], [], config, true), ['audit-bad-image']);
});
