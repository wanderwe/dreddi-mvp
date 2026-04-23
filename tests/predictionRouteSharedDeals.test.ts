import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSharedDealsOrFilter } from '@/app/api/promises/prediction/route';

test('shared-deals filter covers all role combinations', () => {
  const filter = buildSharedDealsOrFilter('user-1', 'user-2');

  const clauses = filter.split(',');
  assert.equal(clauses.length, 16);
  assert.ok(clauses.includes('and(creator_id.eq.user-1,creator_id.eq.user-2)'));
  assert.ok(clauses.includes('and(promisor_id.eq.user-1,promisee_id.eq.user-2)'));
  assert.ok(clauses.includes('and(promisee_id.eq.user-1,counterparty_id.eq.user-2)'));
  assert.ok(clauses.includes('and(counterparty_id.eq.user-1,promisor_id.eq.user-2)'));
});
