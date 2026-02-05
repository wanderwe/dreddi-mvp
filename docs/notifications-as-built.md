# Notifications v0 (as-built) — audit

> Scope: in-app notifications only (no email/SMS/push). This documents what exists **today**, how it works, and where it fails. It is not a redesign.

## TL;DR
- Notifications are stored in a `notifications` table with per-user dedupe, RLS for self access, and a per-promise state table used by cron jobs.
- Creation is split across API routes (invite create/accept/decline, complete/confirm/dispute) and a daily cron handler for reminders and follow-ups.
- Delivery is in-app only; `sendPush` is a stub and `delivered_at` is only set if push is enabled and not during quiet hours.
- Missing/broken triggers and control-flow guardrails (caps, quiet hours, accept status, cron secret) are likely reasons for “missing notifications.”

---

## 1) Entities & data model

### Tables
**`notifications`**
- Fields: `id`, `user_id`, `promise_id`, `type`, `title`, `body`, `cta_label`, `cta_url`, `priority`, `delivered_at`, `read_at`, `dedupe_key`, `created_at`.
- Constraints:
  - `notifications_type_valid` (current constraint includes: `invite`, `invite_followup`, `invite_declined`, `invite_ignored`, `due_soon`, `overdue`, `completion_waiting`, `completion_followup`, `dispute`).
  - `notifications_priority_valid`: `low`, `normal`, `high`, `critical`.
- Indexes:
  - `notifications_user_dedupe_key` unique on (`user_id`, `dedupe_key`).
  - `notifications_user_created_at` on (`user_id`, `created_at DESC`).
  - `notifications_user_unread` on (`user_id`, `read_at`) filtered by `read_at IS NULL`.
- RLS:
  - SELECT/UPDATE/INSERT policies are limited to `auth.uid() = user_id`.

**`promise_notification_state`**
- Per-promise state to track if/when notifications have fired:
  - `invite_notified_at`, `invite_followup_notified_at`
  - `due_soon_notified_at`
  - `overdue_notified_at`, `overdue_creator_notified_at`
  - `completion_cycle_id`, `completion_cycle_started_at`
  - `completion_notified_at`, `completion_followups_count`, `completion_followup_last_at`
- RLS is enabled, but there are no explicit policies (service role is used by server routes).

### Notification types (readable types)
- `invite`
- `invite_followup`
- `invite_declined`
- `invite_ignored`
- `due_soon`
- `overdue`
- `completion_waiting`
- `completion_followup`
- `dispute`

> Legacy types `N1–N7` are referenced in docs/migrations only and should no longer be produced.

### Idempotency / dedupe
- Application-level dedupe: `createNotification` checks for an existing row with the same `dedupe_key` + `user_id` and skips if found.
- Database-level dedupe: unique index on (`user_id`, `dedupe_key`) enforces it.

---

## 2) Notification lifecycle

### Creation sources
**A) API routes (synchronous)**
- Deal created: when a deal is created **and** a counterparty already exists in the system, a notification is created for the counterparty.
- Invite accepted/declined: notifications are created for the relevant creator/executor.
- Completion/confirmation/dispute: notifications are created on status transitions.

**B) Cron handler (`/api/notifications/cron`)**
- Runs periodic tasks:
  - Invite follow-ups (24h after initial invite notification).
  - “Invite ignored” (after N hours, default 72) + sets promise status to declined.
  - Due-soon reminders (within 24h of due date).
  - Overdue reminders (executor every 72h; creator once).
  - Completion follow-ups (24h/72h after completion if still awaiting confirmation).

### Read/unread
- Read state is stored as `read_at` timestamp.
- Notifications page and bell compute unread based on `read_at IS NULL`.
- Mark-as-read in UI does an update on the notification row.

### Queries & ordering
- Notifications page uses pagination via `.range()` ordered by `created_at DESC`.
- Notification bell counts unread via `count` query with `read_at IS NULL`.

### Delivery / push
- `createNotification` sets `delivered_at` if push is enabled and current time is not within quiet hours (or if notification is critical).
- `sendPush` is a stub (logs in non-production only); no actual delivery channel is implemented.

---

## 3) Trigger map (what notifies whom)

### Decision table (as-built)

| Trigger | Source | Preconditions | Recipient(s) | Type | CTA | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Deal created with existing counterparty | `POST /api/promises/create` | counterparty email matches existing profile | Counterparty user | `invite` | `/p/invite/:token` | Only fires if counterparty profile already exists. |
| Invite accepted | `POST /api/invite/[token]/accept` | token valid, counterparty accepts | Creator + executor | `invite_followup` | `/promises/:id` | Uses role-specific copy overrides for creator. |
| Invite declined | `POST /api/invite/[token]/decline` | token valid, invite not accepted | Creator | `invite_declined` | `/promises/:id` | Title/body provided from invite response copy. |
| Invite ignored (timeout) | `POST /api/notifications/cron` | invite pending > IGNORE_AFTER_HOURS (default 72) | Creator | `invite_ignored` | `/promises/:id` | Also marks promise as declined. |
| Invite follow-up | `POST /api/notifications/cron` | 24h after initial invite notification | Counterparty | `invite` | `/p/invite/:token` | Uses a special follow-up body. |
| Due soon | `POST /api/notifications/cron` | `due_at` within 24h; accepted | Executor | `due_soon` | `/promises/:id` | Requires reminders enabled. |
| Overdue (executor) | `POST /api/notifications/cron` | `due_at` past; accepted | Executor | `overdue` | `/promises/:id` | Every 72h. |
| Overdue (creator) | `POST /api/notifications/cron` | `due_at` past; accepted | Creator | `overdue` | `/promises/:id` | One-time. |
| Completed by promisor | `POST /api/promises/[id]/complete` | status `active`, accepted | Creator | `completion_waiting` | `/promises/:id/confirm` | Starts completion cycle in state table. |
| Completion follow-up 24h/72h | `POST /api/notifications/cron` | status `completed_by_promisor`; completion notified | Creator | `completion_waiting` | `/promises/:id/confirm` | Body varies by stage. |
| Completion confirmed | `POST /api/promises/[id]/confirm` | status `completed_by_promisor` | Executor | `completion_followup` | `/promises/:id` | Includes reputation delta in body. |
| Completion disputed | `POST /api/promises/[id]/dispute` | status `completed_by_promisor` | Executor | `dispute` | `/promises/:id` | Includes reputation delta in body. |

### Notes on missing triggers
- **Condition met** has no notification at all (API route updates `condition_met_at` only).
- **Public/private changes** have no notifications.
- **Deal created** with a counterparty email that does not map to an existing profile sends no notification.

---

## 4) UI behavior

### Where notifications appear
- **Header bell**: shows unread count and links to `/notifications`.
- **Notifications page**: list view with CTA per notification, read/unread badge, and pagination.

### Counts / filters
- Unread count uses `read_at IS NULL` for the logged-in user.
- Notifications page loads all types for that user (no filtering by type or priority).

### Localization / copy
- Primary copy is localized in `messages/en.json` and `messages/uk.json` for most types.
- Some types (invite decline/ignored) rely on server-provided copy because translation keys are missing.

### Empty/loading states
- Empty state: “No notifications yet”.
- Loading state: “Loading notifications…”.

### Mobile
- Notifications are reachable via the mobile menu link.

---

## 5) Failure modes & suspected bugs

> These are inferred from code paths and likely reasons for “missing notifications.”

### Creation / trigger gaps
- **Missing notification for condition-met**: marking condition met does not notify the executor.
- **Deal created with non-existing counterparty**: no notification is created (only when a matching profile exists).
- **Invite accepted flow**: notifications are created, but if `resolveExecutorId` returns `null` (due to unusual role allocations), the executor notification is skipped.

### Dedupe & caps blocking
- **Per-deal cap**: any non-critical notification is blocked if another notification for that promise was created in the last 24h.
- **Daily cap**: non-critical notifications are limited to 3 per 24h.
- **Unique dedupe keys**: accidental reuse of keys will silently skip creation.

### Cron / scheduling
- **Cron secret**: if `NOTIFICATIONS_CRON_SECRET` is configured but not supplied, cron will reject.
- **Cron not running**: no invite follow-ups, due-soon, overdue, or completion reminders will ever fire.
- **Ignored invite logic**: the cron updates promise status to `declined` and sends a notification only to the creator. If the cron is down, the invite never transitions.

### Delivery / UI
- **Push delivery is stubbed**: no actual push/email delivery exists; only in-app.
- **Missing translations**: invite decline/ignored types fall back to server-provided copy (fine), but the type still resolves to a “missing” translation key in UI.

### RLS / data access
- Notifications are protected by RLS and require `auth.uid() = user_id`. If the client uses the wrong supabase auth state, reads will fail or return empty.

---

## 6) Test coverage (current + additions)

### Existing tests
- Notification policy (quiet hours, caps, followup stage).
- Dedupe key builder.
- Invite response copy.

### New minimal tests added
- Invite accepted flow notification requests (creator + executor).
- Completion waiting notification request (cycle + CTA correctness).
- Completion outcome notifications (dispute type + delta).
- Unread count query uses `read_at IS NULL`.

---

## 7) Fix plan (prioritized)

### P0 — correctness for core promise flow
1) **Ensure accept/complete/confirm/dispute notifications always fire**
   - Validate `resolveExecutorId` for all role combinations (promisor/promisee/counterparty) and add guards/logging when null.
   - Add a fallback notification to creator if executor resolution fails (as an interim safeguard).
   - Owner: Backend. Effort: S.
2) **Add missing condition-met notification**
   - On condition-met, notify executor that confirmation is now unblocked.
   - Owner: Backend. Effort: S.
3) **Cron reliability**
   - Monitor cron invocations; log and alert on failures.
   - Ensure secret is set and correctly supplied by scheduler.
   - Owner: Infra/Backend. Effort: M.

### P1 — unread counts & UI reliability
1) **Improve client resilience on real-time channels**
   - Ensure subscription errors are logged and fallback polling is present if Realtime fails.
   - Owner: Frontend. Effort: M.
2) **Add missing translations for invite_declined / invite_ignored**
   - Provide UI translations in both locales so UI doesn’t depend on server copy for those types.
   - Owner: Frontend/Design. Effort: XS.

### P2 — quality & polish
1) **Notification grouping**
   - Group repeated overdue or completion follow-up notifications in UI.
2) **Notification archive / dismiss**
   - Allow dismissal or bulk mark-read.
3) **Admin diagnostics**
   - Add a dashboard page to inspect notification creation outcomes, caps, and skip reasons.

---

## 8) Sequence diagrams (ASCII)

### Invite flow
```
User creates deal (counterparty known)
  -> POST /api/promises/create
     -> createNotification(type=invite) to counterparty
     -> promise_notification_state.invite_notified_at

Counterparty accepts invite
  -> POST /api/invite/[token]/accept
     -> createNotification(type=invite_followup) to executor
     -> createNotification(type=invite_followup) to creator
```

### Completion flow
```
Executor marks complete
  -> POST /api/promises/[id]/complete
     -> status=completed_by_promisor
     -> state.completion_notified_at
     -> createNotification(type=completion_waiting) to creator

Creator confirms
  -> POST /api/promises/[id]/confirm
     -> status=confirmed
     -> createNotification(type=completion_followup) to executor

Creator disputes
  -> POST /api/promises/[id]/dispute
     -> status=disputed
     -> createNotification(type=dispute) to executor
```

---

## Appendix: Related files (non-exhaustive)
- `supabase/migrations/20250302120000_notifications.sql`
- `src/lib/notifications/service.ts`
- `src/lib/notifications/policy.ts`
- `src/app/api/promises/create/route.ts`
- `src/app/api/invite/[token]/accept/route.ts`
- `src/app/api/invite/[token]/decline/route.ts`
- `src/app/api/promises/[id]/complete/route.ts`
- `src/app/api/promises/[id]/confirm/route.ts`
- `src/app/api/promises/[id]/dispute/route.ts`
- `src/app/api/notifications/cron/route.ts`
- `src/app/components/NotificationBell.tsx`
- `src/app/notifications/NotificationsClient.tsx`
- `tests/notifications.test.ts`
