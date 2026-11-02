# Prepared Railway Cron services (not activated)

| Service | Build command | Start command | UTC schedule |
|---|---|---|
| executive-report-cron | `pip install --no-cache-dir -r automation/requirements.txt` | `python automation/executive_report_cron.py --send` | `0 12 * * 1` |
| branch-reminders-cron | `pip install --no-cache-dir -r automation/requirements.txt` | `python automation/branch_reminders_cron.py --send` | `10 12 * * 1,3,5` |

Both jobs use `America/Argentina/Buenos_Aires`, must terminate on completion, and require
`SMTP_SERVER`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `INVENTARIOS_API_URL`,
`REPORT_COSTS_API_KEY`, `DATABASE_URL`, and `NOTIFICATION_SEND_ENABLED=true`.
The executive recipients are the eight approved historical addresses. The image must use Python 3.11
and install only `automation/requirements.txt`; do not reuse the API service.

The branch runner derives Monday, Wednesday, or Friday in Argentina from the cron execution date;
`--day` remains available only for local dry-runs. Every runner reserves recipients in
`notification_delivery_ledger` before SMTP; an `uncertain` result is retained and never retried automatically.

