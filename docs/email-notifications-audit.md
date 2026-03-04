# Email Notifications Audit (MVP)

## Provider and runtime configuration

- **Provider in use:** `Resend` via direct `POST https://api.resend.com/emails` calls in `src/lib/notifications/email.ts`.
- **Required env vars:**
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`
  - `NEXT_PUBLIC_APP_URL`
- If `RESEND_API_KEY` is missing, sends are now logged with `status=provider_not_configured` and an explicit error payload.
- DNS requirements for production sender domains remain: SPF/DKIM/DMARC (see `docs/email-notifications.md`).

## Event triggers (MVP)

Current transactional email sends are tied to notification creation:

1. **invite_created → counterparty**
   - Trigger path: `POST /api/promises/create` -> `createNotification(type="invite")`
2. **invite_accepted → creator**
   - Trigger path: `POST /api/invite/[token]/accept` -> `dispatchNotificationEvent(event="accepted")`
3. **invite_declined → creator**
   - Trigger path: `POST /api/invite/[token]/decline` -> `createNotification(type="invite_declined")`
4. **deadline reminders (when enabled)**
   - Trigger path: `POST /api/notifications/cron` -> `dispatchNotificationEvent(reminder_due_24h|reminder_overdue)`

## Preferences and gating

- Per-user email preference is persisted in `profiles.email_notifications_enabled`.
- Email send execution gates correctly:
  - `true` => attempt send
  - `false` => skip and log `status=disabled`
- Deadline reminder sends are additionally gated by `profiles.deadline_reminders_enabled`.

## Template coverage

- Template rendering is centralized in `src/lib/notifications/email.ts`.
- Subject + CTA mappings exist for invite, accept, decline, due soon, and overdue flows.
- CTA links are now consistently absolute using `NEXT_PUBLIC_APP_URL` fallback (`http://localhost:3000`).

## Observability fixes applied

- Added structured logging for all email attempts (`sent`, `failed`, `disabled`, `provider_not_configured`) including:
  - event type
  - user id
  - provider
  - provider message id
  - recipient email
  - error message
- Extended `notification_email_sends` schema with:
  - `provider`
  - `error_message`
  - `to_email`
- Email provider failures are now visible in logs and stored, not silently swallowed.

## Dev test endpoint

- Added authenticated route: `POST /api/notifications/email/test`
  - Creates a test notification for the current user
  - Sends an email via the same notification-email pipeline
  - Returns last send log payload for verification
- Added helper script:
  - `npm run test:email`
  - Uses `TEST_USER_EMAIL` + `TEST_USER_PASSWORD` to obtain a token and call the test endpoint.

## Remaining production checklist

- Ensure production secrets are set in deployment env:
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL` (verified sender/domain)
  - `NEXT_PUBLIC_APP_URL` (public app URL)
- Verify sender domain SPF/DKIM/DMARC in Resend dashboard before scaling traffic.
