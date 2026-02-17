# Product Activation & Return Loop Audit (Dreddi Knows)

## 1) Core Loop Map (as built)

### Entry points
- Landing (`/`) drives account creation and deal creation intent, but has no “pending actions” loop surface after signup.
- Create deal (`POST /api/promises/create`) creates `status=active` + `invite_status=awaiting_acceptance`; no synchronous invite notification is emitted there.
- Public profile (`/u/[handle]`) shows confirmed/disputed outcomes only.
- Invite link (`/p/invite/[token]`) is the acceptance gateway.
- Notifications page (`/notifications`) is a separate destination, not an always-visible action queue.

### Primary actions
1. Create deal → invite link generated.
2. Invite open/accept/decline through token endpoints.
3. Executor marks complete.
4. Reviewer confirms/disputes.
5. Reminder can be sent when a side is waiting on the other.

### Return triggers
- In-app notifications created by API transitions (`accept`, `complete`, `confirm`, `dispute`) and cron (`due_soon`, `overdue`).
- Notifications feed realtime + polling (30s) when tab is visible; refresh on visibility restore.
- Manual reminders now trigger email + in-app nudge to the side that must act next.

### Where the loop currently dies (with code evidence)
- **Create→invite dead zone:** `POST /api/promises/create` does not notify anyone when invite link is generated, so creator has no immediate “invite sent / pending” feedback loop.
- **Invite decline silence (fixed in this patch):** decline path previously updated status only; creator got no event to return.
- **Pending confirmation can stale:** no periodic follow-up for `completed_by_promisor`; only initial event on mark-complete.
- **Notifications as destination, not ambient surface:** “awaiting your action” is present in list filters, but there is no global inbox/badge-driven home funnel.

---

## 2) State Machine Table

| State | Who can trigger transition | Trigger/action | Preconditions | Side-effects | Notifications expected | UI surfaces (where shown) | Exit conditions |
|---|---|---|---|---|---|---|---|
| `active` + `invite_status=awaiting_acceptance` (draft/created/invited equivalent) | Creator | Create deal | Auth user, title + counterparty contact | Inserts promise, invite token, invited timestamps | **Not implemented on create** | `/promises`, invite page | Accept / decline / ignored / manual cancel (not implemented) |
| `invite_status=accepted` + `status=active` | Counterparty (non-creator) | Accept invite link | Valid token, not creator, not already resolved | Sets counterparty and accepted timestamps, binds promisor/promisee if needed | `accepted` to creator only | Invite page, deals list | Mark complete |
| `status=active` (accepted) | Executor | Mark complete | Deal accepted + executor identity | Sets `completed_by_promisor`, stamps completion, resets dispute fields | `marked_completed` to opposite side only | Deals list, detail | Confirm / dispute |
| `status=completed_by_promisor` (completed_pending_confirmation) | Reviewer | Confirm | Accepted + condition met (if required) | Sets `confirmed`, reputation update | `confirmed` to executor only | Deals list/detail, confirm page | Final |
| `status=completed_by_promisor` | Reviewer | Dispute | Accepted + condition met (if required) | Sets `disputed` + code/reason, reputation update | `disputed` to executor only | Deals list/detail, dispute modal | Final |
| `status=confirmed` | N/A | Terminal | N/A | Reputation already applied | None after finalization | Public profile aggregates + deal detail | None |
| `status=disputed` | N/A | Terminal | N/A | Reputation already applied | None after finalization | Public profile aggregates + deal detail | None |
| `invite_status=declined` + `status=declined` | Counterparty | Decline invite | Valid token, not accepted already | Sets decline timestamps and status | `invite_declined` to creator (implemented in this patch) | Invite page, deals list | Re-create new deal |
| `invite_status=ignored` | Cron/manual semantics only | Not consistently implemented | Time-based follow-up logic absent in cron | No canonical expiry transition | **Implied in UI/copy; mostly not implemented as transition** | Invite status labels | N/A |
| `cancelled` / `expired` / `rejected` | — | — | — | — | **Not implemented** (UI wording implies “rejected/ignored” variants) | Copy only | N/A |

---

## 3) Notifications audit

### A) Inventory (creation/emission points)

| Event source | Recipient(s) | Type | dedupeKey | CTA | Rendered where |
|---|---|---|---|---|---|
| Invite accepted (`/api/invite/[token]/accept`) | Creator | `accepted` | `accepted:{promiseId}` | `/promises/{id}` | Notifications page + bell |
| Invite declined (`/api/invite/[token]/decline`) | Creator | `invite_declined` | `invite_declined:{promiseId}` | `/promises/{id}` | Notifications page + bell |
| Mark complete (`/api/promises/[id]/complete`) | Counterparty/reviewer | `marked_completed` | `marked_completed:{promiseId}` | `/promises/{id}/confirm` | Notifications page + bell |
| Confirm (`/api/promises/[id]/confirm`) | Executor | `confirmed` | `confirmed:{promiseId}` | `/promises/{id}` | Notifications page + bell |
| Dispute (`/api/promises/[id]/dispute`) | Executor (party who marked done) | `disputed` | `disputed:{promiseId}` | `/promises/{id}` | Notifications page + bell |
| Cron due soon | Executor | `reminder_due_24h` | `reminder_due_24h:{promiseId}` | `/promises/{id}` | Notifications page + bell |
| Cron overdue | Executor | `reminder_overdue` | `reminder_overdue:{promiseId}` | `/promises/{id}` | Notifications page + bell |
| Manual reminder (`/api/promises/[id]/reminder`) | Next actor only | `reminder_overdue` (active) / `marked_completed` (pending confirm) + email | `manual_reminder:{dealId}:{dayBucket}` | deal or confirm URL | Notifications page + email |

Recipient logic rule in code is now: **after acceptance, notify opposite side only** (actor excluded). Dispute path resolves to executor recipient, which is the “marked done” party.

### B) Delivery mechanics
- Arrival path is **hybrid**: Supabase realtime subscription + polling fallback.
- Patch chooses **robust polling** improvements (not realtime redesign): poll every 30s only while tab visible + force refresh on visibility regain.
- Why this is minimum-risk: avoids publication/auth RLS migration risk while preventing stale feeds on hidden tabs.

### C) Correctness rules status
- No state-change notifications before acceptance (except invite response/reminder): **implemented** via recipient guard (`event !== accepted && !isPromiseAccepted → []`).
- After acceptance, notify opposite party only: **implemented** by recipient resolver + actor exclusion.
- Dispute notifies party who marked done: **implemented** (`disputed` recipient resolves to executor).

### D) LIVE validation checklist (two accounts)
1. A creates deal for B; copy invite link.
2. B accepts from invite page; verify A gets `accepted` notification.
3. A marks complete; verify B gets `marked_completed` with confirm CTA.
4. B disputes; verify A gets `disputed` notification and CTA opens deal.
5. Create second deal; B declines invite; verify A gets `invite_declined`.
6. For active accepted deal, waiting reviewer sends reminder; verify executor receives email + in-app reminder.
7. For `completed_by_promisor`, waiting executor sends reminder; verify reviewer receives confirm/dispute CTA reminder.
8. Keep notifications tab hidden for >30s, trigger event, return tab; verify auto-refresh catches missed row.

---

## 4) Deal lifecycle audit

### Invite semantics (today)
- “Invited” means **invite token generated and deal awaiting acceptance**; it does **not** prove any specific person opened the link.
- Identity is only bound at accept/decline when authenticated actor is validated.
- If never accepted: currently remains pending unless explicitly declined; no robust auto-expire lifecycle.

### Reject/decline behavior
- `declined` exists in DB status enum and invite status flow.
- Triggered only by invite decline endpoint.
- UI has declined labels; notifications were missing before and are now emitted to creator.

### Completion flow
- Mark complete → confirm/dispute is enforced with role + state + acceptance checks.
- Stale `completed_by_promisor` handling gap: no background reminder cadence to reviewer; only manual reminders currently prevent deadlock.

---

## 5) Reminders audit

### Current feature
- Endpoints: `/api/promises/[id]/reminder` and `/api/promises/reminders/summary`.
- UI: `PromisesClient` “🔔 Remind” button + count/last sent info.
- Runtime crash note (“rows before initialization”) is not present in current summary route; current implementation initializes and iterates safely.

### Delivery decision (MVP now)
- **Chosen channel: email reminder + in-app notification** to the next actor (single robust path using existing infra).

### Policy
- Rate limit per deal: 1 per 24h (existing DB query guard).
- Last reminded timestamp and count are shown in list UI from summary endpoint.

---

## 6) Return Loop Surface audit

- `/promises` already computes counters: total, awaiting your action, awaiting others.
- Biggest gap is entry prominence: notifications and action-required queue are not surfaced on landing/home after login as primary “come back now” unit.
- Public profile correctly restricts to confirmed/disputed outcomes and should not be treated as urgent action surface.

---

## 7) Top 10 activation blockers (ranked)

1. **Users create deal but counterparty gets no immediate in-app invite ping** → `src/app/api/promises/create/route.ts::POST` has no notification emit → add invite-created notification to known counterparty IDs → validate by creating deal with existing user email and checking recipient feed.
2. **Declines looked like silence** → `src/app/api/invite/[token]/decline/route.ts::POST` previously wrote status only → now emits `invite_declined` to creator → validate decline scenario with two accounts.
3. **Reminder targeted wrong side in some flows** → `src/app/api/promises/[id]/reminder/route.ts::POST` hard-coded receiver as executor → now routes by “who must act next” for `active` and `completed_by_promisor` → validate both states.
4. **Pending confirmation can stall forever** → no cron for `completed_by_promisor` follow-up → add low-frequency follow-up job for reviewer reminders → validate by forcing stale record and running cron.
5. **No canonical expiry/cancel policy for never-accepted invites** → invite remains pending indefinitely → add auto-expire timestamp + transition policy or clear UI copy → validate via seeded old invites.
6. **Notifications are page-centric, not task-centric** → action queue not globally visible → add “Awaiting your action” module on authenticated home/dashboard → validate CTR from module.
7. **Realtime reliability opaque** → no explicit diagnostics/health indicator for subscription state → add client debug logging + telemetry around channel state → validate via logs.
8. **Invite identity ambiguity before acceptance** → link open is unauthenticated signal only → ensure analytics/UI never treat open as participant confirmation → validate by opening link logged out.
9. **Manual reminder dedupe is day-bucketed but not actor-aware** → repeated reminders by different actor sides can collide on same day bucket after role swap → include sender role in dedupe key if needed → validate by reminders in both phases same day.
10. **No explicit “next action owner” column in DB** → logic duplicated in clients/routes → derive/store server-side helper view or function to reduce drift → validate by comparing UI badges with server result set.

---

## 8) Minimal Fix Plan (7-day MVP loop)

### Fix 1 — Invite response loop closure
- **Scope:** keep creator informed when invite is declined (implemented) and add invite-created notification when counterparty is known.
- **Acceptance criteria:** creator sees invite-created and invite-declined events; no self-notifications.
- **Test steps:** create+decline flows with two users, verify notification rows and CTAs.

### Fix 2 — Reminder correctness (implemented)
- **Scope:** reminders allowed for `active` and `completed_by_promisor`; recipient is always next actor.
- **Acceptance criteria:** sender must be waiting party; receiver always opposite side with required action.
- **Test steps:** run both lifecycle phases and assert receiver IDs + rate-limit behavior.

### Fix 3 — Notification freshness hardening (implemented)
- **Scope:** visibility-aware polling + refresh-on-focus on notifications feed.
- **Acceptance criteria:** feed catches missed notifications within 30s visible, and immediately on tab return.
- **Test steps:** hide tab, trigger notification, show tab, verify list updates without manual refresh.

### Fix 4 — Stale pending confirmation nudges
- **Scope:** add cron follow-up for long-lived `completed_by_promisor` deals (24h cadence, capped).
- **Acceptance criteria:** reviewer receives follow-up until confirm/dispute or cap reached.
- **Test steps:** seed stale deals, invoke cron, verify notification creation and stop conditions.

### Fix 5 — Pending invite expiry policy
- **Scope:** define and implement minimal expiry (`invite_status=ignored` after N days) or remove ignored semantics from UI copy.
- **Acceptance criteria:** no perpetual pending invites with misleading status.
- **Test steps:** backdate invite, run cron/policy job, verify transition + creator notification.
