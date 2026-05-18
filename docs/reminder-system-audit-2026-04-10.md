# Dreddi reminder system audit (April 10, 2026)

## Scope
Audit target: end-to-end reminders/notifications pipeline for:
- pre-deadline reminders
- post-deadline reminders
- completion-review follow-up reminders
- invite timeout/ignored/expired flow

Checked layers:
- cron trigger + auth
- candidate selection logic
- notification row creation
- promise notification state updates
- dedupe/rate limits
- email sending eligibility and provider dependency
- in-app delivery/read path
- env var dependencies
- status/date filters and timezone handling

---

## A) Reminder matrix (actual current behavior)

| Type | Exists? | Intended trigger | Actual trigger in code | Recipients | In-app | Email | Repeat cadence | Status |
|---|---|---|---|---|---|---|---|---|
| **Due soon (pre-deadline)** | Yes | ~24h before due | In `/api/notifications/cron`: `status=active`, `due_at >= now`, `due_at <= now+24h`, accepted deal only. One state flag `due_soon_notified_at` used to block re-send. | **Executor only** (not creator). | Yes (`notifications` insert + realtime/polling UI read path). | **Maybe**: only if `email_notifications_enabled=true`, email provider configured, and type eligible. | One-time per deal/user in practice. | **Partially working** (exists, but recipient scope is one-sided and dedupe key collides with overdue). |
| **Overdue (post-deadline)** | Yes | after deadline passes, likely repeat | In cron: `status=active`, `due_at <= now`, accepted deal only. No interval check (e.g. 72h) and no state-gated repeat logic. Deduped by the same key family used by due-soon (`reminder_deadline:<promise>:<user>`). | **Executor only** (not creator despite old `overdue_creator_notified_at` field). | Yes (same path as above). | Maybe (same provider/settings gates as above). | **Not true repeat**: after first send, future sends are blocked by dedupe key; if due-soon already sent, overdue can be blocked entirely. | **Broken/partially working** (fires once at most; 72h repeat not implemented). |
| **Completion review follow-up (after marked completed)** | Initial notification exists, follow-ups do not | expected 24h + 72h follow-ups | On `/api/promises/[id]/complete`, app writes `completion_notified_at` state and dispatches `marked_completed` once to counterparty. No cron code reads `completion_notified_at`/`completion_followups_count`; no scheduler dispatches `completion_waiting` or `completion_followup`. | Counterparty for initial mark-complete notification only. | Initial yes; follow-ups no (not generated). | Initial yes (`marked_completed` email-eligible); follow-up types are mostly not dispatched. | No follow-up cadence implemented. | **Implemented but not connected** for follow-ups (only first notification exists). |
| **Invite ignored / expired** | Yes | auto-expire ignored invites | In cron: active + `invite_status=awaiting_acceptance` + not accepted + `ignored_at is null` + `expires_at <= now` (with `inviteIgnoreMinutes` override for test/manual runs). Then updates promise to `status=declined`, `invite_status=expired`, sets `ignored_at`; creates `invite_ignored` notification for creator. | Creator only. | Yes. | No by design (`invite_ignored` not email-eligible). | One-time due to terminal status + state. | **Working** (subject to cron actually running). |

### Important cross-cutting behavior
- Due-soon and overdue notifications are normalized to the same type (`reminder_deadline`) and use the same dedupe key pattern, causing cross-type suppression.
- Email sending is not guaranteed even when notification row is created (provider/config/profile gates).

---

## B) Code locations

### Cron trigger/auth + reminder processing
- `src/app/api/notifications/cron/route.ts`
  - Auth via `CRON_SECRET` or `NOTIFICATIONS_CRON_SECRET`
  - Due-soon candidate fetch (next 24h)
  - Overdue candidate fetch (`due_at <= now`)
  - Invite-ignored candidate fetch + expiry transition

### Notification recipient/type/dedupe mapping
- `src/lib/notifications/recipients.ts`
  - `reminder_due_24h` and `deadline_passed` both target executor
  - both map to notification type `reminder_deadline`
  - both share dedupe key family `reminder_deadline:<promiseId>:<recipientId>`

### Notification creation + in-app insertion + caps
- `src/lib/notifications/service.ts`
  - user settings fetch (`push/email/deadline_reminders`)
  - dedupe by `notifications(user_id,dedupe_key)` check
  - per-deal and daily cap checks
  - insert into `notifications` table
  - push stub (non-production)

### Email sending
- `src/lib/notifications/email.ts`
  - email-eligible types allowlist
  - dedupe in `notification_email_sends`
  - provider resolution (`RESEND_API_KEY` required)
  - logging into `notification_email_sends` and notification attempt columns

### Completion mark state + initial notify
- `src/app/api/promises/[id]/complete/route.ts`
  - sets `completed_by_promisor`
  - upserts completion tracking fields in `promise_notification_state`
  - dispatches only `marked_completed`

### In-app delivery/read path
- `src/app/notifications/NotificationsClient.tsx`
  - reads from `notifications` table
  - subscribes to insert/update realtime channel
  - periodic polling and read-state updates

### Schema/state fields
- `supabase/migrations/20250302120000_notifications.sql`
- `supabase/migrations/20260324120000_promise_notification_invite_ignored_state.sql`

---

## C) Cron verification

### Is cron callable?
- Route exists (`GET` and `POST`) at `/api/notifications/cron`.
- README documents external scheduler (cron-job.org) with 15-minute cadence.

### Is auth working?
- Cron requires `Authorization: Bearer <secret>`.
- Secret source: `CRON_SECRET` fallback `NOTIFICATIONS_CRON_SECRET`.
- Missing secret returns 500 `cron_secret_missing`; wrong/missing bearer returns 401 `unauthorized`.

### What runs on hit?
- Candidate scans: due-soon, overdue, invite-ignored.
- For deadline reminders: dispatch event -> create notification -> optional email -> upsert per-promise state.
- For invite ignored: update promise status + state + creator notification.

---

## D) Test evidence executed in this audit run

Environment limitations blocked full live end-to-end execution (no Supabase/email secrets in runtime):
- Missing: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`/`NOTIFICATIONS_CRON_SECRET`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`.

Commands run:
1. `npm test`
   - Failed early because dependencies are not installed (`typescript` missing in environment).
2. `npm ci`
   - Failed due to network/package policy (403 on npm registry), so tests cannot be installed/executed here.
3. Static audit commands (`rg`, `sed`) over API/lib/migrations/readme files
   - Succeeded and used as primary evidence for current code-path behavior.

Because of these constraints, no live DB row creation/cron execution/UI screenshot evidence could be produced in this container run.

---

## E) Root causes for gaps / suspicious behavior

1. **Overdue repeat cadence not implemented**
   - No 72h interval logic in cron for overdue reminders.
   - `overdue_notified_at` is written but never used to schedule repeats.

2. **Due-soon vs overdue dedupe collision**
   - Both events normalize to same type + same dedupe key family, so one can suppress the other.

3. **Creator overdue notifications not implemented in active logic**
   - `overdue_creator_notified_at` exists in state schema but no active dispatch path sends creator overdue reminders.

4. **Completion follow-ups (24h/72h) are not wired**
   - State fields and copy/policy helpers exist, but cron never processes them.
   - Only initial `marked_completed` notification is actually dispatched.

5. **Invite ignore cutoff uses `created_at`**
   - Cron filter uses `created_at <= cutoff`; if `invited_at` differs materially, behavior may not match product expectation of “time since invite”.

6. **Email delivery is configuration-dependent**
   - Even when notification rows are created, email may be skipped without `RESEND_API_KEY`, with user opt-out, or with missing recipient email.

---

## F) Minimal fixes applied

- **None**. This run kept product behavior unchanged (audit-only).

---

## G) Final conclusion

### What currently works
- Cron endpoint logic exists with auth.
- Due-soon and overdue candidate scans exist.
- Invite ignored/expired transition + creator in-app notification exists.
- Notification insertion and in-app listing/subscription path exists.

### What does not work as expected
- Overdue reminders are not repeating every ~72h.
- Completion review follow-up reminders (24h/72h) are not implemented end-to-end.
- Due-soon and overdue share dedupe/type path that can suppress expected overdue delivery.

### What is unreliable / environment dependent
- Email for reminders depends on provider/env/profile settings and can silently skip while in-app is still created.
- Real end-to-end confidence (cron scheduler actually invoking endpoint in production cadence) requires production logs/DB evidence, not available in this container.

### What is missing
- Explicit completion follow-up scheduler logic.
- Distinct dedupe/type strategy for due-soon vs overdue cadence.
- Explicit overdue repeat cadence controls using state timestamps.
