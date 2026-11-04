"""PostgreSQL delivery-ledger operations for one-shot notification runners.

This module does not send email.  Its unique reservation is deliberately kept
until an operator resolves an `uncertain` SMTP outcome.
"""
from __future__ import annotations

import os
import uuid
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class DeliveryKey:
    notification_type: str
    scheduled_for: datetime
    period_key: str
    recipient: str
    branch_code: str | None = None


class NotificationLedger:
    def __init__(self, dsn: str | None = None, connect=None):
        self._dsn = dsn or os.environ.get("DATABASE_URL")
        self._connect = connect
        if not self._dsn and self._connect is None:
            raise RuntimeError("DATABASE_URL es obligatoria para reservar notificaciones")

    def _connection(self):
        if self._connect is not None:
            return self._connect()
        import psycopg2
        return psycopg2.connect(self._dsn, connect_timeout=10)

    def reserve_many(self, keys: list[DeliveryKey], execution_id: uuid.UUID | None = None) -> bool:
        """Reserve a whole message atomically; partial recipient reservations roll back."""
        if not keys:
            raise ValueError("Una notificaciÃ³n debe tener al menos un destinatario")
        execution_id = execution_id or uuid.uuid4()
        sql = '''
            INSERT INTO notification_delivery_ledger
              (notification_type, scheduled_for, period_key, branch_code, recipient, execution_id, status)
            VALUES (%s, %s, %s, %s, %s, %s, 'reserved')
            ON CONFLICT (notification_type, scheduled_for, period_key, branch_code, recipient) DO NOTHING
            RETURNING id
        '''
        with self._connection() as connection:
            with connection.cursor() as cursor:
                reserved = 0
                for key in keys:
                    cursor.execute(sql, (
                        key.notification_type, key.scheduled_for, key.period_key,
                        key.branch_code or "", key.recipient, str(execution_id),
                    ))
                    reserved += int(cursor.fetchone() is not None)
                if reserved != len(keys):
                    connection.rollback()
                    return False
                return True

    def reserve(self, key: DeliveryKey, execution_id: uuid.UUID | None = None) -> bool:
        return self.reserve_many([key], execution_id)

    def mark(self, key: DeliveryKey, status: str, smtp_result: str | None = None) -> None:
        if status not in {"attempted", "accepted", "uncertain", "failed"}:
            raise ValueError(f"Estado de entrega invÃ¡lido: {status}")
        sql = '''
            UPDATE notification_delivery_ledger
               SET status = %s, smtp_result = %s, updated_at = now()
             WHERE notification_type = %s AND scheduled_for = %s AND period_key = %s
               AND branch_code = %s AND recipient = %s
        '''
        with self._connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql, (status, smtp_result, key.notification_type, key.scheduled_for,
                                     key.period_key, key.branch_code or "", key.recipient))


