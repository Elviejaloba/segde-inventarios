"""One-shot Railway executive report runner with delivery-ledger protection."""
import argparse
import os
import smtplib
import sys
from datetime import datetime
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts_windows"))
import reporte_ejecutivo as report
from notification_ledger import DeliveryKey, NotificationLedger

HISTORICAL_RECIPIENTS = (
    "adolfotripodi@textilcrisa.com", "carotripodi@textilcrisa.com", "florenciatripodi@textilcrisa.com",
    "gerencia@textilcrisa.com", "cristinatripodi@textilcrisa.com", "lreyes@textilcrisa.com",
    "vaninaprospero@textilcrisa.com", "gustavoferrari@textilcrisa.com",
)


def scheduled_for(now=None):
    local = now or datetime.now(ZoneInfo("America/Argentina/Buenos_Aires"))
    return local.replace(hour=9, minute=0, second=0, microsecond=0)


def build():
    period = report.period_key_for_date(datetime.now(ZoneInfo("America/Argentina/Buenos_Aires")).date())
    ranking = report.validate_ranking(report.get_ranking(period), period)
    detail = report.get_adjustment_detail(period)
    excel = report.generate_adjustment_excel(detail)
    html = report.generate_html(ranking, datetime.now(), report.render_adjustments_section(detail), period)
    return period, ranking, detail, excel, html


def smtp_send(settings, recipient, html, excel, subject):
    message = MIMEMultipart()
    message["From"] = settings["user"]
    message["To"] = recipient
    message["Subject"] = subject
    message.attach(MIMEText(html, "html", "utf-8"))
    attachment = MIMEApplication(excel.read_bytes(), _subtype="vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    attachment.add_header("Content-Disposition", "attachment", filename=excel.name)
    message.attach(attachment)
    with smtplib.SMTP(settings["server"], settings["port"], timeout=30) as server:
        server.starttls()
        server.login(settings["user"], settings["password"])
        server.sendmail(settings["user"], [recipient], message.as_string())


def deliver(ledger, period, scheduled, recipient, settings, html, excel):
    key = DeliveryKey("executive_report", scheduled, period, recipient)
    if not ledger.reserve(key):
        return "duplicate-blocked"
    ledger.mark(key, "attempted")
    try:
        smtp_send(settings, recipient, html, excel, f"Reporte Ejecutivo de Inventarios - {report.period_label(period)}")
    except Exception as exc:
        ledger.mark(key, "uncertain", str(exc)[:1000])
        raise
    ledger.mark(key, "accepted", "SMTP accepted")
    return "accepted"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--send", action="store_true")
    args = parser.parse_args()
    period, ranking, detail, excel, html = build()
    if not args.send:
        print({"mode": "dry-run", "period": period, "recipients": list(HISTORICAL_RECIPIENTS), "rows": len(detail["filas"]), "excel": excel.name, "completed": ranking["completed"]})
        return
    if os.environ.get("NOTIFICATION_SEND_ENABLED") != "true":
        raise RuntimeError("NOTIFICATION_SEND_ENABLED=true es obligatorio para habilitar envios grupales")
    settings = report.load_smtp_settings()
    report.verify_smtp(settings)
    ledger = NotificationLedger()
    for recipient in HISTORICAL_RECIPIENTS:
        print({"recipient": recipient, "status": deliver(ledger, period, scheduled_for(), recipient, settings, html, excel)})


if __name__ == "__main__":
    main()

