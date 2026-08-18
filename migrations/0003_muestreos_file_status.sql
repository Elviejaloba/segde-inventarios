CREATE TABLE IF NOT EXISTS muestreos_file_status (
  id BIGSERIAL PRIMARY KEY,
  file_id TEXT NOT NULL UNIQUE,
  file_path TEXT,
  status TEXT NOT NULL CHECK (status IN ('no_visto', 'visto', 'analizado', 'sin_diferencias', 'revisar')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_muestreos_file_status_updated_at
  ON muestreos_file_status (updated_at DESC);
