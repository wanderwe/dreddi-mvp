# Agreement update notifications code review (2026-05-26)

## Scope reviewed
- update creation flows:
  - `POST /api/promises/[id]/updates`
  - `POST /api/public/agreements/[id]`
- watcher fan-out helper: `notifyAgreementWatchers`
- participant fan-out logic for private agreements
- DB constraints and notification type migrations

## What works well
1. **Clear split by audience:**
   - participants get `agreement_updated` from private flow;
   - external watchers get `public_agreement_updated`.
2. **Actor self-notification is suppressed** for participant notifications (`filter(id !== user.id)`) and watcher notifications (`excluded` set includes participants + actor).
3. **Per-event dedupe keys include update id**, so separate updates should not collapse into one notification.
4. **Public-flow update endpoint validates lifecycle and role** (`canUserPostUpdate`, `isAgreementLive`) before insert.

## Risks / gaps
1. **Private endpoint currently allows watcher notifications for public agreements** because it checks visibility and then calls `notifyAgreementWatchers`. This is probably intended, but creates behavior split where participants can post from either endpoint and still notify watchers.
2. **No explicit tests for `agreement_updated` / `public_agreement_updated` fan-out** were found in `tests/`.
3. **Migration ordering risk:**
   - `20260526120000_notifications_add_agreement_updated_type.sql` adds `agreement_updated` to constraint.
   - `20260626120000_notifications_add_public_agreement_types.sql` later rewrites constraint without `agreement_updated`.
   If both are applied in chronological order, `agreement_updated` can be accidentally removed from DB allowlist.
4. **Watcher error handling is log-and-return**; failures in watcher lookup do not block update creation. This is availability-friendly, but can silently drop watcher notifications.

## Suggested follow-ups
1. Add integration tests for:
   - private participant update -> notifies other participants, not author;
   - public participant update -> notifies watchers excluding participants;
   - dedupe behavior across multiple updates.
2. Fix notification type constraint migration sequence so final state includes both:
   - `agreement_updated`
   - `public_agreement_updated`
3. Add metric/log counter for watcher fan-out failures to improve observability.

