-- Recovery script for 20260925_canonicalize_checklist_item_states.sql.
-- Use only before accepting new checklist writes after the migration: it restores
-- the complete pre-migration snapshot and therefore discards later writes.
BEGIN;

LOCK TABLE checklist_item_states IN SHARE ROW EXCLUSIVE MODE;
DROP INDEX IF EXISTS uq_checklist_item_states_scope_canonical_item;

DELETE FROM checklist_item_states;

INSERT INTO checklist_item_states (
  id,
  branch_code,
  period_key,
  period_scope,
  item_code,
  completed,
  has_stock,
  last_updated,
  updated_by
)
SELECT
  id,
  branch_code,
  period_key,
  period_scope,
  item_code,
  completed,
  has_stock,
  last_updated,
  updated_by
FROM checklist_item_states_backup_20260925;

SELECT setval(
  pg_get_serial_sequence('checklist_item_states', 'id'),
  COALESCE((SELECT max(id) FROM checklist_item_states), 1),
  true
);

COMMIT;
