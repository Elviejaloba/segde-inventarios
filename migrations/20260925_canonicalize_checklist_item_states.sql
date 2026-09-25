-- Run manually once, after reviewing migrations/20260925_canonicalize_checklist_item_states.preview.sql.
-- This script is transactional. Do not run it concurrently with checklist writers.
BEGIN;

LOCK TABLE checklist_item_states IN SHARE ROW EXCLUSIVE MODE;

-- Full recovery snapshot. The migration intentionally fails if this name already
-- exists, so a later execution cannot silently reuse an old backup.
CREATE TABLE checklist_item_states_backup_20260925 AS
TABLE checklist_item_states;

CREATE TEMP TABLE checklist_item_states_canonical_ranked ON COMMIT DROP AS
SELECT
  id,
  branch_code,
  period_scope,
  lower(trim(regexp_replace(item_code, '[/.#$\\[\\]]', '-', 'g'))) AS canonical_item_code,
  row_number() OVER (
    PARTITION BY
      branch_code,
      period_scope,
      lower(trim(regexp_replace(item_code, '[/.#$\\[\\]]', '-', 'g')))
    ORDER BY last_updated DESC, id DESC
  ) AS canonical_rank
FROM checklist_item_states;

-- The canonical code must exist before the FK value can be updated.
INSERT INTO checklist_catalog_items (item_code, display_code)
SELECT DISTINCT canonical_item_code, canonical_item_code
FROM checklist_item_states_canonical_ranked
ON CONFLICT (item_code) DO NOTHING;

-- Keep exactly one row per branch, period scope, and canonical item code.
DELETE FROM checklist_item_states AS state
USING checklist_item_states_canonical_ranked AS ranked
WHERE state.id = ranked.id
  AND ranked.canonical_rank > 1;

-- Normalize only the surviving records. period_key and period_scope are unchanged.
UPDATE checklist_item_states AS state
SET item_code = ranked.canonical_item_code
FROM checklist_item_states_canonical_ranked AS ranked
WHERE state.id = ranked.id
  AND ranked.canonical_rank = 1
  AND state.item_code IS DISTINCT FROM ranked.canonical_item_code;

-- Preserve the existing raw-key UNIQUE index for the current UPSERT conflict
-- target, then add canonical uniqueness to prevent case/punctuation variants.
CREATE UNIQUE INDEX uq_checklist_item_states_scope_canonical_item
  ON checklist_item_states (
    branch_code,
    period_scope,
    lower(trim(regexp_replace(item_code, '[/.#$\\[\\]]', '-', 'g')))
  );

COMMIT;
