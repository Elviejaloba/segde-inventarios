CREATE TABLE IF NOT EXISTS tela_rindes (
  id BIGSERIAL PRIMARY KEY,
  article_code TEXT NOT NULL UNIQUE,
  ancho_cm NUMERIC(10, 2) NOT NULL,
  peso_referencia_kg NUMERIC(12, 4) NOT NULL,
  metros_referencia NUMERIC(12, 4) NOT NULL,
  kg_por_metro NUMERIC(12, 6) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_tela_rindes_active
  ON tela_rindes (activo, article_code);
