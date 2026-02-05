# Expected notifications matrix (v0.2)

This matrix describes the in-app notifications expected for each promise transition, including timing (sync vs cron), suppression rules, and common reasons they might not appear.

## Legend
- **Sync**: created immediately by API route
- **Cron**: created by `/api/notifications/cron`
- **Roles**: creator (promise creator) vs executor (counterparty who must fulfill)

## Transition → notification expectations

| Transition / trigger | Roles notified | Type | CTA | Timing | Suppression rules | Why it might not appear |
| --- | --- | --- | --- | --- | --- | --- |
| Promise accepted | Creator only | `accepted` | `/promises/:id` | Sync (`POST /api/invite/:token/accept`) | Dedupe key `accepted:{promiseId}`; actor never notified | Creator is actor; dedupe hit; DB insert error |
| Executor marked completed | Reviewer (other side) | `marked_completed` | `/promises/:id/confirm` | Sync (`POST /api/promises/:id/complete`) | Dedupe key `marked_completed:{promiseId}`; actor never notified | Promise not accepted; actor is reviewer; dedupe hit; DB insert error |
| Reviewer confirmed | Executor (other side) | `confirmed` | `/promises/:id` | Sync (`POST /api/promises/:id/confirm`) | Dedupe key `confirmed:{promiseId}`; actor never notified | Promise not accepted; actor is executor; dedupe hit; DB insert error |
| Reviewer disputed | Executor (other side) | `disputed` | `/promises/:id` | Sync (`POST /api/promises/:id/dispute`) | Dedupe key `disputed:{promiseId}`; actor never notified | Promise not accepted; actor is executor; dedupe hit; DB insert error |
| Due soon (within 24h) | Executor | `reminder_due_24h` | `/promises/:id` | Cron | Requires `deadline_reminders_enabled`; dedupe key `reminder_due_24h:{promiseId}` | Reminders disabled; promise not accepted; cron not run; dedupe hit; DB insert error |
| Overdue (missed deadline, once) | Executor | `reminder_overdue` | `/promises/:id` | Cron | Requires `deadline_reminders_enabled`; dedupe key `reminder_overdue:{promiseId}` | Reminders disabled; promise not accepted; cron not run; already notified; dedupe hit; DB insert error |

## Suppression rules (summary)
- **Dedupe**: identical `dedupe_key` already exists for the user.
- **Per-deal cap**: repeat same-type notifications for the same promise within 24h (legacy types only).
- **Daily cap**: only for non-bypass types.
- **Deadline reminders disabled**: blocks `reminder_due_24h` and `reminder_overdue` when `deadline_reminders_enabled=false`.
- **Quiet hours**: does not block in-app rows; only defers push delivery.

## Known gaps
- **Condition met** updates do not emit notifications.
- **Public/private visibility changes** do not emit notifications.
- **Invite when no profile** (counterparty email not mapped to profile) does not notify anyone until acceptance.

## Manual test checklist (MVP)
1. Accept flow → creator receives `accepted` notification; acceptor receives nothing.
2. Mark completed → reviewer receives `marked_completed` notification; executor receives nothing.
3. Confirm/dispute → executor receives `confirmed` or `disputed` notification; reviewer receives nothing.
