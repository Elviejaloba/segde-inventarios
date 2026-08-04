CREATE TABLE IF NOT EXISTS checklist_branches (
  branch_code TEXT PRIMARY KEY,
  branch_name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checklist_periods (
  period_key TEXT PRIMARY KEY,
  month_name TEXT NOT NULL,
  year INTEGER NULL,
  month INTEGER NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checklist_catalog_items (
  item_code TEXT PRIMARY KEY,
  display_code TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'calendar',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checklist_branch_period_items (
  id BIGSERIAL PRIMARY KEY,
  branch_code TEXT NOT NULL REFERENCES checklist_branches(branch_code) ON DELETE CASCADE,
  period_key TEXT NOT NULL REFERENCES checklist_periods(period_key) ON DELETE CASCADE,
  period_scope TEXT NOT NULL DEFAULT '__base__',
  month_name TEXT NOT NULL,
  week_label TEXT NOT NULL,
  item_code TEXT NOT NULL REFERENCES checklist_catalog_items(item_code) ON DELETE CASCADE,
  item_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_checklist_branch_period_items
  ON checklist_branch_period_items (branch_code, period_key, week_label, item_code);

CREATE INDEX IF NOT EXISTS idx_checklist_branch_period_items_scope
  ON checklist_branch_period_items (branch_code, period_scope, month_name, item_order);

CREATE TABLE IF NOT EXISTS checklist_item_states (
  id BIGSERIAL PRIMARY KEY,
  branch_code TEXT NOT NULL REFERENCES checklist_branches(branch_code) ON DELETE CASCADE,
  period_key TEXT NULL REFERENCES checklist_periods(period_key) ON DELETE CASCADE,
  period_scope TEXT NOT NULL DEFAULT '__base__',
  item_code TEXT NOT NULL REFERENCES checklist_catalog_items(item_code) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  has_stock BOOLEAN NOT NULL DEFAULT TRUE,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_checklist_item_states_scope_item
  ON checklist_item_states (branch_code, period_scope, item_code);

CREATE INDEX IF NOT EXISTS idx_checklist_item_states_scope
  ON checklist_item_states (branch_code, period_scope, last_updated DESC);

CREATE TABLE IF NOT EXISTS checklist_added_items (
  id BIGSERIAL PRIMARY KEY,
  branch_code TEXT NOT NULL REFERENCES checklist_branches(branch_code) ON DELETE CASCADE,
  period_key TEXT NOT NULL REFERENCES checklist_periods(period_key) ON DELETE CASCADE,
  period_scope TEXT NOT NULL,
  item_code TEXT NOT NULL REFERENCES checklist_catalog_items(item_code) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  month TEXT NULL,
  created_by TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_checklist_added_items_scope_item
  ON checklist_added_items (branch_code, period_scope, item_code);