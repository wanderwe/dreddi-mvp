# Legacy notification types (N1–N7) deprecation prep

## Current usage audit

### Production audit results (reported)

The legacy-type audit queries were run in production and returned no rows, indicating there are currently **zero** notifications with `N1`–`N7` types.

### Database audit queries (run against production)

```sql
-- Counts per legacy type
SELECT type, COUNT(*) AS total
FROM notifications
WHERE type IN ('N1','N2','N3','N4','N5','N6','N7')
GROUP BY type
ORDER BY type;

-- Oldest/newest rows per legacy type
SELECT
  type,
  MIN(created_at) AS oldest_created_at,
  MAX(created_at) AS newest_created_at
FROM notifications
WHERE type IN ('N1','N2','N3','N4','N5','N6','N7')
GROUP BY type
ORDER BY type;

-- Oldest/newest legacy rows overall
SELECT id, type, created_at
FROM notifications
WHERE type IN ('N1','N2','N3','N4','N5','N6','N7')
ORDER BY created_at ASC
LIMIT 1;

SELECT id, type, created_at
FROM notifications
WHERE type IN ('N1','N2','N3','N4','N5','N6','N7')
ORDER BY created_at DESC
LIMIT 1;
```

> **Status:** Not executed in this environment (no production DB credentials).

### Write-path audit (codebase)

All notification writes route through `createNotification`, which normalizes the type before inserting.
This means even if a caller passes `N1`–`N7`, the stored value will be the readable type.

* `createNotification` normalizes `request.type` and inserts `normalizedType`.【F:src/lib/notifications/service.ts†L104-L198】
* `normalizeNotificationType` only maps legacy values and otherwise returns the readable type verbatim.【F:src/lib/notifications/types.ts†L1-L30】
* All in-repo call sites pass readable types (e.g., `invite`, `overdue`, `completion_waiting`).【F:src/app/api/notifications/cron/route.ts†L120-L334】【F:src/app/api/promises/create/route.ts†L115-L154】

**External integrations/scripts:** No references to `N1`–`N7` were found outside of the legacy type map and migrations; any external systems should be audited separately if they write directly to the DB.

## Risk assessment

### Rendering / read paths

* Client rendering calls `normalizeNotificationType` before lookup; this preserves display for any legacy rows that still exist.【F:src/app/notifications/NotificationsClient.tsx†L153-L177】
* Removing the normalization would break rendering for any remaining `N1`–`N7` rows.

### Notification writes

* `createNotification` normalizes types before insertion, so new writes should already be readable even if legacy values are passed in.【F:src/lib/notifications/service.ts†L104-L198】
* The DB CHECK constraint still allows `N1`–`N7`, so direct DB writes could still persist legacy types.【F:supabase/migrations/20250314120000_notifications_invite_response_types.sql†L1-L22】

### Analytics/logging

* No explicit analytics/logging paths were found that rely on legacy numeric values.
* Any downstream analytics or dashboards that look for `N1`–`N7` should be checked before removal.

## Cleanup plan (proposal only — no execution)

### Prepared changes (not applied)

* Code changes to remove legacy types and simplify normalization have been prepared.
* A new migration file tightens the `notifications_type_valid` constraint to exclude `N1`–`N7`.

### Phase 1: Stop new legacy writes (if any remain)

* Ensure all notification creation goes through `createNotification` and uses readable types in app code.
* Confirm external integrations do not write `N1`–`N7` directly.

### Phase 2: Migrate existing data

```sql
UPDATE notifications
SET type = CASE type
  WHEN 'N1' THEN 'invite'
  WHEN 'N2' THEN 'invite_followup'
  WHEN 'N3' THEN 'due_soon'
  WHEN 'N4' THEN 'overdue'
  WHEN 'N5' THEN 'completion_waiting'
  WHEN 'N6' THEN 'completion_followup'
  WHEN 'N7' THEN 'dispute'
  ELSE type
END
WHERE type IN ('N1','N2','N3','N4','N5','N6','N7');
```

### Phase 3: Code cleanup (after data migration)

* Remove `LegacyNotificationType` and `LEGACY_NOTIFICATION_TYPE_MAP`.
* Simplify `normalizeNotificationType` to return the input type as-is (or remove it entirely if not needed).
* Update any type unions / guards that reference legacy values.

### Phase 4: Tighten DB constraint

```sql
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_valid;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_valid
  CHECK (
    type IN (
      'invite',
      'invite_followup',
      'invite_declined',
      'invite_ignored',
      'due_soon',
      'overdue',
      'completion_waiting',
      'completion_followup',
      'dispute'
    )
  );
```

## Recommended next steps

1. Run the audit SQL in production and capture counts/oldest/newest rows.
2. Verify external integrations (if any) are not writing `N1`–`N7` directly.
3. If counts are zero, proceed with removing legacy support in code and tightening the DB constraint.
4. If counts are non-zero, run the data migration and then remove legacy support.
