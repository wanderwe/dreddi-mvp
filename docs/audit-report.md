# Dreddi MVP audit

## Executive summary
- Auth and promise lifecycle rely on client-side Supabase sessions and ad-hoc server routes; consolidating client/server Supabase usage and enforcing consistent status enums will reduce breakage risk.【F:src/app/login/page.tsx†L14-L68】【F:src/app/api/promises/[id]/common.ts†L16-L74】
- Promise creation, invitation, and acceptance are split between client inserts and service-role APIs; introducing migrations and shared DB contracts would harden these flows.【F:src/app/promises/new/page.tsx†L14-L68】【F:src/app/api/invite/[token]/route.ts†L15-L65】【F:src/app/api/invite/[token]/accept/route.ts†L9-L66】
- Confirm/dispute and reputation updates work through server routes using the service role; missing migration automation and index checks are major stability gaps.【F:docs/migrations_confirm_dispute.sql†L1-L32】【F:docs/migrations_reputation.sql†L1-L41】【F:src/app/api/promises/[id]/confirm/route.ts†L5-L50】【F:src/app/api/promises/[id]/dispute/route.ts†L11-L68】
- Unused admin client code and duplicated Supabase client instantiation create risk of leaking server keys or diverging auth handling; removing/centralizing them is a quick win.【F:src/lib/supabaseAdmin.ts†L1-L10】【F:src/app/api/promises/[id]/status/route.ts†L1-L76】
- No migration framework is present; formalizing Supabase CLI migrations and adding RLS/policy verification are required for production safety.【F:docs/migrations_confirm_dispute.sql†L1-L32】【F:docs/migrations_reputation.sql†L1-L41】

## 1) Architecture map
### Flows and dependencies
- **Auth (magic link)**
  - UI: `/login` collects email and sends OTP redirect to `/auth/callback`.【F:src/app/login/page.tsx†L14-L68】
  - Callback: `/auth/callback` exchanges code/hash for session, upserts `profiles`, redirects home.【F:src/app/auth/callback/page.tsx†L11-L54】
  - API/DB: Uses client Supabase auth; writes to `profiles` table via client `upsertProfile` (requires insert/update policy).【F:src/lib/ensureProfile.ts†L1-L14】

- **Create promise**
  - UI: `/promises/new` form inserts directly into `promises` with fields `creator_id`, `promisor_id`, `counterparty_contact`, `due_at`, `status`, `invite_token`.【F:src/app/promises/new/page.tsx†L14-L68】
  - API: none (client insert). DB requires insert policy for authenticated creator and columns above.
  - DB tables: `promises` with `id`, `creator_id`, `promisor_id`, `counterparty_id`, `title`, `details`, `counterparty_contact`, `due_at`, `status`, `invite_token`, timestamps.

- **Invite flow**
  - UI: Invitation landing `/p/invite/[token]` fetches invite data via API and can POST accept with bearer token.【F:src/app/p/invite/[token]/page.tsx†L18-L89】
  - API: `GET /api/invite/[token]` loads promise by `invite_token` with service role; `POST /api/invite/[token]/accept` validates user via anon client then writes `counterparty_id` via service role.【F:src/app/api/invite/[token]/route.ts†L15-L65】【F:src/app/api/invite/[token]/accept/route.ts†L9-L66】
  - DB: `promises.invite_token`, `counterparty_id`, creator auth lookup via auth admin API.

- **Status transitions (promisor complete)**
  - UI: `/promises/[id]` (details) triggers `POST /api/promises/:id/complete` for promisor; list page shows pending/impact badges using `status`/timestamps.【F:src/app/promises/[id]/page.tsx†L180-L223】【F:src/app/api/promises/[id]/complete/route.ts†L4-L42】
  - API: server route checks ownership/status `active` then sets `completed_by_promisor`, resets review fields.【F:src/app/api/promises/[id]/complete/route.ts†L13-L33】
  - DB: `promises.status`, `completed_at`, `confirmed_at`, `disputed_at`, `disputed_code`, `dispute_reason` (see migration).【F:docs/migrations_confirm_dispute.sql†L1-L23】

- **Confirm / dispute (counterparty)**
  - UI: `/promises/[id]/confirm` allows confirm/dispute; list page drives review buttons when `status === completed_by_promisor`.【F:src/app/promises/[id]/confirm/page.tsx†L36-L111】【F:src/app/promises/PromisesClient.tsx†L97-L146】
  - API: `POST /api/promises/:id/confirm` sets `status` to `confirmed` and triggers reputation; `POST /dispute` sets `disputed` with code/reason and reputation.【F:src/app/api/promises/[id]/confirm/route.ts†L5-L50】【F:src/app/api/promises/[id]/dispute/route.ts†L11-L68】
  - DB: `promises` fields above; reputation tables updated via server-side `applyReputationForPromiseFinalization` using service role.【F:src/lib/reputation/applyReputation.ts†L1-L129】

- **Reputation updates**
  - API: `GET /api/reputation/me` uses service role to fetch `user_reputation` and `reputation_events` with promise title join.【F:src/app/api/reputation/me/route.ts†L5-L35】
  - DB: `user_reputation` aggregates and `reputation_events` append-only with unique `(user_id, promise_id, kind)` and RLS read policies.【F:docs/migrations_reputation.sql†L1-L41】

### Dependency map (high level)
- UI pages/components → client Supabase (auth + inserts) → API routes (service role) → `promises`, `profiles`, `user_reputation`, `reputation_events` tables.
- Invite/confirm/dispute endpoints → `promises` table via service role; rely on auth bearer tokens validated through anon client.
- Reputation handler → `reputation_events`/`user_reputation` tables; depends on `promises.status` values being `confirmed` or `disputed`.

## 2) Dead/unused code & risky leftovers
- `src/lib/supabaseAdmin.ts` defines a service-role client but is unused; retaining it invites accidental client imports of the service key. Remove or gate to server-only contexts.【F:src/lib/supabaseAdmin.ts†L1-L10】
- Multiple ad-hoc Supabase clients are created in APIs instead of sharing a server utility (`getAdminClient`, manual createClient in status route/invite accept), increasing divergence risk. Consolidate into one server helper that never runs client-side.【F:src/app/api/promises/[id]/common.ts†L44-L74】【F:src/app/api/promises/[id]/status/route.ts†L1-L76】【F:src/app/api/invite/[token]/accept/route.ts†L9-L66】
- Possible unused API surface: status updater allows `active/fulfilled/broken` but UI uses newer `completed_by_promisor/confirmed/disputed`, risking inconsistent states; deprecate or align with current lifecycle.【F:src/app/api/promises/[id]/status/route.ts†L6-L76】【F:src/app/promises/PromisesClient.tsx†L95-L130】
- Env handling: service-role key is required for several routes; ensure it never ships to the client bundle by keeping helper files server-only and removing unused exports. NEXT_PUBLIC keys are correctly used for anon clients; service key should be referenced only in server files (status route currently colocated under /api but imports both anon and service keys).【F:src/app/api/promises/[id]/status/route.ts†L19-L44】
- No i18n framework exists; scattered Ukrainian/English strings suggest prior i18n attempt but no tooling—safe to standardize text and remove expectations of translation layers (no extra packages present).

## 3) Supabase correctness checklist
- **Tables & columns (must exist):**
  - `promises`: `id uuid`, `title text`, `details text`, `status text/enum` (values: `active`, `completed_by_promisor`, `confirmed`, `disputed`), `creator_id uuid`, `promisor_id uuid`, `counterparty_id uuid`, `counterparty_contact text`, `invite_token text`, `due_at timestamptz`, `created_at`, `completed_at`, `confirmed_at`, `disputed_at`, `disputed_code text`, `dispute_reason text`.【F:src/app/promises/new/page.tsx†L14-L68】【F:docs/migrations_confirm_dispute.sql†L1-L23】
  - `profiles`: `id`, `email`, `display_name`, `handle`, `avatar_url` (required by login callback).【F:src/lib/ensureProfile.ts†L3-L14】
  - `user_reputation` + `reputation_events` per migration (indexes on `user_id`, `promise_id`).【F:docs/migrations_reputation.sql†L1-L41】

- **Constraints/RLS:**
  - `reputation_events` unique `(user_id, promise_id, kind)` to prevent double counting.【F:docs/migrations_reputation.sql†L11-L18】
  - RLS read policies for reputation tables; need corresponding insert/update RLS or use service role (current server code assumes bypass via service key).【F:docs/migrations_reputation.sql†L21-L40】【F:src/app/api/promises/[id]/confirm/route.ts†L22-L50】
  - `promises` table should enforce auth ownership for inserts/updates (not defined in repo—must be configured in Supabase dashboard/CLI).

- **Status consistency:**
  - UI and confirm/dispute APIs expect `active → completed_by_promisor → confirmed|disputed` path.【F:src/app/api/promises/[id]/complete/route.ts†L13-L33】【F:src/app/api/promises/[id]/confirm/route.ts†L14-L38】【F:src/app/api/promises/[id]/dispute/route.ts†L28-L53】
  - Legacy `fulfilled/broken` statuses still appear in status API and home page normalization; align enum/text to avoid mismatches in queries/UI badges.【F:src/app/api/promises/[id]/status/route.ts†L6-L70】【F:src/app/page.tsx†L9-L66】

- **Indexes to verify/add:**
  - `promises`: indexes on `creator_id`, `counterparty_id`, and `invite_token` (invite/token lookups, list queries).【F:src/app/promises/PromisesClient.tsx†L45-L74】【F:src/app/api/invite/[token]/route.ts†L23-L43】
  - `promises.status` for filtering dashboards; if enum, implicit index may not exist—add btree on status + creator/counterparty for frequent filters.
  - `reputation_events.user_id` and `.promise_id` already defined in migration; ensure they exist.【F:docs/migrations_reputation.sql†L15-L18】

## 4) Migrations plan
- **Migration inventory (what must exist):**
  - Apply `docs/migrations_confirm_dispute.sql` to add lifecycle timestamps and status values on `promises`.
  - Apply `docs/migrations_reputation.sql` to create `user_reputation`/`reputation_events`, indexes, and RLS policies.
  - Ensure `promises` table has columns referenced in UI/API (see checklist above) and RLS policies permitting creators/counterparties to select/insert/update own rows; add indexes noted above.

- **Recommended: Supabase CLI migrations**
  - Install/initialize: `supabase init` (once), store SQL in `supabase/migrations/*`.
  - Create migrations: `supabase migration new confirm_dispute_flow` then copy `docs/migrations_confirm_dispute.sql` content; repeat for reputation.
  - Apply locally: `supabase db push` or `supabase db reset` as needed; deploy: `supabase db push --prod`.
  - Structure: keep source SQL in `supabase/migrations/<timestamp>_<name>.sql`; move existing docs SQL there and leave docs as summary.

- **Alternate (manual SQL + checklist)**
  - Maintain `docs/sql/` with numbered files; apply via Supabase SQL editor.
  - Checklist before deploy: (1) run each SQL file in order, (2) verify `promises.status` values include `completed_by_promisor/confirmed/disputed`, (3) confirm indexes via `
\d+ promises`.

## 5) Regression risks
1. Magic-link callback fails to set session or profile causing broken redirect.
   - Test: e2e Playwright hitting `/login` → magic-link stub → `/auth/callback` exchanging code and asserting profile insert mocked via Supabase client mock; place in `tests/e2e/auth.spec.ts`.【F:src/app/auth/callback/page.tsx†L11-L54】
2. Promise creation missing RLS permissions causes silent failures.
   - Test: integration test using Supabase client with anon key attempting insert; expect success with authenticated JWT; `tests/integration/promises.create.test.ts`.【F:src/app/promises/new/page.tsx†L14-L68】
3. Invite accept allows creator or wrong user to take invite.
   - Test: API test hitting `/api/invite/:token/accept` with creator token and unrelated token to assert 400/409; `tests/api/inviteAccept.test.ts`.【F:src/app/api/invite/[token]/accept/route.ts†L27-L63】
4. Counterparty confirm/dispute bypass when status not pending.
   - Test: API test ensuring non-`completed_by_promisor` status returns 400; `tests/api/promiseFinalize.test.ts`.【F:src/app/api/promises/[id]/confirm/route.ts†L14-L38】【F:src/app/api/promises/[id]/dispute/route.ts†L28-L53】
5. Reputation double-counting events on repeated calls.
   - Test: unit test for `applyReputationForPromiseFinalization` with duplicate invocations; `tests/unit/reputation.test.ts`.【F:src/lib/reputation/applyReputation.ts†L69-L129】
6. Home dashboard queries using stale statuses (`fulfilled/broken`) masking pending items.
   - Test: component test verifying status normalization for new statuses; `tests/unit/homeStatuses.test.ts`.【F:src/app/page.tsx†L9-L66】
7. Status API accepting deprecated values causing inconsistent rows.
   - Test: API test for `/api/promises/:id/status` rejecting unknown/legacy statuses; `tests/api/statusRoute.test.ts`.【F:src/app/api/promises/[id]/status/route.ts†L6-L70】
8. Invite token lookup missing index leading to slow response under load.
   - Test: migration test asserting `invite_token` index exists via `pg_indexes` query; `tests/db/indexes.test.ts`.【F:src/app/api/invite/[token]/route.ts†L23-L43】
9. Profiles upsert failing due to missing RLS when callback runs.
   - Test: integration test stubbing Supabase profile insert; `tests/integration/profileUpsert.test.ts`.【F:src/lib/ensureProfile.ts†L3-L14】
10. Completed promise reputation updates failing silently on DB errors.
    - Test: API test mocking admin client insert failure to ensure 500 bubble; `tests/api/reputationFailure.test.ts`.【F:src/app/api/promises/[id]/confirm/route.ts†L39-L50】【F:src/app/api/promises/[id]/dispute/route.ts†L55-L66】

## 6) Quick wins (small refactors)
1. Delete unused `src/lib/supabaseAdmin.ts` and replace ad-hoc service clients with a single server-only helper to avoid accidental client bundling of service keys (low risk, medium impact).【F:src/lib/supabaseAdmin.ts†L1-L10】
2. Normalize promise status values across UI/API by deprecating `/api/promises/[id]/status` legacy statuses and updating home page normalization to new lifecycle (medium risk, high impact on data consistency).【F:src/app/api/promises/[id]/status/route.ts†L6-L70】【F:src/app/page.tsx†L9-L66】
3. Introduce Supabase CLI migrations and move existing SQL into versioned files for reproducible environments (low risk, high impact).【F:docs/migrations_confirm_dispute.sql†L1-L32】【F:docs/migrations_reputation.sql†L1-L41】
4. Add DB indexes on `promises(creator_id)`, `promises(counterparty_id)`, and `promises(invite_token)` to speed dashboards/invite lookup (low risk, medium impact).【F:src/app/promises/PromisesClient.tsx†L45-L74】【F:src/app/api/invite/[token]/route.ts†L23-L43】
5. Add RLS and constraints docs for `promises` (creator/counterparty ownership) and codify in migrations to avoid production drift (medium risk, high impact).【F:src/app/api/promises/[id]/common.ts†L16-L74】
6. Wrap auth validation into shared middleware/helper to avoid repeated bearer-token parsing and reduce mistakes (medium risk, medium impact).【F:src/app/api/promises/[id]/status/route.ts†L15-L46】【F:src/app/api/invite/[token]/accept/route.ts†L9-L36】
7. Add unit tests for `applyReputationForPromiseFinalization` to lock in scoring rules and prevent regressions (low risk, medium impact).【F:src/lib/reputation/applyReputation.ts†L69-L129】
8. Move profile upsert to a server action/route to avoid exposing direct table writes from the client and align with RLS (medium risk, medium impact).【F:src/app/auth/callback/page.tsx†L34-L54】【F:src/lib/ensureProfile.ts†L3-L14】
