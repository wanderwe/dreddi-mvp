# Expected notifications matrix (v0.1)

This matrix describes the in-app notifications expected for each promise transition, including timing (sync vs cron), suppression rules, and common reasons they might not appear.

## Legend
- **Sync**: created immediately by API route
- **Cron**: created by `/api/notifications/cron`
- **Roles**: creator (promise creator) vs executor (counterparty who must fulfill)

## Transition → notification expectations

| Transition / trigger | Roles notified | Type | CTA | Timing | Suppression rules | Why it might not appear |
| --- | --- | --- | --- | --- | --- | --- |
| Invite created | Executor (counterparty) | `invite` | `/p/invite/:token` | Sync (`POST /api/promises/create`) | Per-deal cap applies to `invite`; dedupe key `invite:{promiseId}` | Counterparty email not mapped to profile; dedupe hit; per-deal cap; DB insert error |
| Invite accepted | Executor + Creator | `invite_followup` | `/promises/:id` | Sync (`POST /api/invite/:token/accept`) | Daily cap bypass; dedupe key `invite_followup:{promiseId}:{role}` | Executor unresolved (logs `recipient_unresolved`); dedupe hit; DB insert error |
| Invite declined | Creator | `invite_declined` | `/promises/:id` | Sync (`POST /api/invite/:token/decline`) | Daily/per-deal cap bypass; dedupe key `invite_declined:{promiseId}` | Dedupe hit; DB insert error |
| Invite ignored (timeout) | Creator | `invite_ignored` | `/promises/:id` | Cron | Daily/per-deal cap bypass; dedupe key `invite_ignored:{promiseId}` | Cron not run; invite already accepted/declined; dedupe hit; DB insert error |
| Invite follow-up reminder | Executor | `invite` (followup) | `/p/invite/:token` | Cron (24h after `invite_notified_at`) | Per-deal cap applies to `invite`; dedupe key `invite:{promiseId}:followup` | Invite resolved; invite_notified_at missing; per-deal cap; dedupe hit; DB insert error |
| Mark complete | Creator | `completion_waiting` | `/promises/:id/confirm` | Sync (`POST /api/promises/:id/complete`) | Daily/per-deal cap bypass; dedupe key `completion_waiting:{promiseId}:{cycleId}:initial` | Executor mismatch; promise not accepted; dedupe hit; DB insert error |
| Completion follow-up 24h / 72h | Creator | `completion_waiting` | `/promises/:id/confirm` | Cron | Daily/per-deal cap bypass; dedupe key `completion_waiting:{promiseId}:{cycleId}:{completion24|completion72}` | Cron not run; completion cycle changed; dedupe hit; DB insert error |
| Confirm completion | Executor | `completion_followup` | `/promises/:id` | Sync (`POST /api/promises/:id/confirm`) | Daily/per-deal cap bypass; dedupe key `completion_followup:{promiseId}` | Executor unresolved; dedupe hit; DB insert error |
| Dispute completion | Executor | `dispute` | `/promises/:id` | Sync (`POST /api/promises/:id/dispute`) | Daily/per-deal cap bypass; dedupe key `dispute:{promiseId}` | Executor unresolved; dedupe hit; DB insert error |
| Due soon (within 24h) | Executor | `due_soon` | `/promises/:id` | Cron | Requires `deadline_reminders_enabled`; dedupe key `due_soon:{promiseId}` | Reminders disabled; cron not run; executor unresolved; dedupe hit; DB insert error |
| Overdue (executor repeat) | Executor | `overdue` | `/promises/:id` | Cron (every 72h) | Daily/per-deal cap bypass; dedupe key `overdue:{promiseId}:executor:{first|repeat}` | Cron not run; executor unresolved; dedupe hit; DB insert error |
| Overdue (creator once) | Creator | `overdue` | `/promises/:id` | Cron | Daily/per-deal cap bypass; dedupe key `overdue:{promiseId}:creator` | Cron not run; creator already notified; dedupe hit; DB insert error |

## Suppression rules (summary)
- **Dedupe**: identical `dedupe_key` already exists for the user.
- **Per-deal cap**: repeat same-type notifications for the same promise within 24h (applies to `invite`).
- **Daily cap**: only for non-bypass types (all v0.1 types are currently bypassed).
- **Deadline reminders disabled**: blocks `due_soon` when `deadline_reminders_enabled=false`.
- **Quiet hours**: does not block in-app rows; only defers push delivery.

## Known gaps
- **Condition met** updates do not emit notifications.
- **Public/private visibility changes** do not emit notifications.
- **Invite when no profile** (counterparty email not mapped to profile) does not notify anyone.
