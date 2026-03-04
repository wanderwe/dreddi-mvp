# Email notifications in production (Vercel + Resend)

This runbook enables and verifies production delivery for transactional emails:

- `invite_created` → counterparty receives email
- `invite_accepted` / `invite_declined` → creator receives email
- deadline reminders (`/api/notifications/cron`) → responsible user receives email

## 1) Required environment variables (server runtime)

Add these variables in Vercel **Project → Settings → Environment Variables**:

- `RESEND_API_KEY` = API key from Resend dashboard
- `RESEND_FROM_EMAIL` = verified sender address (example: `notify@dreddi.com`)
- `NEXT_PUBLIC_APP_URL` = production app URL (example: `https://dreddi.com`)

`NEXT_PUBLIC_APP_URL` is used to build absolute links inside email templates (CTA and manage notifications links).

## 2) Vercel production setup (exact steps)

1. Open Vercel project.
2. Go to **Settings → Environment Variables**.
3. Add variables for **Production** (and optionally **Preview**):
   - `RESEND_API_KEY=<from Resend dashboard>`
   - `RESEND_FROM_EMAIL=<verified sender>`
   - `NEXT_PUBLIC_APP_URL=https://dreddi.com`
4. **Important**: redeploy after changing env vars:
   - **Deployments → latest deployment → Redeploy**

## 3) Runtime health check

Authenticated endpoint:

- `GET /api/notifications/email/health`

Response:

- `{"configured":true,"status":"configured"}` only when both `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are present.
- Secret values are never returned.

## 4) Production smoke-test endpoint

Authenticated endpoint:

- `POST /api/notifications/email/test`

Behavior:

- Sends a test email to the current authenticated user using the same pipeline as normal notifications.
- Persists a row in `notification_email_sends`.
- Returns the last send log payload.

Failure behavior (loud + explicit):

- missing env vars → status `provider_not_configured` + `error_message`
- invalid sender domain / provider rejection → status `failed` + provider `error_message`

## 5) End-to-end production checklist

1. Turn ON `profiles.email_notifications_enabled` in Settings.
2. Call `POST /api/notifications/email/test`:
   - expect response `ok=true`
   - expect `notification_email_sends.status=sent`
   - expect `to_email` equals current user email
   - verify inbox delivery
3. Create an invite:
   - verify counterparty gets invite email (`type=invite`)
4. Accept or decline invite:
   - verify creator gets follow-up (`type=accepted` / `type=invite_declined`)
5. Trigger cron manually:
   - call `POST /api/notifications/cron` with `Authorization: Bearer $NOTIFICATIONS_CRON_SECRET`
   - verify reminder email send (`type=reminder_due_24h` / `type=reminder_overdue`)

If any trigger does not send:

- verify recipient email exists in `auth.users.email` (source of truth used by sender)
- verify `profiles.email_notifications_enabled = true`
- verify `profiles.deadline_reminders_enabled = true` for deadline reminder events
- verify `notification_email_sends` row exists and inspect `status` + `error_message`

## 6) Troubleshooting by `notification_email_sends`

- `sent`: provider accepted request (`provider_id` set, `to_email` populated)
- `disabled`: user has email notifications OFF
- `provider_not_configured`: `RESEND_API_KEY` or `RESEND_FROM_EMAIL` missing in runtime
- `failed`: provider rejected request or recipient resolution failed; inspect `error_message` and `provider_response`
