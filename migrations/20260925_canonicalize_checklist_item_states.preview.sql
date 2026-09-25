-- Read-only simulation for 20260925_canonicalize_checklist_item_states.sql.
-- It does not alter rows, indexes, catalog entries, or schema.
BEGIN TRANSACTION READ ONLY;

WITH ranked AS (
  SELECT
    id,
    branch_code,
    period_key,
    period_scope,
    item_code,
    completed,
    has_stock,
    last_updated,
    lower(trim(regexp_replace(item_code, '[/.#$\\[\\]]', '-', 'g'))) AS canonical_item_code,
    row_number() OVER (
      PARTITION BY
        branch_code,
        period_scope,
        lower(trim(regexp_replace(item_code, '[/.#$\\[\\]]', '-', 'g')))
      ORDER BY last_updated DESC, id DESC
    ) AS canonical_rank
  FROM checklist_item_states
), duplicates_before AS (
  SELECT branch_code, period_scope, canonical_item_code
  FROM ranked
  GROUP BY branch_code, period_scope, canonical_item_code
  HAVING count(*) > 1
), survivors AS (
  SELECT * FROM ranked WHERE canonical_rank = 1
), duplicates_after AS (
  SELECT branch_code, period_scope, canonical_item_code
  FROM survivors
  GROUP BY branch_code, period_scope, canonical_item_code
  HAVING count(*) > 1
)
SELECT
  (SELECT count(*) FROM duplicates_before) AS duplicate_groups_before,
  (SELECT count(*) FROM ranked WHERE canonical_rank > 1) AS rows_to_remove,
  (SELECT count(*) FROM duplicates_after) AS duplicate_groups_after,
  (SELECT count(*) FROM ranked) AS rows_before,
  (SELECT count(*) FROM survivors) AS rows_after,
  (SELECT count(*) FROM ranked WHERE period_scope IS NULL) AS null_period_scopes,
  (SELECT json_agg(json_build_object(
    'id', id,
    'branch_code', branch_code,
    'item_code_before', item_code,
    'item_code_after', canonical_item_code,
    'period_key', period_key,
    'period_scope', period_scope,
    'completed', completed,
    'has_stock', has_stock,
    'last_updated', last_updated
  )) FROM survivors
   WHERE lower(trim(branch_code)) = lower(trim('T.Sjuan'))
     AND canonical_item_code = lower(trim('TA56LF07'))
  ) AS tsjuan_ta56lf07_survivor;

ROLLBACK;
