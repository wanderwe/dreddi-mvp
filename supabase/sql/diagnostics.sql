WITH targets AS (
  SELECT *
  FROM (
    VALUES
      ('profiles', 'is_public'),
      ('profiles', 'is_public_profile'),
      ('promises', 'is_public'),
      ('promises', 'public_by_creator'),
      ('promises', 'public_by_counterparty'),
      ('promises', 'visibility'),
      ('promises', 'public_requested'),
      ('notifications', 'type')
  ) AS t(table_name, column_name)
)
SELECT
  t.table_name,
  t.column_name,
  c.data_type,
  CASE WHEN c.column_name IS NULL THEN false ELSE true END AS exists
FROM targets t
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
  AND c.table_name = t.table_name
  AND c.column_name = t.column_name
ORDER BY t.table_name, t.column_name;
