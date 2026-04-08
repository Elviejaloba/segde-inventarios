"""
BRIDGE SERVICIO - Sincronización Automática Tango -> Replit
============================================================
"""
import pyodbc
import pandas as pd
import requests
import json
import time
import os
import sys
import logging
import schedule
import configparser
from uuid import uuid4
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bridge_config.ini")

def cargar_configuracion():
    config = configparser.ConfigParser()
    if os.path.exists(CONFIG_FILE): config.read(CONFIG_FILE, encoding='utf-8')
    else: sys.exit(1)
    return config

_config = cargar_configuracion()
TARGET_BASE_URL = os.getenv("TARGET_BASE_URL", _config.get('bridge', 'base_url', fallback='http://localhost:5000')).rstrip('/')
BRIDGE_API_KEY = os.getenv("BRIDGE_API_KEY", _config.get('bridge', 'api_key', fallback='')).strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", _config.get('bridge', 'smtp_password', fallback=''))
_tango = _config['tango'] if 'tango' in _config else {}
CONN_STR = f"Driver={{SQL Server}};Server={os.getenv('TANGO_SERVER', _tango.get('server', 'tangoserver'))};Database={os.getenv('TANGO_DATABASE', _tango.get('database', 'crisa_real1'))};UID={os.getenv('TANGO_USER', _tango.get('user', 'Axoft'))};PWD={os.getenv('TANGO_PASSWORD', _tango.get('password', 'Axoft'))};"

SMTP_SERVER = _config.get('bridge', 'smtp_server', fallback='smtp.textilcrisa.com')
SMTP_PORT = _config.getint('bridge', 'smtp_port', fallback=26)
SMTP_USER = _config.get('bridge', 'smtp_user', fallback='reportes@textilcrisa.com')
NOTIFICACION_ERRORES = _config.get('bridge', 'notificacion_errores', fallback='lreyes@textilcrisa.com')
OUTBOX_ENABLED = _config.getboolean('bridge', 'outbox_enabled', fallback=True)
OUTBOX_REPROCESS_LIMIT = int(os.getenv("OUTBOX_REPROCESS_LIMIT", _config.get('bridge', 'outbox_reprocess_limit', fallback='25')))
OUTBOX_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "outbox")
os.makedirs(OUTBOX_DIR, exist_ok=True)

def get_sync_info():
    try:
        r = requests.get(f"{TARGET_BASE_URL}/sync-info", headers={'X-Bridge-Api-Key': BRIDGE_API_KEY}, timeout=30)
        return r.json() if r.status_code == 200 else {}
    except: return {}

def enviar_notificacion_exito(ajustes_env, costos_env, ventas_env, fecha_aj, fecha_costos, fecha_vtas):
    """Envía email de notificación cuando la sincronización fue exitosa"""
    if not SMTP_PASSWORD:
        logging.warning("[EMAIL] SMTP_PASSWORD no configurada, no se envía notificación")
        return
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        fecha = datetime.now().strftime("%d/%m/%Y %H:%M")
        total = ajustes_env + costos_env + ventas_env

        msg = MIMEMultipart()
        msg['Subject'] = f"✅ Bridge Sync Exitosa - {fecha}"
        msg['From'] = SMTP_USER
        msg['To'] = NOTIFICACION_ERRORES

        html = f"""
<html>
<body style="font-family: 'Segoe UI', Arial, sans-serif; padding: 0; margin: 0; background: #f0f2f5;">
<div style="max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

  <div style="background: #4a5d6a; color: white; padding: 20px; text-align: center;">
    <div style="margin-bottom: 12px;">
      <span style="font-size: 14px; letter-spacing: 8px; font-weight: 300; color: #c0c8ce;">G R U P O</span><br>
      <span style="font-size: 28px; letter-spacing: 4px; font-weight: 700; color: white;">C R I S A</span>
    </div>
    <div style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 12px; margin-top: 8px;">
      <p style="margin: 0; font-size: 14px; opacity: 0.9;">✅ Sincronización Bridge Exitosa</p>
      <p style="margin: 5px 0 0; opacity: 0.7; font-size: 12px;">Sistema de Seguimiento de Inventarios</p>
    </div>
  </div>

  <div style="padding: 25px 30px;">
    <p style="color: #555; font-size: 14px; margin: 0 0 20px;"><strong>Fecha de ejecución:</strong> {fecha}</p>

    <table style="border-collapse: collapse; width: 100%; margin: 0 0 20px;">
      <tr style="background: #4a5d6a; color: white;">
        <th style="padding: 12px 15px; text-align: left; font-size: 13px; font-weight: 500;">Tipo de Dato</th>
        <th style="padding: 12px 15px; text-align: right; font-size: 13px; font-weight: 500;">Registros</th>
        <th style="padding: 12px 15px; text-align: center; font-size: 13px; font-weight: 500;">Última Fecha</th>
      </tr>
      <tr style="background: #f8f9fa;">
        <td style="border-bottom: 1px solid #e9ecef; padding: 14px 15px; font-size: 14px;">📦 Ajustes</td>
        <td style="border-bottom: 1px solid #e9ecef; padding: 14px 15px; text-align: right; font-weight: 600; font-size: 16px; color: #4a5d6a;">{ajustes_env:,}</td>
        <td style="border-bottom: 1px solid #e9ecef; padding: 14px 15px; text-align: center; color: #0066cc; font-size: 13px;">{fecha_aj or 'N/A'}</td>
      </tr>
      <tr>
        <td style="border-bottom: 1px solid #e9ecef; padding: 14px 15px; font-size: 14px;">💰 Costos</td>
        <td style="border-bottom: 1px solid #e9ecef; padding: 14px 15px; text-align: right; font-weight: 600; font-size: 16px; color: #4a5d6a;">{costos_env:,}</td>
        <td style="border-bottom: 1px solid #e9ecef; padding: 14px 15px; text-align: center; color: #0066cc; font-size: 13px;">{fecha_costos or 'N/A'}</td>
      </tr>
      <tr style="background: #f8f9fa;">
        <td style="border-bottom: 1px solid #e9ecef; padding: 14px 15px; font-size: 14px;">🛒 Ventas</td>
        <td style="border-bottom: 1px solid #e9ecef; padding: 14px 15px; text-align: right; font-weight: 600; font-size: 16px; color: #4a5d6a;">{ventas_env:,}</td>
        <td style="border-bottom: 1px solid #e9ecef; padding: 14px 15px; text-align: center; color: #0066cc; font-size: 13px;">{fecha_vtas or 'N/A'}</td>
      </tr>
      <tr style="background: #e8edf1;">
        <td style="padding: 14px 15px; font-weight: 700; font-size: 14px; color: #4a5d6a;">Total</td>
        <td style="padding: 14px 15px; text-align: right; font-weight: 700; font-size: 18px; color: #28a745;">{total:,}</td>
        <td style="padding: 14px 15px;"></td>
      </tr>
    </table>

    <p style="color: #999; font-size: 11px; text-align: center; margin: 20px 0 0; border-top: 1px solid #eee; padding-top: 15px;">
      Mensaje automático del Bridge de Sincronización (Servicio Windows)
    </p>
  </div>
</div>
</body>
</html>"""

        msg.attach(MIMEText(html, 'html'))
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, [NOTIFICACION_ERRORES], msg.as_string())
        server.quit()
        logging.info("[EMAIL] Notificación de éxito enviada")
    except Exception as e:
        logging.error(f"[EMAIL] Error enviando notificación de éxito: {e}")

def enviar_notificacion_error(error_msg):
    """Envía email de notificación cuando la sincronización falló"""
    if not SMTP_PASSWORD:
        logging.warning("[EMAIL] SMTP_PASSWORD no configurada, no se envía notificación")
        return
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        fecha = datetime.now().strftime("%d/%m/%Y %H:%M")

        msg = MIMEMultipart()
        msg['Subject'] = f"⚠️ Bridge Sync ERROR - {fecha}"
        msg['From'] = SMTP_USER
        msg['To'] = NOTIFICACION_ERRORES

        html = f"""
<html>
<body style="font-family: 'Segoe UI', Arial, sans-serif; padding: 0; margin: 0; background: #f0f2f5;">
<div style="max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

  <div style="background: #8b3a3a; color: white; padding: 20px; text-align: center;">
    <div style="margin-bottom: 12px;">
      <span style="font-size: 14px; letter-spacing: 8px; font-weight: 300; color: #dbb8b8;">G R U P O</span><br>
      <span style="font-size: 28px; letter-spacing: 4px; font-weight: 700; color: white;">C R I S A</span>
    </div>
    <div style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 12px; margin-top: 8px;">
      <p style="margin: 0; font-size: 14px; opacity: 0.9;">⚠️ Error en Sincronización Bridge</p>
      <p style="margin: 5px 0 0; opacity: 0.7; font-size: 12px;">Sistema de Seguimiento de Inventarios</p>
    </div>
  </div>

  <div style="padding: 25px 30px;">
    <p style="color: #555; font-size: 14px; margin: 0 0 20px;"><strong>Fecha:</strong> {fecha}</p>

    <div style="background: #fff5f5; border-left: 4px solid #dc3545; border-radius: 6px; padding: 15px 20px; margin: 0 0 20px;">
      <p style="color: #8b3a3a; font-weight: 600; font-size: 13px; margin: 0 0 8px;">Detalle del error:</p>
      <pre style="background: #f8f0f0; padding: 12px; border-radius: 4px; font-family: 'Consolas', monospace; font-size: 12px; overflow-x: auto; margin: 0; color: #555; white-space: pre-wrap;">{error_msg}</pre>
    </div>

    <p style="color: #999; font-size: 11px; text-align: center; margin: 20px 0 0; border-top: 1px solid #eee; padding-top: 15px;">
      Mensaje automático del Bridge de Sincronización (Servicio Windows)
    </p>
  </div>
</div>
</body>
</html>"""

        msg.attach(MIMEText(html, 'html'))
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, [NOTIFICACION_ERRORES], msg.as_string())
        server.quit()
        logging.info("[EMAIL] Notificación de error enviada")
    except Exception as e:
        logging.error(f"[EMAIL] Error enviando notificación de error: {e}")

def normalizar_um(um_tango, articulo_desc, codigo):
    um = str(um_tango).strip().lower()
    desc = str(articulo_desc).lower()
    cod = str(codigo).upper()
    
    # Lógica de Kilos (Prioridad máxima si viene de Tango o está en la descripción)
    if any(x in um for x in ['kg', 'kilo']) or any(x in desc for x in ['x kg', 'por kg', 'por kilo']):
        return 'KG'
    # Lógica de Unidades (Blanco, Accesorios, etc)
    if any(x in um for x in ['un', 'und', 'unidad']) or any(cod.startswith(p) for p in ['BL', 'ME', 'OT', 'CO']):
        return 'UN'
    
    # Prefijos de tela (Metros)
    # 70MF (Set Poliester Fluo), TF70M, TI505 (Polar), 11RS (Ripstop) deben ser MTS
    telas_prefixes = ['TA', 'TF', 'TV', 'TD', 'TI', 'T', '11RS', '70MF', '70K', 'TF70M']
    if any(cod.startswith(p) or p in cod for p in telas_prefixes):
        return 'MTS'
    
    return 'UN'

def enviar_reporte_semanal():
    """Llama al endpoint del servidor para enviar el reporte semanal de ajustes"""
    try:
        logging.info("[REPORTE] Enviando reporte semanal...")
        r = requests.post(f"{TARGET_BASE_URL}/api/bridge/reporte-semanal",
                          headers={'X-Bridge-Api-Key': BRIDGE_API_KEY, 'Content-Type': 'application/json'},
                          timeout=120)
        if r.status_code == 200:
            logging.info("[REPORTE] Reporte semanal enviado exitosamente")
        else:
            logging.error(f"[REPORTE] Error al enviar reporte: {r.status_code} - {r.text}")
    except Exception as e:
        logging.error(f"[REPORTE] Error: {e}")

def enviar_recordatorios_muestreo():
    """Llama al endpoint del servidor para enviar recordatorios de muestreo a sucursales"""
    try:
        logging.info("[MUESTREO] Enviando recordatorios de muestreo...")
        r = requests.post(f"{TARGET_BASE_URL}/api/bridge/recordatorios-muestreo",
                          headers={'X-Bridge-Api-Key': BRIDGE_API_KEY, 'Content-Type': 'application/json'},
                          timeout=120)
        if r.status_code == 200:
            logging.info("[MUESTREO] Recordatorios enviados exitosamente")
        else:
            logging.error(f"[MUESTREO] Error al enviar recordatorios: {r.status_code} - {r.text}")
    except Exception as e:
        logging.error(f"[MUESTREO] Error: {e}")

def json_serial(obj):
    if hasattr(obj, 'isoformat'):
        return obj.isoformat()
    return str(obj)

def _guardar_outbox(payload, batch_id, data_type, reason):
    if not OUTBOX_ENABLED:
        return
    try:
        item = {
            "batch_id": batch_id,
            "data_type": data_type,
            "reason": reason,
            "saved_at": datetime.utcnow().isoformat() + "Z",
            "payload": payload
        }
        filename = f"{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}_{batch_id}.json"
        filepath = os.path.join(OUTBOX_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(item, f, ensure_ascii=False, default=json_serial)
        logging.warning(f"[OUTBOX] Lote guardado para reintento: {filepath}")
    except Exception as e:
        logging.error(f"[OUTBOX] No se pudo guardar lote fallido: {e}")

def reprocesar_outbox():
    if not OUTBOX_ENABLED:
        return
    try:
        pendientes = sorted([x for x in os.listdir(OUTBOX_DIR) if x.endswith(".json")])[:OUTBOX_REPROCESS_LIMIT]
        if not pendientes:
            return

        logging.info(f"[OUTBOX] Reprocesando {len(pendientes)} lote(s) pendientes")
        for nombre in pendientes:
            ruta = os.path.join(OUTBOX_DIR, nombre)
            try:
                with open(ruta, "r", encoding="utf-8") as f:
                    item = json.load(f)
                payload = item.get("payload")
                batch_id = item.get("batch_id", f"requeue-{uuid4().hex}")
                if not payload:
                    logging.warning(f"[OUTBOX] Payload vacio en {nombre}, se elimina")
                    os.remove(ruta)
                    continue

                headers = {
                    'Content-Type': 'application/json',
                    'X-Bridge-Api-Key': BRIDGE_API_KEY,
                    'X-Idempotency-Key': batch_id
                }
                r = requests.post(
                    f"{TARGET_BASE_URL}/sync",
                    data=json.dumps(payload, default=json_serial),
                    headers=headers,
                    timeout=300
                )
                if r.status_code == 200:
                    os.remove(ruta)
                    logging.info(f"[OUTBOX] Reproceso OK ({nombre})")
                else:
                    logging.warning(f"[OUTBOX] Reproceso pendiente ({nombre}): {r.status_code} {r.text[:120]}")
            except Exception as e:
                logging.warning(f"[OUTBOX] Error reprocesando {nombre}: {e}")
    except Exception as e:
        logging.error(f"[OUTBOX] Error general: {e}")

def enviar_en_lotes(nombre, registros, batch_size=5000):
    total = len(registros)
    if total == 0:
        logging.info(f"    {nombre}: Sin registros para sincronizar")
        return True, 0
    enviados = 0
    for i in range(0, total, batch_size):
        lote = registros[i:i+batch_size]
        lote_num = (i // batch_size) + 1
        total_lotes = (total + batch_size - 1) // batch_size
        batch_id = f"{nombre}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid4().hex[:10]}"
        payload = {nombre: lote, "incremental": True}
        entregado = False
        for intento in range(3):
            try:
                if intento > 0:
                    wait_time = 5 * (2 ** intento)
                    logging.info(f"    Reintento {intento + 1}/3 en {wait_time}s...")
                    time.sleep(wait_time)
                logging.info(f"    {nombre}: Lote {lote_num}/{total_lotes} ({len(lote)} registros)...")
                json_data = json.dumps(payload, default=json_serial)
                response = requests.post(f"{TARGET_BASE_URL}/sync", data=json_data,
                    headers={
                        'Content-Type': 'application/json',
                        'X-Bridge-Api-Key': BRIDGE_API_KEY,
                        'X-Idempotency-Key': batch_id
                    }, timeout=300)
                if response.status_code == 200:
                    enviados += len(lote)
                    entregado = True
                    break
                elif response.status_code in [502, 503, 504]:
                    logging.warning(f"    Timeout servidor (HTTP {response.status_code})")
                    if intento == 2: break
                else:
                    logging.error(f"    Error en lote {lote_num}: {response.status_code} - {response.text[:200]}")
                    break
            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
                logging.warning(f"    Timeout/Conexión en lote {lote_num}: {type(e).__name__}")
                if intento == 2: break
            except Exception as e:
                logging.error(f"    Error enviando lote {lote_num}: {e}")
                break
        if not entregado:
            _guardar_outbox(payload, batch_id, nombre, f"Fallo tras 3 intentos en lote {lote_num}/{total_lotes}")
    return True, enviados

QUERY_AJUSTES = """SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED
SET DATEFORMAT DMY
SET DATEFIRST 7
SET DEADLOCK_PRIORITY -8;
SELECT
    SUCURSAL.DESC_SUCURSAL AS [Sucursal],
    CTA09.T_COMP AS [Comprobante],
    CTA11.COD_ARTICU AS [Cód. Artículo],
    CTA_ARTICULO.DESC_CTA_ARTICULO AS [Artículo],
    CTA11.FECHA_MOV AS [Fecha movimiento],
    CTA11.TIPO_MOV AS [Tipo de Movimiento],
    SUM(CASE CTA11.TIPO_MOV WHEN 'E' THEN CTA11.CANTIDAD ELSE -CTA11.CANTIDAD END) AS [Cantidad],
    CTA09.N_COMP AS [Nro. comprobante],
    MEDIDA_STOCK.SIGLA_MEDIDA AS [U.M. stock]
FROM CTA11
LEFT JOIN CTA09 ON CTA09.TCOMP_IN_S = CTA11.TCOMP_IN_S AND CTA09.NCOMP_IN_S = CTA11.NCOMP_IN_S AND CTA09.NRO_SUCURS = CTA11.NRO_SUCURS
LEFT JOIN SUCURSAL ON (CTA11.NRO_SUCURS = SUCURSAL.NRO_SUCURSAL)
LEFT JOIN CTA_ARTICULO ON (CTA11.COD_ARTICU = CTA_ARTICULO.COD_ARTICULO)
LEFT JOIN CTA_DEPOSITO ON (CTA11.COD_DEPOSI = CTA_DEPOSITO.COD_CTA_DEPOSITO)
LEFT JOIN (Select id_sucursal, id_cta_articulo, id_cta_deposito, Max(fecha) as fecha_max from CTA_SALDO_ARTICULO_DEPOSITO group by id_sucursal, id_cta_articulo, id_cta_deposito) as SALDO on (CTA_ARTICULO.ID_CTA_ARTICULO = SALDO.ID_CTA_ARTICULO AND CTA_DEPOSITO.ID_CTA_DEPOSITO = SALDO.ID_CTA_DEPOSITO AND SUCURSAL.ID_SUCURSAL = SALDO.ID_SUCURSAL)
LEFT JOIN CTA_SALDO_ARTICULO_DEPOSITO ON(SALDO.ID_CTA_ARTICULO = CTA_SALDO_ARTICULO_DEPOSITO.ID_CTA_ARTICULO AND SALDO.ID_CTA_DEPOSITO = CTA_SALDO_ARTICULO_DEPOSITO.ID_CTA_DEPOSITO AND SALDO.ID_SUCURSAL = CTA_SALDO_ARTICULO_DEPOSITO.ID_SUCURSAL AND SALDO.fecha_max = CTA_SALDO_ARTICULO_DEPOSITO.fecha)
LEFT JOIN CTA_ARTICULO_SUCURSAL ON (CTA_SALDO_ARTICULO_DEPOSITO.ID_CTA_ARTICULO = CTA_ARTICULO_SUCURSAL.ID_CTA_ARTICULO AND CTA_SALDO_ARTICULO_DEPOSITO.ID_SUCURSAL = CTA_ARTICULO_SUCURSAL.ID_SUCURSAL)
LEFT JOIN CTA_MEDIDA AS MEDIDA_STOCK ON (CTA_ARTICULO_SUCURSAL.ID_CTA_MEDIDA_STOCK = MEDIDA_STOCK.ID_CTA_MEDIDA)
WHERE
    CTA09.ESTADO_MOV <> 'A'
    AND CTA09.T_COMP = 'AJU'
    AND CTA11.FECHA_MOV >= '{fecha_desde}'
GROUP BY
    SUCURSAL.DESC_SUCURSAL, CTA09.T_COMP, CTA11.COD_ARTICU, CTA_ARTICULO.DESC_CTA_ARTICULO,
    CTA11.FECHA_MOV, CTA11.TIPO_MOV, CTA09.N_COMP, MEDIDA_STOCK.SIGLA_MEDIDA"""

QUERY_COSTOS = """SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED
SET DATEFORMAT DMY
SET DATEFIRST 7
SET DEADLOCK_PRIORITY -8;
SELECT
    STA11.COD_ARTICU AS [Cód. Artículo],
    STA11.DESCRIPCIO AS [Descripción],
    STA11.SINONIMO AS [Sinónimo],
    ISNULL(FAMILIA_ART.COD_AGR, '') AS [Cód. familia (Artículo)],
    (CASE sta11.base when '' then STA11.COD_ARTICU ELSE STA11.BASE end) AS [Cód. Base / Artículo],
    (CASE sta11.base when '' then STA11.DESCRIPCIO ELSE Base.Descripcio end) AS [Desc. Base / Artículo],
    SUM(ISNULL(CANT_STOCK, 0)) AS [Saldo],
    gva16.cotiz AS [gva16.cotiz],
    ROUND(ISNULL((SELECT TOP 1
        (CASE 'BIMONCTE'
            WHEN 'BIMONCTE' THEN (case when sta12.mon_cte = 1 then PRECIO_REP else (PRECIO_REP * CASE WHEN 0 > 0 THEN 0 ELSE GVA16.COTIZ END) end)
            ELSE (case when sta12.mon_cte = 0 then PRECIO_REP else (PRECIO_REP / CASE WHEN 0 > 0 THEN 0 ELSE GVA16.COTIZ END) end)
        END) AS PRECIO
        FROM STA12 WHERE STA12.COD_ARTICU = STA11.COD_ARTICU), 0),
        ISNULL((SELECT PRECIOS FROM TGANUM), 2)) AS [Costo],
    SUM(ISNULL(CANT_STOCK, 0) * ISNULL(ROUND(
        (CASE 'BIMONCTE'
            WHEN 'BIMONCTE' THEN (case when sta12.mon_cte = 1 then PRECIO_REP else (PRECIO_REP * CASE WHEN 0 > 0 THEN 0 ELSE GVA16.COTIZ END) end)
            ELSE (case when sta12.mon_cte = 0 then PRECIO_REP else (PRECIO_REP / CASE WHEN 0 > 0 THEN 0 ELSE GVA16.COTIZ END) end)
        END), PRECIOS), 0)) AS [Saldo Valorizado]
FROM
STA11
LEFT JOIN STA19 ON STA11.COD_ARTICU = STA19.COD_ARTICU
LEFT JOIN GVA16 ON 1=1
LEFT JOIN STA12 ON STA12.COD_ARTICU = STA11.COD_ARTICU
LEFT JOIN TGANUM ON 1=1
LEFT JOIN (SELECT COD_ARTICU, DESCRIPCIO FROM STA11 WHERE USA_ESC = 'B') AS BASE ON (BASE.COD_ARTICU = STA11.BASE)
LEFT JOIN STA16 ON 1 = 1
LEFT JOIN STA29 FAMILIA_ART ON SUBSTRING(STA11.COD_ARTICU, 1, STA16.LONG_FAM_A) = FAMILIA_ART.COD_AGR
LEFT JOIN STA29 GRUPO_ART ON SUBSTRING(STA11.COD_ARTICU, 1, LONG_FAM_A + LONG_GRU_A) = GRUPO_ART.COD_AGR
WHERE
    STA11.Stock = 1 AND STA11.PERFIL <> 'N'
GROUP BY
    STA11.COD_ARTICU, STA11.DESCRIPCIO, STA11.SINONIMO, ISNULL(FAMILIA_ART.COD_AGR, ''),
    (CASE sta11.base when '' then STA11.COD_ARTICU ELSE STA11.BASE end),
    (CASE sta11.base when '' then STA11.DESCRIPCIO ELSE Base.Descripcio end), gva16.cotiz"""

QUERY_VENTAS = """SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED
SET DATEFORMAT DMY
SET DATEFIRST 7
SET DEADLOCK_PRIORITY -8;
SELECT
    CTA03.FECHA_MOV AS [Fecha],
    CTA02.NRO_SUCURS AS [Nro. Sucursal],
    SUCURSAL.DESC_SUCURSAL AS [Desc. sucursal],
    CTA03.Cod_Articu AS [Cod. Articulo],
    CTA_ARTICULO.DESC_CTA_ARTICULO AS [Descripcion],
    CTA_ARTICULO.SINONIMO AS [Sinonimo],
    ISNULL(FAMILIA_ART.COD_AGR,'') AS [Cod. Familia (Articulo)],
    FAMILIA_ART.NOM_AGR AS [Descripcion Familia (Articulo)],
    SUM(CASE CTA03.TCOMP_IN_V WHEN 'CC' THEN(-1) ELSE(1) END * CTA03.CANTIDAD / CASE WHEN CAN_EQUI_V = 0 THEN 1 ELSE CAN_EQUI_V END) AS [Cantidad venta],
    MEDIDA_STOCK.SIGLA_MEDIDA AS [U.M. stock],
    SUM(CASE CTA03.TCOMP_IN_V WHEN 'CC' THEN (-1) ELSE (1) END *
        CASE 'BIMONCTE'
            WHEN 'BIMONCTE' THEN
                CASE CTA02.MON_CTE
                    WHEN 1 THEN CTA03.IMP_NETO_P * (CASE WHEN CTA02.IMPORTE_IV = 0 THEN 1 ELSE (1 + (CTA03.PORC_IVA/100)) END)
                    ELSE CTA03.IMP_NETO_P * (CASE WHEN CTA02.IMPORTE_IV = 0 THEN 1 ELSE (1 + (CTA03.PORC_IVA/100)) END) * CTA02.COTIZ
                END
            WHEN 'BIORIGEN' THEN
                CASE CTA02.MON_CTE
                    WHEN 1 THEN CASE CTA02.COTIZ WHEN 0 THEN 0 ELSE CTA03.IMP_NETO_P * (CASE WHEN CTA02.IMPORTE_IV = 0 THEN 1 ELSE (1 + (CTA03.PORC_IVA/100)) END) / CTA02.COTIZ END
                    ELSE CTA03.IMP_NETO_P * (CASE WHEN CTA02.IMPORTE_IV = 0 THEN 1 ELSE (1 + (CTA03.PORC_IVA/100)) END)
                END
            WHEN 'BICOTIZ' THEN
                CASE 1 WHEN 0 THEN 0 ELSE
                    CASE CTA02.MON_CTE
                        WHEN 1 THEN CTA03.IMP_NETO_P * (CASE WHEN CTA02.IMPORTE_IV = 0 THEN 1 ELSE (1 + (CTA03.PORC_IVA/100)) END) / 1
                        ELSE CTA03.IMP_NETO_P * (CASE WHEN CTA02.IMPORTE_IV = 0 THEN 1 ELSE (1 + (CTA03.PORC_IVA/100)) END) * CTA02.COTIZ / 1
                    END
                END
        END) AS [Imp. prop. c/IVA]
FROM
    CTA03 (NOLOCK)
    INNER JOIN CTA02 (NOLOCK) ON (CTA02.N_COMP = CTA03.N_COMP AND CTA02.T_COMP = CTA03.T_COMP AND CTA03.NRO_SUCURS = CTA02.NRO_SUCURS)
    INNER JOIN SUCURSAL (NOLOCK) ON CTA02.NRO_SUCURS = SUCURSAL.NRO_SUCURSAL
    LEFT JOIN CTA_ARTICULO (NOLOCK) ON CTA03.Cod_Articu = CTA_ARTICULO.COD_ARTICULO
    LEFT JOIN STA16 ON 1=1
    LEFT JOIN STA29 FAMILIA_ART (NOLOCK) ON SUBSTRING(CTA_ARTICULO.COD_ARTICULO, 1, LONG_FAM_A) = FAMILIA_ART.COD_AGR
    LEFT JOIN (SELECT * FROM CTA_MEDIDA) AS MEDIDA_STOCK ON CTA03.ID_MEDIDA_STOCK = MEDIDA_STOCK.ID_CTA_MEDIDA
WHERE
    CTA03.Cod_Articu NOT IN ('Art. Ajuste')
    AND (CTA03.Cod_Articu <> '')
    AND CTA02.T_COMP <> 'REC'
    AND (CTA03.FECHA_MOV >= '{fecha_desde}')
    AND ((ISNULL(CTA03.RENGL_PADR,0) = 0) OR (ISNULL(CTA03.INSUMO_KIT_SEPARADO,0) = 1))
GROUP BY
    CTA03.FECHA_MOV, CTA02.NRO_SUCURS, SUCURSAL.DESC_SUCURSAL, CTA03.Cod_Articu, CTA_ARTICULO.DESC_CTA_ARTICULO, CTA_ARTICULO.SINONIMO, ISNULL(FAMILIA_ART.COD_AGR,''), FAMILIA_ART.NOM_AGR, MEDIDA_STOCK.SIGLA_MEDIDA"""

def ejecutar_sincronizacion():
    total_ajustes = 0
    total_costos = 0
    total_ventas = 0
    fecha_aj_str = None
    fecha_costos_str = None
    fecha_vtas_str = None

    try:
        reprocesar_outbox()
        sync_info = get_sync_info()
        conn = pyodbc.connect(CONN_STR, timeout=30)
        conn.timeout = 120

        logging.info(f"[SYNC-INFO] Respuesta del servidor: {json.dumps(sync_info, default=str)}")

        # ============================================================
        # AJUSTES
        # ============================================================
        ultima_fecha_aj = sync_info.get('ultima_fecha_ajustes')
        if ultima_fecha_aj:
            logging.info("[AJUSTES] Consultando...")
            fecha_desde_aj = (datetime.strptime(ultima_fecha_aj[:10], "%Y-%m-%d") - timedelta(days=7)).strftime("%d/%m/%Y")
            fecha_aj_str = ultima_fecha_aj[:10]
            logging.info(f"    Desde: {fecha_desde_aj}")

            query_aj = QUERY_AJUSTES.format(fecha_desde=fecha_desde_aj)
            df = pd.read_sql(query_aj, conn)
            logging.info(f"    Registros obtenidos: {len(df)}")

            if not df.empty:
                registros = []
                for _, r in df.iterrows():
                    registros.append({
                        "Sucursal": r['Sucursal'], "Comprobante": r['Comprobante'], "NroComprobante": str(r['Nro. comprobante']),
                        "FechaMovimiento": r['Fecha movimiento'].isoformat(), "TipoMovimiento": r['Tipo de Movimiento'],
                        "Codigo": r['Cód. Artículo'], "Articulo": r['Artículo'], "Diferencia": float(r['Cantidad']),
                        "UnidadMedida": normalizar_um(r['U.M. stock'], r['Artículo'], r['Cód. Artículo'])
                    })
                _, enviados = enviar_en_lotes("ajustes", registros)
                total_ajustes = enviados
                logging.info(f"    [OK] Ajustes sincronizados: {enviados}")
        else:
            logging.warning("[AJUSTES] No se pudo obtener la última fecha del servidor. No se sincroniza.")

        # ============================================================
        # COSTOS (solo los lunes)
        # ============================================================
        dia_semana = datetime.now().weekday()
        if dia_semana == 0:
            logging.info("[COSTOS] Consultando (sincronización semanal - Lunes)...")
            df_costos = pd.read_sql(QUERY_COSTOS, conn)
            logging.info(f"    Registros obtenidos: {len(df_costos)}")
            if not df_costos.empty:
                registros_costos = df_costos.to_dict(orient="records")
                _, enviados = enviar_en_lotes("costos", registros_costos)
                total_costos = enviados
                fecha_costos_str = datetime.now().strftime("%Y-%m-%d")
                logging.info(f"    [OK] Costos sincronizados: {enviados}")
        else:
            logging.info("[COSTOS] Omitido (solo se sincroniza los lunes)")

        # ============================================================
        # VENTAS (incremental)
        # ============================================================
        ultima_fecha_ventas = sync_info.get('ultima_fecha_ventas')
        if ultima_fecha_ventas:
            logging.info("[VENTAS] Consultando...")
            fecha_desde_vtas = datetime.strptime(ultima_fecha_ventas[:10], "%Y-%m-%d").strftime("%d/%m/%Y")
            fecha_vtas_str = ultima_fecha_ventas[:10]
            logging.info(f"    Desde: {fecha_desde_vtas}")

            query_vtas = QUERY_VENTAS.format(fecha_desde=fecha_desde_vtas)
            df_ventas = pd.read_sql(query_vtas, conn)
            logging.info(f"    Registros obtenidos: {len(df_ventas)}")

            if not df_ventas.empty:
                registros_ventas = df_ventas.to_dict(orient="records")
                _, enviados = enviar_en_lotes("ventas", registros_ventas)
                total_ventas = enviados
                logging.info(f"    [OK] Ventas sincronizadas: {enviados}")
        else:
            logging.warning("[VENTAS] No se pudo obtener la última fecha del servidor. No se sincroniza.")

        conn.close()
        logging.info("Sincronización completada exitosamente")
        enviar_notificacion_exito(total_ajustes, total_costos, total_ventas, fecha_aj_str, fecha_costos_str, fecha_vtas_str)
    except Exception as e:
        logging.error(f"Error en sincronización: {e}")
        import traceback
        traceback.print_exc()
        enviar_notificacion_error(str(e))

if __name__ == "__main__":
    if not BRIDGE_API_KEY:
        logging.error("BRIDGE_API_KEY no configurada. Definila en bridge_config.ini o variable de entorno.")
        sys.exit(1)

    if "--ahora" in sys.argv:
        ejecutar_sincronizacion()
        if "--reporte" in sys.argv: enviar_reporte_semanal()
        if "--muestreo" in sys.argv: enviar_recordatorios_muestreo()
    else:
        # Sincronización de datos: Lunes a Sábado 7:00 AM
        schedule.every().monday.at("07:00").do(ejecutar_sincronizacion)
        schedule.every().tuesday.at("07:00").do(ejecutar_sincronizacion)
        schedule.every().wednesday.at("07:00").do(ejecutar_sincronizacion)
        schedule.every().thursday.at("07:00").do(ejecutar_sincronizacion)
        schedule.every().friday.at("07:00").do(ejecutar_sincronizacion)
        schedule.every().saturday.at("07:00").do(ejecutar_sincronizacion)

        # Reporte semanal: Lunes 9:00 AM
        schedule.every().monday.at("09:00").do(enviar_reporte_semanal)

        # Recordatorios de muestreo: Lunes 9:00 AM
        schedule.every().monday.at("09:00").do(enviar_recordatorios_muestreo)

        logging.info("Servicio iniciado - Horarios programados:")
        logging.info(f"  Destino API: {TARGET_BASE_URL}")
        logging.info(f"  Outbox resiliente: {'ACTIVO' if OUTBOX_ENABLED else 'DESACTIVADO'} ({OUTBOX_DIR})")
        logging.info("  Sync datos: Lun-Sáb 07:00")
        logging.info("  Reporte semanal: Lunes 09:00")
        logging.info("  Recordatorios muestreo: Lunes 09:00")
        while True:
            schedule.run_pending()
            time.sleep(60)
