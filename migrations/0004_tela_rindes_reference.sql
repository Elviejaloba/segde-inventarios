ALTER TABLE tela_rindes
  ADD COLUMN IF NOT EXISTS reference_label TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_tela_rindes_reference_label
  ON tela_rindes (reference_label);
