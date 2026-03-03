# Invite & deal lifecycle audit (current + target)

## As-is before this change
- `promises.status` lifecycle is `active -> completed_by_promisor -> confirmed|disputed`, with invite-decline using `declined`. Invite flow is tracked separately via `promises.invite_status`.
- Invite statuses were `awaiting_acceptance | accepted | declined | ignored` on `promises`, while `deal_invites.status` used `pending | accepted | declined` and was not consistently updated after create.
- No invite-expiry scheduler existed. `/api/notifications/cron` only handles due/overdue reminders, not invite timeout.
- Notification dedupe uses `notifications.dedupe_key`; invite create uses `invite:{promiseId}:{counterpartyId}` and decline uses `invite_declined:{promiseId}`.

## Implemented behavior in this PR
- Canonical invite statuses now include: `awaiting_acceptance`, `accepted`, `declined`, `expired`, `cancelled_by_creator`.
- New `expires_at` + `cancelled_at` timestamps added on `promises` and `deal_invites`.
- Creator can withdraw pending invite with `POST /api/invites/:id/cancel` when `invite_status=awaiting_acceptance`.
- Expiry handled by `POST /api/invites/expire` (cron-friendly): marks pending invites as `expired` when `now() > expires_at` and notifies creator.
- Accept/decline now reject cancelled/expired invites and sync `deal_invites.status`.

## Truth table

| Event | Resulting statuses | Notifications | UI result |
|---|---|---|---|
| Creator creates deal invite | `promises.status=active`, `promises.invite_status=awaiting_acceptance`, `deal_invites.status=created`, `expires_at=created+72h` | Counterparty gets `invite` (`invite:{promiseId}:{counterpartyId}`) | Creator sees pending + share/withdraw actions; invitee sees Accept/Decline |
| Invite link opened, no action | No status change | None | Invite page remains `Awaiting acceptance` |
| Invite opened by non-registered user | No status change until auth + accept/decline | None | Prompt/login flow; state unchanged |
| Invite accepted | `promises.invite_status=accepted`, `counterparty_accepted_at/accepted_at` set, `deal_invites.status=accepted` | Creator gets `accepted` | Both sides see active accepted deal |
| Invite declined | `promises.invite_status=declined`, `promises.status=declined`, `declined_at` set, `deal_invites.status=declined` | Creator gets `invite_declined` | Both sides see declined/closed |
| Creator withdraws before acceptance | `promises.invite_status=cancelled_by_creator`, `cancelled_at` set, `deal_invites.status=cancelled_by_creator` | Counterparty gets one-time withdraw notice (`invite_cancelled:{promiseId}`) if account exists | Invite page shows withdrawn message; accept blocked forever |
| TTL reached without response | `promises.invite_status=expired`, `ignored_at` set, `deal_invites.status=expired` | Creator gets one-time expire notice (`invite_expired:{promiseId}`) | Creator and invite page show expired |
| Creator edits while pending | Existing behavior (not changed in this PR) | Existing notification behavior | Invite token remains valid unless withdrawn/expired |
