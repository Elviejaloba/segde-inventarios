"""One-shot monthly reminder runner with delivery-ledger protection."""
import argparse
import json
import os
import sys
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts_windows"))
from notification_ledger import DeliveryKey, NotificationLedger
import notificacion_muestreo as template

API = os.environ.get("INVENTARIOS_API_URL", "https://tasktrackerpro-api-production.up.railway.app").rstrip("/")
EMAILS = {"T.Sjuan": ["gerenciasj@textilcrisa.com", "cajasj@textilcrisa.com"], "Crisa2": ["gerenciacrisa@textilcrisa.com", "cajacrisa@textilcrisa.com"], "T.Mendoza": ["gerenciatijmza@textilcrisa.com", "vanesa.alvarez@textilcrisa.com"], "T.SLuis": ["gerenciasl@textilcrisa.com", "cajasl@textilcrisa.com"], "T.Maipu": ["cajamaipu@textilcrisa.com"], "T.Lujan": ["latijeralujan@textilcrisa.com"], "T.Tunuyan": ["tunuyan@textilcrisa.com"], "T.Srafael": ["gerenciasr@textilcrisa.com"], "T.S.Martin": ["cajasmartin@textilcrisa.com", "sebastianbaron87@gmail.com"], "T.GLLEN": ["circuitogllen@textilcrisa.com"]}
CC = ("lreyes@textilcrisa.com", "gerencia@textilcrisa.com", "gustavoferrari@textilcrisa.com", "adm@textilcrisa.com", "vaninaprospero@textilcrisa.com", "carolinatripodi@textilcrisa.com")
MONTHS = ("Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre")


def scheduled_for(now=None):
    local = now or datetime.now(ZoneInfo("America/Argentina/Buenos_Aires"))
    return local.replace(hour=9, minute=10, second=0, microsecond=0)


def select_branches(day, now=None):
    now = now or datetime.now(ZoneInfo("America/Argentina/Buenos_Aires"))
    period = f"{now.year}-{now.month:02d}"
    with urllib.request.urlopen(f"{API}/api/ranking?period={period}", timeout=20) as response:
        rows = json.loads(response.read().decode("utf-8"))
    threshold = {"monday": 101, "wednesday": 70, "friday": 40}[day]
    selected = []
    for row in rows:
        total = int(row.get("totalItems", 0)); completed = int(row.get("completedItems", 0))
        pct = completed / total * 100 if total else 0
        if total and pct < threshold:
            branch_id = row["branchId"]
            selected.append({"branch": "T.Gllen" if branch_id == "T.GLLEN" else branch_id, "branch_id": branch_id, "pct": pct, "completed": completed, "total": total, "to": EMAILS.get(branch_id, [])})
    return period, selected


def deliver(ledger, period, scheduled, selection, ranking, month_label):
    recipients = list(dict.fromkeys(selection["to"] + list(CC)))
    keys = [DeliveryKey("branch_reminder", scheduled, period, recipient, selection["branch_id"]) for recipient in recipients]
    if not ledger.reserve_many(keys):
        return "duplicate-blocked"
    for key in keys:
        ledger.mark(key, "attempted")
    summary = {"sucursal": selection["branch"], "verificados": selection["completed"], "total": selection["total"], "porcentaje": selection["pct"], "pendientes": selection["total"] - selection["completed"]}
    try:
        template.enviar_email(selection["to"], list(CC), f"Recordatorio de Muestreo - {selection['branch']} | {month_label}", template.generar_html(summary, ranking, month_label))
    except Exception as exc:
        for key in keys:
            ledger.mark(key, "uncertain", str(exc)[:1000])
        raise
    for key in keys:
        ledger.mark(key, "accepted", "SMTP accepted")
    return "accepted"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--day", choices=("monday", "wednesday", "friday"))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--send", action="store_true")
    args = parser.parse_args()
    if args.send and os.environ.get("NOTIFICATION_SEND_ENABLED") != "true":
        raise RuntimeError("NOTIFICATION_SEND_ENABLED=true es obligatorio para habilitar envios grupales")
    now = datetime.now(ZoneInfo("America/Argentina/Buenos_Aires"))
    scheduled_day = args.day or {0: "monday", 2: "wednesday", 4: "friday"}.get(now.weekday())
    if scheduled_day is None:
        raise RuntimeError("El runner de recordatorios solo puede ejecutarse lunes, miÃ©rcoles o viernes")
    period, selected = select_branches(scheduled_day, now)
    missing = [item["branch"] for item in selected if not item["to"]]
    if not args.send:
        print({"mode": "dry-run", "period": period, "day": scheduled_day, "cc": CC, "selected": selected, "missing_email": missing})
        return
    if missing:
        raise RuntimeError(f"Sucursales sin destinatario: {', '.join(missing)}")
    ranking = "\n".join(f"{item['branch']}: {item['pct']:.1f}%" for item in selected)
    month_label = f"{MONTHS[now.month - 1]} {now.year}"
    ledger = NotificationLedger()
    for item in selected:
        print({"branch": item["branch"], "status": deliver(ledger, period, scheduled_for(now), item, ranking, month_label)})


if __name__ == "__main__":
    main()

