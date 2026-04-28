# Security migration verification pass (2026-04-28)

This pass focuses on post-migration risk areas called out in review comments:
- anon/auth public profile reads
- directory search behavior
- invite preview/token flow
- reputation display path

## Environment constraints
- Local Supabase runtime/CLI is not available in this container.
- npm dependency install is blocked by registry policy (403), so browser E2E could not be executed here.

Because of that, this pass includes:
1) static code-path verification,
2) migration-level SQL review,
3) explicit manual QA checklist for staging/prod.

## 1) Invite flow verification (static)

### Create invite row
- `POST /api/promises/create` writes to `promises` and then inserts a `deal_invites` row server-side with service role.
- This remains compatible with RLS-on because service role bypasses RLS.

### Invite preview by token (anonymous page)
- `GET /api/invite/[token]` resolves invite via `promises.invite_token` using service role.
- It does **not** depend on direct anon select from `deal_invites`.

### Accept / decline / cancel / expire
- All invite state transitions update `promises` and sync `deal_invites.status` through server-side service-role clients.
- No client-side direct `deal_invites` dependency was found.

## 2) Public profile verification (static)

### Public profile stats load
- Profile pages and directory read from `public_profile_stats`.
- Hardened migration keeps `GRANT SELECT ... TO anon, authenticated`.
- View now filters source promises to `visibility = 'public'` and removes `profiles.email` projection.

### Public agreements load
- Public profile deals are loaded via `public_get_profile_public_promises(...)` function.
- Function already enforces `profiles.is_public_profile IS TRUE` and `promises.visibility = 'public'`.

### Private agreements hidden
- New `public_profile_stats` definition aggregates from only `visibility = 'public'` rows.
- RPC for public agreements already uses the same visibility predicate.

### Directory/search behavior
- Directory/search UI no longer filters via `email.eq` on `public_profile_stats`, so removing `email` from the view does not break query construction.

## 3) Reputation verification (static)

- `public_profile_stats` still projects `reputation_score` from `user_reputation`.
- `public.reputation_scores_by_user` was switched to `security_invoker = true` in migration; it returns aggregate reputation metrics only.

## 4) Manual QA checklist to run in staging/prod

### Invite flow
1. Create a new deal with invite
2. Open invite link in anonymous/incognito browser
3. Verify invite preview loads
4. Accept invite as logged-in user
5. Decline invite as logged-in user
6. Verify expired/cancelled invite behavior

### Public profile
1. Open public profile as anonymous user
2. Verify profile stats load
3. Verify public agreements load
4. Verify private agreements are not visible
5. Verify profile directory/search works

### Reputation
1. Verify reputation score appears on profile
2. Confirm/dispute a test deal
3. Verify reputation updates

### Supabase Advisor
1. Re-run Security Advisor
2. Verify `deal_invites` RLS warning is gone
3. Verify no new critical warnings for views/functions

## Recommended SQL spot checks (run in SQL editor)

```sql
-- RLS enabled?
select relname, relrowsecurity
from pg_class
where relname = 'deal_invites';

-- Policies present?
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'deal_invites'
order by policyname;

-- public_profile_stats no longer exposes email?
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'public_profile_stats'
order by ordinal_position;
```
