# Reputation scoring decision table (AS-IS)

## A) AS-IS rules summary (short)

- Reputation is awarded only when a promise is finalized by the counterparty: `completed_by_promisor → confirmed` or `completed_by_promisor → disputed`.
- The executor (resolved via `resolveExecutorId`) is the only user whose reputation changes; the counterparty does not receive reputation changes.
- Confirmed outcomes add +4 if completed on or before due date, otherwise +3.
- Disputed outcomes subtract -7 if completion was late, otherwise -6.
- Marking a promise as completed by the executor and invite acceptance do **not** change reputation.

## B) AS-IS decision table (truth table)

| Event | Actor | Preconditions | Status transition | Reputation delta | Timing notes |
| --- | --- | --- | --- | --- | --- |
| Deal accepted/confirmed (invite acceptance) | Counterparty | Counterparty accepts invite / counterparty is set | `active` (no change) | **No reputation change** | No reputation logic runs on acceptance. |
| Executor marks completed | Executor | Counterparty has accepted; status is `active` | `active → completed_by_promisor` | **No reputation change** | Only `completed_at` is set. |
| Counterparty confirms completion | Counterparty | Status is `completed_by_promisor` | `completed_by_promisor → confirmed` | **Executor:** +4 if `completed_at ≤ due_at`, else +3 | If no due date or `completed_at` missing, treated as “not on time” (+3). |
| Counterparty disputes completion | Counterparty | Status is `completed_by_promisor` | `completed_by_promisor → disputed` | **Executor:** -7 if `completed_at > due_at`, else -6 | If no due date or `completed_at` missing, treated as “not late” (-6). |
| Dispute resolution | N/A | No explicit resolution flow in code | N/A | **No reputation change** | No separate dispute-resolution reputation logic exists. |

## C) Evidence pointers (code + SQL)

- Finalization routes (counterparty actions):
  - Confirm: `src/app/api/promises/[id]/confirm/route.ts` → sets status to `confirmed` then calls `applyReputationForPromiseFinalization`.
  - Dispute: `src/app/api/promises/[id]/dispute/route.ts` → sets status to `disputed` then calls `applyReputationForPromiseFinalization`.
- Completion route (executor action):
  - `src/app/api/promises/[id]/complete/route.ts` → sets `completed_by_promisor` but has **no** reputation updates.
- Reputation computation:
  - `src/lib/reputation/applyReputation.ts` → only emits events for `confirmed` or `disputed`, assigns them to the executor, and updates `user_reputation`.
  - `src/lib/reputation/calcScoreImpact.ts` → confirmed = +4 on-time / +3 late-or-unknown, disputed = -7 late / -6 otherwise.
- Optional backfill SQL (matches runtime scoring):
  - `supabase/migrations/20241106120000_reputation_backfill.sql` → uses `confirmed`/`disputed` with the same on-time/late logic.

## D) Align docs vs align code

- **Current recommendation:** Align docs to code (this document). There is no mismatch between server logic and this decision table.
- If product intent differs (e.g., award reputation on acceptance or on executor completion), the smallest change is to add new reputation events in the acceptance/completion routes and update scoring/aggregation accordingly.
