UPDATE promises
SET visibility = 'public'
WHERE visibility = 'private'
  AND (
    COALESCE(is_public, false)
    OR COALESCE(public_by_creator, false)
    OR COALESCE(public_by_counterparty, false)
  );
