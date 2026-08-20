CREATE TABLE IF NOT EXISTS rinde_inventory_sessions (
  id TEXT PRIMARY KEY,
  branch_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ NULL,
  CHECK (status IN ('active', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_rinde_inventory_sessions_branch_status
  ON rinde_inventory_sessions (branch_code, status, last_activity DESC);

CREATE TABLE IF NOT EXISTS rinde_inventory_items (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES rinde_inventory_sessions(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  article_code TEXT NOT NULL,
  reference_label TEXT NOT NULL,
  ancho_cm NUMERIC(10,2) NOT NULL,
  peso_kg NUMERIC(12,4) NOT NULL DEFAULT 0,
  kg_por_metro NUMERIC(12,6) NOT NULL,
  metros_referencia NUMERIC(12,4) NOT NULL,
  metros_abiertos NUMERIC(12,4) NOT NULL DEFAULT 0,
  rollos_cerrados INTEGER NOT NULL DEFAULT 0,
  metros_cerrados NUMERIC(12,4) NOT NULL DEFAULT 0,
  total_metros NUMERIC(12,4) NOT NULL DEFAULT 0,
  observacion TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rinde_inventory_items_session_order
  ON rinde_inventory_items (session_id, sort_order, id);
