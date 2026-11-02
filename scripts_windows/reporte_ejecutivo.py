# -*- coding: utf-8 -*-
"""Reporte ejecutivo de muestreos para octubre de 2026.

La fuente es exclusivamente la API productiva del Checklist en Railway.
No inicia programaciones ni envía correos salvo con ``--send-test``.
"""

import argparse
import configparser
import html
import json
import os
import smtplib
import sys
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError, as_completed
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from zoneinfo import ZoneInfo


TEST_RECIPIENT = "lreyes@textilcrisa.com"
API_BASE_URL = os.environ.get(
    "INVENTARIOS_API_URL", "https://tasktrackerpro-api-production.up.railway.app"
).rstrip("/")
APP_URL = os.environ.get("PUBLIC_APP_URL", "https://inventarios.up.railway.app/")
REPORT_COSTS_API_KEY = os.environ.get("REPORT_COSTS_API_KEY", "")
REPORT_COSTS_ENDPOINT = f"{API_BASE_URL}/api/reports/costos"
REPORT_AJUSTES_ENDPOINT = f"{API_BASE_URL}/api/reports/ajustes"
REPORT_HISTORICAL_PRICES_ENDPOINT = f"{API_BASE_URL}/api/reports/precios-historicos"
REPORT_COSTS_BATCH_SIZE = 1000
REPORT_HTTP_TIMEOUT_SECONDS = int(os.environ.get("REPORT_HTTP_TIMEOUT_SECONDS", "20"))
REPORT_HISTORY_TIMEOUT_SECONDS = int(os.environ.get("REPORT_HISTORY_TIMEOUT_SECONDS", "15"))
REPORT_HISTORY_TOTAL_TIMEOUT_SECONDS = int(os.environ.get("REPORT_HISTORY_TOTAL_TIMEOUT_SECONDS", "180"))
REPORT_HISTORY_MAX_WORKERS = int(os.environ.get("REPORT_HISTORY_MAX_WORKERS", "4"))
SCRIPT_DIR = Path(__file__).resolve().parent
ARGENTINA_TIMEZONE = ZoneInfo("America/Argentina/Buenos_Aires")
ADJUSTMENT_DETAIL_START = date(2026, 10, 1)


def detail_excel_path(period_key):
    return SCRIPT_DIR / f"Detalle_Ajustes_Inventarios_desde_{ADJUSTMENT_DETAIL_START:%Y-%m}.xlsx"


def preview_path(period_key):
    return SCRIPT_DIR / f"preview_reporte_muestreo_{period_key}.html"


def fixture_preview_path(period_key):
    return SCRIPT_DIR / f"preview_reporte_ejecutivo_ajustes_ficticio_{period_key}.html"


def period_key_for_date(current_date=None):
    if current_date is None:
        current_date = datetime.now(ARGENTINA_TIMEZONE).date()
    return f"{current_date.year}-{current_date.month:02d}"


def period_bounds(period_key):
    """Devuelve el primer y último día del mes indicado por ``YYYY-MM``."""
    try:
        year, month = (int(part) for part in period_key.split("-", 1))
        start = date(year, month, 1)
    except (AttributeError, TypeError, ValueError) as exc:
        raise ValueError(f"periodKey inválido para el detalle: {period_key!r}") from exc

    if month == 12:
        next_month = date(year + 1, 1, 1)
    else:
        next_month = date(year, month + 1, 1)
    return start, date.fromordinal(next_month.toordinal() - 1)


def report_period_bounds(period_key, current_date=None):
    """Devuelve el acumulado del mes vigente o el mes completo para períodos históricos."""
    start, end = period_bounds(period_key)
    if current_date is None:
        current_date = datetime.now(ARGENTINA_TIMEZONE).date()
    if start > current_date:
        raise ValueError(f"El período {period_key} todavía no comenzó en Argentina")
    return start, min(end, current_date)


def adjustment_detail_bounds(current_date=None):
    """Returns the approved cumulative detail range through the Argentina current date."""
    if current_date is None:
        current_date = datetime.now(ARGENTINA_TIMEZONE).date()
    return ADJUSTMENT_DETAIL_START, current_date


def period_label(period_key):
    start, _ = period_bounds(period_key)
    months = ("Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre")
    return f"{months[start.month - 1]} {start.year}"


def parse_decimal(value, field):
    try:
        decimal_value = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise RuntimeError(f"Valor decimal inválido para {field}") from exc
    if not decimal_value.is_finite():
        raise RuntimeError(f"Valor decimal no finito para {field}")
    return decimal_value


def get_replacement_costs(codes):
    """Consulta en lotes los costos exactos del backend Railway autenticado."""
    if not REPORT_COSTS_API_KEY:
        raise RuntimeError("REPORT_COSTS_API_KEY no está configurada para consultar costos del reporte")
    unique_codes = sorted(set(codes))
    costs = {}
    for offset in range(0, len(unique_codes), REPORT_COSTS_BATCH_SIZE):
        batch = unique_codes[offset:offset + REPORT_COSTS_BATCH_SIZE]
        request = urllib.request.Request(
            REPORT_COSTS_ENDPOINT,
            data=json.dumps({"codes": batch}).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "X-Report-Costs-Api-Key": REPORT_COSTS_API_KEY,
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=REPORT_HTTP_TIMEOUT_SECONDS) as response:
                if response.status != 200:
                    raise RuntimeError(f"API de costos respondió HTTP {response.status}")
                payload = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, TimeoutError) as exc:
            raise RuntimeError(f"No se pudieron consultar los costos Railway: {exc}") from exc
        rows = payload.get("costos") if isinstance(payload, dict) else None
        if not isinstance(rows, list):
            raise RuntimeError("La API de costos devolvió una respuesta inválida")
        for row in rows:
            code = row.get("codigo") if isinstance(row, dict) else None
            if code not in batch or code in costs:
                raise RuntimeError("La API de costos devolvió códigos inválidos o duplicados")
            cost = parse_decimal(row.get("costo"), f"costo {code!r}")
            if cost <= 0:
                raise RuntimeError(f"La API devolvió un costo no positivo para {code!r}")
            costs[code] = cost
    return costs


def post_report_json(endpoint, payload, label):
    if not REPORT_COSTS_API_KEY:
        raise RuntimeError("REPORT_COSTS_API_KEY no está configurada para consultar el reporte")
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "X-Report-Costs-Api-Key": REPORT_COSTS_API_KEY},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=REPORT_HTTP_TIMEOUT_SECONDS) as response:
            if response.status != 200:
                raise RuntimeError(f"{label} respondió HTTP {response.status}")
            return json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, TimeoutError) as exc:
        raise RuntimeError(f"No se pudo consultar {label}: {exc}") from exc


def get_report_adjustments(period_start, period_end):
    """Fetch pages defensively and reject a moving result set."""
    ajustes, offset, total = [], 0, None
    seen_ids = set()
    while total is None or offset < total:
        payload = post_report_json(REPORT_AJUSTES_ENDPOINT, {
            "startDate": period_start.isoformat(), "endDate": period_end.isoformat(),
            "limit": REPORT_COSTS_BATCH_SIZE, "offset": offset,
        }, "los ajustes Railway")
        rows = payload.get("ajustes") if isinstance(payload, dict) else None
        if not isinstance(rows, list):
            raise RuntimeError("La API de ajustes para reportes devolvió una respuesta inválida")
        page_total = int(payload.get("total", 0))
        if total is None:
            total = page_total
        elif page_total != total:
            raise RuntimeError("Los ajustes cambiaron durante la paginacion; ejecutar nuevamente")
        page_ids = [row.get("id") for row in rows if isinstance(row, dict)]
        if len(page_ids) != len(rows) or any(item_id is None for item_id in page_ids):
            raise RuntimeError("La API de ajustes devolvio filas sin id estable")
        if len(set(page_ids)) != len(page_ids) or seen_ids.intersection(page_ids):
            raise RuntimeError("Los ajustes cambiaron durante la paginacion; se detectaron ids repetidos")
        seen_ids.update(page_ids)
        ajustes.extend(rows)
        offset += len(rows)
        if not rows and offset < total:
            raise RuntimeError("La paginación de ajustes no avanzó")
    if len(ajustes) != total:
        raise RuntimeError("La paginacion de ajustes no coincide con el total informado")
    return ajustes


def get_historical_prices(pairs):
    prices = {}
    unique_pairs = sorted(set(pairs))
    for offset in range(0, len(unique_pairs), REPORT_COSTS_BATCH_SIZE):
        batch = unique_pairs[offset:offset + REPORT_COSTS_BATCH_SIZE]
        payload = post_report_json(
            REPORT_HISTORICAL_PRICES_ENDPOINT,
            {"pairs": [{"sucursal": branch, "codigo": code} for branch, code in batch]},
            "los precios históricos Railway",
        )
        rows = payload.get("precios") if isinstance(payload, dict) else None
        if not isinstance(rows, list):
            raise RuntimeError("La API de precios históricos devolvió una respuesta inválida")
        for row in rows:
            key = (row.get("sucursal"), row.get("codigo")) if isinstance(row, dict) else None
            if key not in batch or key in prices:
                raise RuntimeError("La API de precios históricos devolvió pares inválidos o duplicados")
            value = row.get("precio")
            price = parse_decimal(value, f"precio histórico {key[1]!r}") if value is not None else None
            prices[key] = price if price is not None and price > 0 else None
    return prices


def load_smtp_settings():
    """Lee la configuración SMTP ya existente sin escribir credenciales."""
    config = configparser.ConfigParser()
    config.read(SCRIPT_DIR / "bridge_config.ini", encoding="utf-8-sig")
    bridge = config["bridge"] if config.has_section("bridge") else {}
    return {
        "server": os.environ.get("SMTP_SERVER", bridge.get("smtp_server", "smtp.textilcrisa.com")),
        "port": int(os.environ.get("SMTP_PORT", bridge.get("smtp_port", "26"))),
        "user": os.environ.get("SMTP_USER", bridge.get("smtp_user", "reportes@textilcrisa.com")),
        "password": os.environ.get("SMTP_PASSWORD", bridge.get("smtp_password", "")),
    }


def get_ranking(period_key):
    """Obtiene el ranking real del Checklist para el período solicitado."""
    url = f"{API_BASE_URL}/api/ranking?period={period_key}"
    try:
        with urllib.request.urlopen(url, timeout=REPORT_HTTP_TIMEOUT_SECONDS) as response:
            if response.status != 200:
                raise RuntimeError(f"API respondió HTTP {response.status}")
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, TimeoutError) as exc:
        raise RuntimeError(f"No se pudo consultar la API del Checklist: {exc}") from exc
    if not isinstance(payload, list):
        raise RuntimeError("La API del Checklist no devolvió una lista de ranking")
    return payload


def validate_ranking(payload, period_key):
    """Valida los objetivos efectivamente planificados para el período consultado."""
    rows = [row for row in payload if row.get("period") == period_key and int(row.get("totalItems", 0)) > 0]
    branch_ids = [row.get("branchId") for row in rows]
    duplicate_branches = sorted({branch for branch in branch_ids if branch_ids.count(branch) > 1})
    total = sum(int(row.get("totalItems", 0)) for row in rows)
    completed = sum(int(row.get("completedItems", 0)) for row in rows)
    no_stock = sum(int(row.get("noStockItems", 0)) for row in rows)
    errors = []
    if not rows:
        errors.append(f"no hay sucursales con objetivo para {period_key}")
    if duplicate_branches:
        errors.append("duplicados por sucursal/período: " + ", ".join(duplicate_branches))
    if completed > total or no_stock > total:
        errors.append("la API devolvió métricas inconsistentes")
    if errors:
        raise RuntimeError("Validación bloqueante: " + " | ".join(errors))

    normalized = []
    for row in rows:
        total_items = int(row["totalItems"])
        completed_items = int(row["completedItems"])
        no_stock_items = int(row["noStockItems"])
        normalized.append({
            "sucursal": row["branchId"], "total": total_items,
            "completed": completed_items, "no_stock": no_stock_items,
            "pending": total_items - completed_items,
            "percentage": (completed_items / total_items * 100) if total_items else 0,
        })
    normalized.sort(key=lambda row: (-row["percentage"], -row["completed"], row["sucursal"]))
    return {
        "branches": normalized, "total": total, "completed": completed,
        "no_stock": no_stock, "pending": total - completed,
        "percentage": completed / total * 100,
    }


def get_adjustment_detail(period_key, current_date=None):
    """Obtiene el detalle mediante las API existentes, sin conexión local a PostgreSQL."""
    period_start, period_end = adjustment_detail_bounds(current_date)
    ajustes = get_report_adjustments(period_start, period_end)

    consolidated = {}
    for ajuste in ajustes:
        movement = datetime.fromisoformat(str(ajuste["FechaMovimiento"]).replace("Z", "+00:00")).date()
        if not (period_start <= movement <= period_end) or ajuste.get("Sucursal") == "CRISA 3":
            continue
        branch = str(ajuste["Sucursal"])
        code = str(ajuste["Codigo"])
        key = (branch, code)
        current = consolidated.setdefault(key, {
            "sucursal": branch, "codigo": code, "articulo": "", "cantidad_neta": Decimal("0"),
            "ultimo_ajuste": movement, "ultimo_id": -1,
        })
        current["cantidad_neta"] += parse_decimal(ajuste["Diferencia"], f"diferencia {code!r}")
        if (movement, int(ajuste.get("id") or 0)) >= (current["ultimo_ajuste"], current["ultimo_id"]):
            current["articulo"] = str(ajuste.get("Articulo") or "")
            current["ultimo_ajuste"] = movement
            current["ultimo_id"] = int(ajuste.get("id") or 0)

    visible = [item for item in consolidated.values() if item["cantidad_neta"] != 0]

    historical_prices = get_historical_prices((item["sucursal"], item["codigo"]) for item in visible)
    prices = [historical_prices[(item["sucursal"], item["codigo"])] for item in visible]
    replacement_costs = get_replacement_costs(item["codigo"] for item in visible)

    filas = []
    for item, price in zip(visible, prices):
        filas.append({
            "sucursal": item["sucursal"], "codigo": item["codigo"], "articulo": item["articulo"],
            "cantidad_neta": item["cantidad_neta"], "costo_reposicion": replacement_costs.get(item["codigo"]),
            "precio_promedio_historico": price, "ultimo_ajuste": item["ultimo_ajuste"].isoformat(),
        })
    filas.sort(key=lambda item: (item["sucursal"], item["ultimo_ajuste"], item["codigo"]))

    return {
        "period_key": period_key,
        "period_start": period_start,
        "period_end": period_end,
        "netos_cero": sum(1 for item in consolidated.values() if item["cantidad_neta"] == 0),
        "filas": filas,
    }


def fixture_adjustment_detail(period_key):
    """Datos ficticios para inspección visual sin consultar PostgreSQL."""
    period_start, period_end = period_bounds(period_key)
    return {
        "period_key": period_key,
        "period_start": period_start,
        "period_end": period_end,
        "netos_cero": 1,
        "filas": [
            {"sucursal": "Crisa2", "codigo": "TF112L 09", "articulo": "ARTÍCULO FICTICIO SIN VENTAS", "cantidad_neta": -3, "costo_reposicion": 1250, "precio_promedio_historico": None, "ultimo_ajuste": "2026-10-13"},
            {"sucursal": "T.Mendoza", "codigo": "TV18P 05", "articulo": "ARTÍCULO FICTICIO SIN COSTO", "cantidad_neta": 2, "costo_reposicion": None, "precio_promedio_historico": 1750, "ultimo_ajuste": "2026-10-12"},
            {"sucursal": "T.SLuis", "codigo": "TI505 32", "articulo": "ARTÍCULO FICTICIO CON SUFIJO", "cantidad_neta": -0.5, "costo_reposicion": 4320, "precio_promedio_historico": 6990, "ultimo_ajuste": "2026-10-11"},
        ],
    }


def format_money(value):
    if value is None:
        return "—"
    return f"$ {parse_decimal(value, 'importe'):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def format_replacement_cost(value):
    if value is None or parse_decimal(value, "costo de reposición") <= 0:
        return "Sin costo"
    return format_money(value)


def format_quantity(value):
    number = parse_decimal(value, "cantidad")
    return f"{number:+,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def summarize_adjustment_values(detail):
    """Concilia valorizaciones netas y absolutas sin modificar el HTML del reporte."""
    net_total = Decimal("0")
    absolute_total = Decimal("0")
    branches = {}
    with_cost = 0
    for item in detail["filas"]:
        cost = item.get("costo_reposicion")
        if cost is None:
            continue
        amount = parse_decimal(item["cantidad_neta"], "cantidad") * parse_decimal(cost, "costo de reposición")
        net_total += amount
        absolute_total += abs(amount)
        with_cost += 1
        branch = branches.setdefault(item["sucursal"], {"neto": Decimal("0"), "absoluto": Decimal("0")})
        branch["neto"] += amount
        branch["absoluto"] += abs(amount)
    return {
        "filas_con_costo": with_cost,
        "filas_sin_costo": len(detail["filas"]) - with_cost,
        "neto": net_total,
        "absoluto": absolute_total,
        "sucursales": branches,
    }


def render_adjustments_section(detail):
    rows = []
    for index, item in enumerate(detail["filas"]):
        background = "#f8f9fa" if index % 2 == 0 else "white"
        quantity_color = "#28a745" if item["cantidad_neta"] > 0 else "#dc3545"
        rows.append(f"""<tr style=\"background:{background};\">
<td style=\"padding:8px 6px;border-bottom:1px solid #e9ecef;\">{html.escape(str(item['sucursal']))}</td>
<td style=\"padding:8px 6px;border-bottom:1px solid #e9ecef;text-align:center;white-space:nowrap;\">{html.escape(str(item['ultimo_ajuste']))}</td>
<td style=\"padding:8px 6px;border-bottom:1px solid #e9ecef;white-space:nowrap;font-family:Consolas,monospace;\">{html.escape(str(item['codigo']))}</td>
<td style=\"padding:8px 6px;border-bottom:1px solid #e9ecef;word-break:break-word;\">{html.escape(str(item.get('articulo') or '—'))}</td>
<td style=\"padding:8px 6px;border-bottom:1px solid #e9ecef;text-align:right;color:{quantity_color};font-weight:600;white-space:nowrap;\">{format_quantity(item['cantidad_neta'])}</td>
<td style=\"padding:8px 6px;border-bottom:1px solid #e9ecef;text-align:right;white-space:nowrap;\">{format_replacement_cost(item.get('costo_reposicion'))}</td>
<td style=\"padding:8px 6px;border-bottom:1px solid #e9ecef;text-align:right;white-space:nowrap;\">{format_money(item.get('precio_promedio_historico'))}</td>
 </tr>""")

    empty_row = "<tr><td colspan=\"7\" style=\"padding:10px;text-align:center;color:#888;\">Sin ajustes netos para el período.</td></tr>"
    return f"""<h3 style=\"color:#444;font-size:15px;font-weight:500;border-bottom:2px solid #6a8a9a;padding-bottom:8px;margin:25px 0 12px;\">DETALLE DE AJUSTES POR SUCURSAL Y ARTÍCULO</h3>
<p style=\"color:#888;font-size:11px;margin:0 0 10px;\">Período: {detail['period_start'].strftime('%d/%m/%Y')} al {detail['period_end'].strftime('%d/%m/%Y')}. Fecha del comprobante = último movimiento consolidado por sucursal y código. Precio promedio histórico de venta por sucursal y código completo.</p>
<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:100%;border-collapse:collapse;table-layout:fixed;font-size:10px;\"><thead><tr style=\"background:#4a5d6a;color:white;\"><th style=\"padding:8px 5px;text-align:left;width:11%;\">Sucursal</th><th style=\"padding:8px 5px;text-align:center;width:12%;\">Fecha del comprobante</th><th style=\"padding:8px 5px;text-align:left;width:12%;\">Código</th><th style=\"padding:8px 5px;text-align:left;width:19%;\">Descripción</th><th style=\"padding:8px 5px;text-align:right;width:10%;\">Ajuste</th><th style=\"padding:8px 5px;text-align:right;width:13%;\">Costo rep.</th><th style=\"padding:8px 5px;text-align:right;width:17%;\">Precio promedio histórico de venta</th></tr></thead><tbody>{''.join(rows) or empty_row}</tbody></table>
<p style=\"color:#888;font-size:10px;margin:8px 0 0;\">Filas netas cero excluidas del detalle: {detail['netos_cero']}.</p>"""


def generate_adjustment_excel(detail):
    """Genera el adjunto desde exactamente las mismas filas usadas en el HTML."""
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Detalle de ajustes"
    headers = (
        "Sucursal", "Fecha del comprobante", "Código de artículo", "Descripción",
        "Cantidad ajustada (+/−)", "Costo de reposición", "Precio promedio histórico de venta",
    )
    sheet.append(headers)
    header_fill = PatternFill("solid", fgColor="4A5D6A")
    for cell in sheet[1]:
        cell.fill = header_fill
        cell.font = Font(color="FFFFFF", bold=True)
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    currency_format = '$ #,##0.00;[Red]-$ #,##0.00'
    quantity_format = '+#,##0.00;-#,##0.00;0.00'
    for item in detail["filas"]:
        cost = item.get("costo_reposicion")
        valid_cost = cost is not None and parse_decimal(cost, "costo de reposición") > 0
        price = item.get("precio_promedio_historico")
        row = sheet.max_row + 1
        sheet.append((
            item["sucursal"],
            date.fromisoformat(str(item["ultimo_ajuste"])[:10]),
            str(item["codigo"]),
            item.get("articulo") or "—",
            item["cantidad_neta"],
            cost if valid_cost else "Sin costo",
            price if price is not None else "—",
        ))
        sheet.cell(row, 2).number_format = "DD/MM/YYYY"
        sheet.cell(row, 3).number_format = "@"
        sheet.cell(row, 5).number_format = quantity_format
        if valid_cost:
            sheet.cell(row, 6).number_format = currency_format
        if price is not None:
            sheet.cell(row, 7).number_format = currency_format

    sheet.auto_filter.ref = f"A1:G{sheet.max_row}"
    sheet.freeze_panes = "A2"
    sheet.sheet_view.showGridLines = False
    for column, width in {"A": 24, "B": 20, "C": 22, "D": 42, "E": 23, "F": 20, "G": 34}.items():
        sheet.column_dimensions[column].width = width
    sheet.row_dimensions[1].height = 32

    path = detail_excel_path(detail["period_key"])
    workbook.save(path)
    return path


def fixture_report():
    return {
        "branches": [
            {"sucursal": "T.SLuis", "total": 48, "completed": 7, "no_stock": 1, "pending": 41, "percentage": 14.6},
            {"sucursal": "Crisa2", "total": 118, "completed": 0, "no_stock": 0, "pending": 118, "percentage": 0},
        ],
        "total": 403, "completed": 7, "no_stock": 1, "pending": 396, "percentage": 1.7,
    }


def generate_html(report, generated_at, adjustment_detail, period_key):
    PERIOD_KEY = period_key
    rows = []
    for position, branch in enumerate(report["branches"], start=1):
        color = "#28a745" if branch["percentage"] >= 70 else "#fd7e14" if branch["percentage"] >= 40 else "#dc3545"
        background = "#f8f9fa" if position % 2 else "#ffffff"
        rows.append(f"""<tr style=\"background:{background};\">
<td style=\"padding:10px 12px;border-bottom:1px solid #e9ecef;\">{position}</td>
<td style=\"padding:10px 12px;border-bottom:1px solid #e9ecef;font-weight:600;\">{html.escape(branch['sucursal'])}</td>
<td style=\"padding:10px 12px;border-bottom:1px solid #e9ecef;text-align:center;color:{color};font-weight:700;\">{branch['percentage']:.1f}%</td>
<td style=\"padding:10px 12px;border-bottom:1px solid #e9ecef;text-align:center;\">{branch['completed']}/{branch['total']}</td>
<td style=\"padding:10px 12px;border-bottom:1px solid #e9ecef;text-align:center;\">{branch['pending']}</td>
<td style=\"padding:10px 12px;border-bottom:1px solid #e9ecef;text-align:center;color:#a05a00;\">{branch['no_stock']}</td></tr>""")
    content = f"""<!doctype html>
<html lang=\"es\"><body style=\"font-family:'Segoe UI',Arial,sans-serif;padding:20px;background:#f0f2f5;\">
<div style=\"max-width:700px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);\">
<div style=\"background:#4a5d6a;color:#fff;padding:22px;text-align:center;\"><div style=\"font-size:13px;letter-spacing:7px;color:#c0c8ce;\">G R U P O</div><div style=\"font-size:28px;letter-spacing:4px;font-weight:700;\">C R I S A</div><p style=\"margin:14px 0 0;font-size:14px;\">Reporte Ejecutivo de Inventarios — Octubre 2026</p></div>
<div style=\"padding:25px 30px;\"><div style=\"background:#f8f9fa;border:1px solid #e9ecef;border-radius:10px;padding:20px;text-align:center;\"><div style=\"font-size:40px;font-weight:700;color:#4a5d6a;\">{report['percentage']:.1f}%</div><div style=\"color:#666;\">Cumplimiento global — solo Completados</div><div style=\"background:#e0e4e8;border-radius:6px;height:12px;overflow:hidden;margin:12px 0;\"><div style=\"background:#6a8a9a;width:{report['percentage']:.2f}%;height:100%;\"></div></div><div style=\"font-size:13px;color:#555;\"><strong>{report['completed']}</strong> completados de <strong>{report['total']}</strong> COD BASE solicitados · <strong>{report['pending']}</strong> pendientes · <strong>{report['no_stock']}</strong> Sin Stock</div></div>
<p style=\"font-size:12px;color:#666;\">Período: <strong>{PERIOD_KEY}</strong> · 10 sucursales · Sin Stock se informa por separado y no suma cumplimiento.</p><h3 style=\"color:#444;border-bottom:2px solid #6a8a9a;padding-bottom:8px;\">Ranking y avance por sucursal</h3>
<table style=\"width:100%;border-collapse:collapse;font-size:13px;\"><thead><tr style=\"background:#4a5d6a;color:#fff;\"><th style=\"padding:10px;text-align:left;\">Pos.</th><th style=\"padding:10px;text-align:left;\">Sucursal</th><th style=\"padding:10px;\">Cumpl.</th><th style=\"padding:10px;\">Completados</th><th style=\"padding:10px;\">Pend.</th><th style=\"padding:10px;\">Sin Stock</th></tr></thead><tbody>{''.join(rows)}</tbody></table>
<div style=\"text-align:center;margin:25px 0;\"><a href=\"{html.escape(APP_URL, quote=True)}\" style=\"display:inline-block;background:#4a5d6a;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;\">Ver sistema Railway</a></div><p style=\"font-size:11px;color:#888;text-align:center;\">Generado: {generated_at.strftime('%d/%m/%Y %H:%M:%S')} · Fuente: API productiva del Checklist Railway</p></div></div></body></html>"""
    content = content.replace("Octubre 2026", period_label(PERIOD_KEY))
    content = content.replace("10 sucursales", f"{len(report['branches'])} sucursales con objetivo")
    footer_marker = '<p style="font-size:11px;color:#888;text-align:center;">'
    return content.replace(footer_marker, adjustment_detail + footer_marker, 1)


def save_preview(content, path):
    path.write_text(content, encoding="utf-8")
    return path


def verify_smtp(settings):
    if not settings["password"]:
        raise RuntimeError("SMTP_PASSWORD no está configurada")
    with smtplib.SMTP(settings["server"], settings["port"], timeout=30) as server:
        server.starttls()
        server.login(settings["user"], settings["password"])
        server.noop()


def send_test_email(settings, content, excel_path, period_key):
    message = MIMEMultipart()
    message["Subject"] = "[PRUEBA] Reporte Ejecutivo de Inventarios — Octubre 2026"
    message["From"] = settings["user"]
    message["To"] = TEST_RECIPIENT
    message.replace_header("Subject", f"[PRUEBA] Reporte Ejecutivo de Inventarios — {period_label(period_key)}")
    message.attach(MIMEText(content, "html", "utf-8"))
    attachment = MIMEApplication(excel_path.read_bytes(), _subtype="vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    attachment.add_header("Content-Disposition", "attachment", filename=excel_path.name)
    message.attach(attachment)
    with smtplib.SMTP(settings["server"], settings["port"], timeout=30) as server:
        server.starttls()
        server.login(settings["user"], settings["password"])
        server.sendmail(settings["user"], [TEST_RECIPIENT], message.as_string())


def main():
    parser = argparse.ArgumentParser(description="Reporte de prueba de octubre 2026")
    parser.add_argument("--period", metavar="YYYY-MM", help="período explícito para una prueba histórica")
    parser.add_argument("--preview", action="store_true", help="genera la vista previa HTML sin enviar")
    parser.add_argument("--preview-fixture", action="store_true", help="genera una vista previa completa con datos ficticios")
    parser.add_argument("--send-test", action="store_true", help="envía una única prueba a lreyes@textilcrisa.com")
    args = parser.parse_args()
    if sum((args.preview, args.preview_fixture, args.send_test)) > 1:
        parser.error("usar solo una acción por ejecución")
    if not (args.preview or args.preview_fixture or args.send_test):
        parser.error("se requiere --preview o --send-test; no hay envío automático")
    period_key = args.period or period_key_for_date()
    try:
        period_bounds(period_key)
    except ValueError as exc:
        parser.error(str(exc))
    if args.preview_fixture:
        detail = fixture_adjustment_detail(period_key)
        content = generate_html(fixture_report(), datetime.now(), render_adjustments_section(detail), period_key)
        preview_file = save_preview(content, fixture_preview_path(period_key))
        excel_path = generate_adjustment_excel(detail)
        print(f"Vista previa ficticia: {preview_file}")
        print(f"Excel ficticio: {excel_path}")
        return

    report = validate_ranking(get_ranking(period_key), period_key)
    adjustment_detail = get_adjustment_detail(period_key)
    financial_summary = summarize_adjustment_values(adjustment_detail)
    excel_path = generate_adjustment_excel(adjustment_detail)
    generated_at = datetime.now()
    content = generate_html(report, generated_at, render_adjustments_section(adjustment_detail), period_key)
    preview_file = save_preview(content, preview_path(period_key))
    print(f"Vista previa: {preview_file}")
    print(f"Excel: {excel_path}")
    print(f"KPI: {report['completed']}/{report['total']} completados, {report['no_stock']} Sin Stock, {report['pending']} pendientes")
    print(f"Detalle: {len(adjustment_detail['filas'])} filas, {financial_summary['filas_con_costo']} con costo, {financial_summary['filas_sin_costo']} sin costo")
    print(f"Valorización neta: {format_money(financial_summary['neto'])}; valorización absoluta: {format_money(financial_summary['absoluto'])}")
    if args.send_test:
        settings = load_smtp_settings()
        verify_smtp(settings)
        send_test_email(settings, content, excel_path, period_key)
        print(f"Correo de prueba enviado exclusivamente a {TEST_RECIPIENT}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
