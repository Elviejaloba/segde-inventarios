-- Prepared only: do not run without production approval.
CREATE TABLE notification_delivery_ledger (
  id bigserial PRIMARY KEY,
  notification_type text NOT NULL CHECK (notification_type IN ('executive_report','branch_reminder')),
  scheduled_for timestamptz NOT NULL,
  period_key text NOT NULL,
  branch_code text NOT NULL DEFAULT '',
  recipient text NOT NULL,
  execution_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('reserved','attempted','accepted','uncertain','failed')),
  smtp_result text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_type, scheduled_for, period_key, branch_code, recipient)
);
-- Reserve every recipient of one message in the same transaction. Roll back the
-- entire reservation if any recipient was already reserved for that scope.
-- An uncertain result must remain blocked for manual review; no automatic retry.

