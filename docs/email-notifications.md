# Email notifications v1

Provider: **Resend** transactional email API.

## Required environment variables

- `NEXT_PUBLIC_APP_URL` – absolute app URL used for CTA/manage links.
- `RESEND_API_KEY` – API key for `POST https://api.resend.com/emails`.
- `RESEND_FROM_EMAIL` – verified sender identity (e.g. `notifications@yourdomain.com`).

## Sending rules

Transactional emails are sent for:

1. `invite` (invite created)
2. `accepted` (invite accepted)
3. `invite_declined` (invite declined)
4. `reminder_due_24h` (due in ~24h)
5. `reminder_overdue` (overdue by at least 24h)

All emails include a **Manage notifications** link (`/notifications`) and have both HTML and plain-text bodies.

## Preferences and idempotency

- Preference flag: `profiles.email_notifications_enabled` (default `true`).
- Email log table: `notification_email_sends`.
- Dedupe rule: unique index on `(dedupe_key, user_id, type)` avoids duplicate email sends for the same event/user/type.

## DNS setup (SPF/DKIM/DMARC)

For your sender domain:

1. Add **SPF** TXT record authorizing Resend mail servers.
2. Add **DKIM** records provided by Resend for the domain.
3. Add **DMARC** TXT record (start with `p=none`, monitor, then move to `quarantine/reject`).

Example DMARC starter:

```txt
_dmarc.yourdomain.com TXT "v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com; fo=1"
```

Use Resend dashboard domain verification to validate SPF/DKIM propagation before production traffic.


## Dev smoke test

- Endpoint: `POST /api/notifications/email/test` (authenticated; sends to current user).
- CLI helper: `npm run test:email`
  - Required env: `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

The endpoint returns the persisted `notification_email_sends` row so you can verify provider status and errors.
