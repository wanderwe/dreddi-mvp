# Notifications v0.1 verification report

> Scope: in-app notifications only (no email/SMS/push). This report focuses on verification and audit readiness after recent refactors.

## Trigger matrix (event → recipients → type → dedupeKey → CTA)

| Event | Recipients | Type | Dedupe key | CTA |
| --- | --- | --- | --- | --- |
| Invite created | Counterparty (executor) | `invite` | `invite:{promiseId}` | `/p/invite/:token` |
| Invite accepted | Executor + creator | `invite_followup` | `invite_followup:{promiseId}:{role}` | `/promises/:id` |
| Invite declined | Creator | `invite_declined` | `invite_declined:{promiseId}` | `/promises/:id` |
| Invite ignored (timeout) | Creator | `invite_ignored` | `invite_ignored:{promiseId}` | `/promises/:id` |
| Invite follow-up reminder | Counterparty (executor) | `invite` | `invite:{promiseId}:followup` | `/p/invite/:token` |
| Due soon (within 24h) | Executor | `due_soon` | `due_soon:{promiseId}` | `/promises/:id` |
| Overdue (executor) | Executor | `overdue` | `overdue:{promiseId}:executor:{first|repeat}` | `/promises/:id` |
| Overdue (creator) | Creator | `overdue` | `overdue:{promiseId}:creator` | `/promises/:id` |
| Marked complete | Creator | `completion_waiting` | `completion_waiting:{promiseId}:{cycleId}:initial` | `/promises/:id/confirm` |
| Completion follow-up 24h / 72h | Creator | `completion_waiting` | `completion_waiting:{promiseId}:{cycleId}:{completion24|completion72}` | `/promises/:id/confirm` |
| Confirmed | Executor | `completion_followup` | `completion_followup:{promiseId}` | `/promises/:id` |
| Disputed | Executor | `dispute` | `dispute:{promiseId}` | `/promises/:id` |

## Synchronous vs cron-driven

**Synchronous (API route triggers):**
- Invite created → `POST /api/promises/create`
- Invite accepted → `POST /api/invite/:token/accept`
- Invite declined → `POST /api/invite/:token/decline`
- Completion waiting → `POST /api/promises/:id/complete`
- Completion followup (confirmed) → `POST /api/promises/:id/confirm`
- Dispute → `POST /api/promises/:id/dispute`

**Cron-driven:**
- Invite follow-up reminder (24h)
- Invite ignored (timeout / auto-decline)
- Due soon (within 24h)
- Overdue executor (every 72h) / creator (once)
- Completion follow-ups (24h + 72h)

## Reminder timing rules (clarified)

- **Invite followup:** fires after 24h from `promise_notification_state.invite_notified_at`.
- **Invite ignored:** fires after `IGNORE_AFTER_HOURS` (default 72h) from `invited_at` (or `created_at`), and auto-declines the promise.
- **Due soon:** fires once when `due_at` is within the next 24h, only for accepted promises with reminders enabled.
- **Overdue:**
  - Executor: at most once every 72h (`overdue_notified_at`).
  - Creator: at most once total (`overdue_creator_notified_at`).
- **Completion follow-ups:** 24h and 72h after `completion_notified_at`, tied to `completion_cycle_id` (only the active cycle).

## Skip reasons and interpretation

When a notification is skipped, the service logs a single structured entry with context:
- **`dedupe`**: an identical `dedupe_key` already exists for the user.
- **`per_deal_cap`**: same-type notification for the same promise within 24h.
- **`daily_cap`**: user exceeded daily cap (only applies to non-bypass types).
- **`deadline_reminders_disabled`**: user opted out of deadline reminders (due soon).
- **`quiet_hours_defer`**: *not a skip*; push delivery is deferred but the in-app row is created.
- **`db_error`**: insert failed (see `dbError` in logs).

## Cap behavior (validated)

- **Daily cap:** currently bypassed for all in-scope reminder/critical types, including `invite` and `invite_followup`, to prevent missing reminders.
- **Per-deal cap:** bypassed for follow-ups, deadline reminders, and critical outcomes; still applies to initial invites to avoid rapid repeats.

## Known skip reasons (and how to interpret)

- **Unresolved recipient**: logged as `recipient_unresolved` when executor/counterparty IDs cannot be resolved.
- **Invite already resolved**: cron ignores pending-followup work once invite is accepted/declined/ignored.
- **Reminder toggles**: `deadline_reminders_disabled` blocks due-soon but does not affect other types.

## Gaps / missing triggers

- **Condition met** updates do not emit a notification.
- **Public/private visibility changes** do not emit notifications.
- **Deal created** with counterparty email that does not map to a profile does not notify anyone.

## Skipped verification (with reasons)

- **UI sanity checks** (bell count, list order, CTA navigation): not executed in this report because they require a running browser session and manual confirmation.
- **End-to-end delivery** (push): intentionally out-of-scope; push is stubbed.

## E2E verification status (DB + cron + UI)

Use the automated verification script and UI test when a running app + Supabase credentials are available:
- `node --require ./tests/register-ts.js scripts/verify-notifications-e2e.ts`
- `npm run test:ui`

### Scenario results (latest run)

| Scenario | Status | Notes |
| --- | --- | --- |
| S1 Invite created | FAIL (not run) | Run script to validate invite creation + quiet-hours delivered_at semantics. |
| S2 Invite accepted | FAIL (not run) | Run script to validate creator/executor followups. |
| S3 Invite declined | FAIL (not run) | Run script to validate creator decline notification. |
| S4 Mark complete | FAIL (not run) | Run script to validate completion waiting notification + CTA. |
| S5 Confirm | FAIL (not run) | Run script to validate completion followup + delta body. |
| S6 Dispute | FAIL (not run) | Run script to validate dispute notification + CTA. |
| S7 Cron due soon | FAIL (not run) | Run script to validate due soon notifications + reminders enabled. |
| S8 Cron overdue | FAIL (not run) | Run script to validate executor repeat + creator once. |
| S9 Cron invite ignored | FAIL (not run) | Run script to validate invite ignored + auto-decline. |
| S10 Cron completion followups | FAIL (not run) | Run script to validate 24h/72h followups tied to cycle. |
| UI sanity checks | FAIL (not run) | Run Playwright UI test to validate bell count, list order, CTA navigation, and read state. |

## What we might have missed

- Edge cases with multiple counterparty roles (promisor/promisee) that affect `resolveExecutorId`.
- RLS failures in environments with customized policies.
- Localization coverage for newly added copy (if any future type changes).
