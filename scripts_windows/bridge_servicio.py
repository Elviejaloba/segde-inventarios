"""
BRIDGE SERVICIO - Sincronización Automática Tango -> Replit
============================================================
Se instala como Servicio de Windows usando NSSM.
Corre en segundo plano, se programa solo (Lun/Mié/Vie a las 7:00 AM),
se auto-reinicia si falla, y no requiere intervención.

Tu PC actúa como gateway: solo hace conexiones SALIENTES a Replit.
No necesitás abrir puertos ni exponer nada de tu red.

Requisitos: pip install pyodbc pandas requests schedule
Instalación como servicio: ver INSTALACION_SERVICIO.md
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
from datetime import datetime, timedelta

# ==============================================================
# CONFIGURACIÓN
# ==============================================================
REPL_URL = "https://seguimientodeinv.replit.app"

CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bridge_config.ini")

d    import configparser
    config = configparser.ConfigParser()
    if os.path.exists(CONFIG_FILE):
        config.read(CONFIG_FILE, encoding='utf-8')
    else:
        config['bridge'] = {'api_key': '', 'smtp_password': ''}
        config['tango'] = {'server': 'tangoserver', 'database': 'crisa_real1', 'user': 'Axoft', 'password': 'Axoft'}
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            config.write(f)
        print(f"ARCHIVO DE CONFIGURACIÓN CREADO: {CONFIG_FILE}")
        print("Editá el archivo y completá api_key y smtp_password antes de continuar.")
        sys.exit(1)
    return config

_config = cargar_configuracion()
BRIDGE_API_KEY = _config.get('bridge', 'api_key', fallback='')
if not BRIDGE_API_KEY:
    print(f"ERROR: api_key vacía en {CONFIG_FILE}")
    sys.exit(1)

_tango = _config['tango'] if 'tango' in _config else {}
CONN_STR = (
    "Driver={SQL Server};"
    f"Server={_tango.get('server', 'tangoserver')};"
    f"Database={_tango.get('database', 'crisa_real1')};"
    f"UID={_tango.get('user', 'Axoft')};"
    f"PWD={_tango.get('password', 'Axoft')};"
)

BATCH_SIZE = 5000
MAX_RETRIES = 3

SMTP_SERVER = "smtp.textilcrisa.com"
SMTP_PORT = 26
SMTP_USER = "reportes@textilcrisa.com"
SMTP_PASSWORD = _config.get('bridge', 'smtp_password', fallback='')
DESTINATARIO_EMAIL = "lreyes@textilcrisa.com"

# ==============================================================
# LOGGING - Guarda log en archivo para diagnóstico
# ==============================================================
LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(LOG_DIR, "bridge_servicio.log"), encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
log = logging.getLogger("bridge")


def json_serial(obj):
    if hasattr(obj, 'isoformat'):
        return obj.isoformat()
    return str(obj)


def api_headers():
    return {
        'Content-Type': 'application/json',
        'X-Bridge-Api-Key': BRIDGE_API_KEY
    }


def get_sync_info():
    try:
        response = requests.get(f"{REPL_URL}/sync-info", headers=api_headers(), timeout=30)
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 401:
            log.error("API Key rechazada. Verificar BRIDGE_API_KEY.")
    except Exception as e:
        log.warning(f"No se pudo obtener sync-info: {e}")
    return {}


def enviar_en_lotes(nombre, registros, batch_size=5000):
    total = len(registros)
    if total == 0:
        log.info(f"  {nombre}: Sin registros para sincronizar")
        return True, 0

    enviados = 0
    for i in range(0, total, batch_size):
        lote = registros[i:i+batch_size]
        lote_num = (i // batch_size) + 1
        total_lotes = (total + batch_size - 1) // batch_size

        for intento in range(MAX_RETRIES):
            try:
                if intento > 0:
                    wait_time = 5 * (2 ** intento)
                    log.info(f"  Reintento {intento + 1}/{MAX_RETRIES} en {wait_time}s...")
                    time.sleep(wait_time)

                log.info(f"  {nombre}: Lote {lote_num}/{total_lotes} ({len(lote)} registros)...")

                data = {nombre: lote, "incremental": True}
                json_data = json.dumps(data, default=json_serial)

                response = requests.post(
                    f"{REPL_URL}/sync",
                    data=json_data,
                    headers=api_headers(),
                    timeout=300
                )

                if response.status_code == 200:
                    enviados += len(lote)
                    break
                elif response.status_code == 401:
                    log.error("API Key rechazada. Verificar BRIDGE_API_KEY.")
                    return False, enviados
                elif response.status_code in [502, 503, 504]:
                    log.warning(f"  Timeout servidor (HTTP {response.status_code})")
                    if intento == MAX_RETRIES - 1:
                        break
                else:
                    log.error(f"  Error lote {lote_num}: HTTP {response.status_code}")
                    break

            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
                log.warning(f"  Timeout/Conexión lote {lote_num}: {type(e).__name__}")
                if intento == MAX_RETRIES - 1:
                    break
            except Exception as e:
                log.error(f"  Error enviando lote {lote_num}: {e}")
                break

    return True, enviados


# ==============================================================
# QUERIES SQL SERVER (TANGO)
# ==============================================================
QUERY_AJUSTES = """
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED
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
FROM 
CTA11 
LEFT JOIN CTA09 ON CTA09.TCOMP_IN_S = CTA11.TCOMP_IN_S AND CTA09.NCOMP_IN_S = CTA11.NCOMP_IN_S AND CTA09.NRO_SUCURS = CTA11.NRO_SUCURS 
LEFT JOIN SUCURSAL ON (CTA11.NRO_SUCURS = SUCURSAL.NRO_SUCURSAL) 
LEFT JOIN CTA_ARTICULO ON (CTA11.COD_ARTICU = CTA_ARTICULO.COD_ARTICULO) 
LEFT JOIN CTA_DEPOSITO ON (CTA11.COD_DEPOSI = CTA_DEPOSITO.COD_CTA_DEPOSITO) 
LEFT JOIN (Select id_sucursal, id_cta_articulo, id_cta_deposito, Max(fecha) as fecha_max from CTA_SALDO_ARTICULO_DEPOSITO group by id_sucursal, id_cta_articulo, id_cta_deposito) as SALDO on (CTA_ARTICULO.ID_CTA_ARTICULO = SALDO.ID_CTA_ARTICULO AND CTA_DEPOSITO.ID_CTA_DEPOSITO = SALDO.ID_CTA_DEPOSITO AND SUCURSAL.ID_SUCURSAL = SALDO.ID_SUCURSAL) 
LEFT JOIN CTA_SALDO_ARTICULO_DEPOSITO ON(SALDO.ID_CTA_ARTICULO = CTA_SALDO_ARTICULO_DEPOSITO.ID_CTA_ARTICULO AND SALDO.ID_CTA_DEPOSITO = CTA_SALDO_ARTICULO_DEPOSITO.ID_CTA_DEPOSITO AND SALDO.ID_SUCURSAL = CTA_SALDO_ARTICULO_DEPOSITO.ID_SUCURSAL AND SALDO.fecha_max = CTA_SALDO_ARTICULO_DEPOSITO.fecha) 
LEFT JOIN GVA81 ON (GVA81.COD_CLASIF = CTA11.COD_CLASIF)
LEFT JOIN CTA_ARTICULO_SUCURSAL ON (CTA_SALDO_ARTICULO_DEPOSITO.ID_CTA_ARTICULO = CTA_ARTICULO_SUCURSAL.ID_CTA_ARTICULO AND CTA_SALDO_ARTICULO_DEPOSITO.ID_SUCURSAL = CTA_ARTICULO_SUCURSAL.ID_SUCURSAL) 
LEFT JOIN CTA_MEDIDA AS MEDIDA_STOCK ON (CTA_ARTICULO_SUCURSAL.ID_CTA_MEDIDA_STOCK = MEDIDA_STOCK.ID_CTA_MEDIDA) 
WHERE 
    CTA09.ESTADO_MOV <> 'A'
    AND CTA09.T_COMP = 'AJU'
    AND CTA11.FECHA_MOV >= '{fecha_desde}'
    AND CTA11.NRO_SUCURS IN ('2', '3', '4', '5', '6', '12', '13')
GROUP BY 
    SUCURSAL.DESC_SUCURSAL, CTA09.T_COMP, CTA11.COD_ARTICU, CTA_ARTICULO.DESC_CTA_ARTICULO, 
    CTA11.FECHA_MOV, CTA11.TIPO_MOV, CTA09.N_COMP, MEDIDA_STOCK.SIGLA_MEDIDA
"""

QUERY_COSTOS = """
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED
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
    (CASE sta11.base when '' then STA11.DESCRIPCIO ELSE Base.Descripcio end), gva16.cotiz
"""

QUERY_VENTAS = """
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED
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
    CTA03.FECHA_MOV, CTA02.NRO_SUCURS, SUCURSAL.DESC_SUCURSAL, CTA03.Cod_Articu, CTA_ARTICULO.DESC_CTA_ARTICULO, CTA_ARTICULO.SINONIMO, ISNULL(FAMILIA_ART.COD_AGR,''), FAMILIA_ART.NOM_AGR, MEDIDA_STOCK.SIGLA_MEDIDA
"""


def ejecutar_sincronizacion():
    """Ejecutar sincronización completa"""
    resultado = {
        "exito": False,
        "ajustes": 0,
        "costos": 0,
        "ventas": 0,
        "ultima_fecha_ajustes": None,
        "ultima_fecha_costos": None,
        "ultima_fecha_ventas": None,
        "error": None
    }

    try:
        log.info("=" * 60)
        log.info("SINCRONIZACIÓN AUTOMÁTICA - Tango -> Replit")
        log.info(f"Fecha: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
        log.info("=" * 60)

        sync_info = get_sync_info()
        log.info(f"Estado actual - Ajustes: {sync_info.get('total_ajustes', 0)}, "
                 f"Costos: {sync_info.get('total_costos', 0)}, "
                 f"Ventas: {sync_info.get('total_ventas', 0)}")

        log.info("Conectando a Tango SQL Server...")
        conn = pyodbc.connect(CONN_STR, timeout=30)
        conn.timeout = 120

        # AJUSTES
        log.info("[AJUSTES] Consultando...")
        ultima_fecha_ajustes = sync_info.get('ultima_fecha_ajustes')
        if ultima_fecha_ajustes:
            fecha_desde_ajustes = (datetime.strptime(ultima_fecha_ajustes[:10], "%Y-%m-%d") - timedelta(days=7)).strftime("%d/%m/%Y")
            log.info(f"  Incremental desde: {fecha_desde_ajustes}")
        else:
            fecha_desde_ajustes = "01/08/2025"
            log.info(f"  Primera sync desde: {fecha_desde_ajustes}")

        df_ajustes = pd.read_sql(QUERY_AJUSTES.format(fecha_desde=fecha_desde_ajustes), conn)
        log.info(f"  Registros: {len(df_ajustes)}")
        if len(df_ajustes) > 0:
            _, enviados = enviar_en_lotes("ajustes", df_ajustes.to_dict(orient="records"), BATCH_SIZE)
            resultado["ajustes"] = enviados

        # COSTOS (solo lunes)
        dia_semana = datetime.now().weekday()
        if dia_semana == 0:
            log.info("[COSTOS] Consultando (sincronización semanal - Lunes)...")
            df_costos = pd.read_sql(QUERY_COSTOS, conn)
            log.info(f"  Registros: {len(df_costos)}")
            if len(df_costos) > 0:
                _, enviados = enviar_en_lotes("costos", df_costos.to_dict(orient="records"), BATCH_SIZE)
                resultado["costos"] = enviados
        else:
            log.info("[COSTOS] Omitido (solo lunes)")

        # VENTAS
        log.info("[VENTAS] Consultando...")
        ultima_fecha_ventas = sync_info.get('ultima_fecha_ventas')
        if ultima_fecha_ventas:
            fecha_desde_ventas = datetime.strptime(ultima_fecha_ventas[:10], "%Y-%m-%d").strftime("%d/%m/%Y")
            log.info(f"  Incremental desde: {fecha_desde_ventas}")
        else:
            fecha_desde_ventas = "01/09/2024"
            log.info(f"  Primera sync desde: {fecha_desde_ventas}")

        df_ventas = pd.read_sql(QUERY_VENTAS.format(fecha_desde=fecha_desde_ventas), conn)
        log.info(f"  Registros: {len(df_ventas)}")
        if len(df_ventas) > 0:
            _, enviados = enviar_en_lotes("ventas", df_ventas.to_dict(orient="records"), BATCH_SIZE)
            resultado["ventas"] = enviados

        conn.close()

        try:
            sync_info_final = get_sync_info()
            resultado["ultima_fecha_ajustes"] = sync_info_final.get('ultima_fecha_ajustes')
            resultado["ultima_fecha_costos"] = sync_info_final.get('ultima_sync_costos')
            resultado["ultima_fecha_ventas"] = sync_info_final.get('ultima_fecha_ventas')
        except:
            pass

        resultado["exito"] = True
        log.info(f"COMPLETADO - Ajustes: {resultado['ajustes']}, Costos: {resultado['costos']}, Ventas: {resultado['ventas']}")

    except pyodbc.Error as e:
        resultado["error"] = f"Error SQL: {e}"
        log.error(resultado["error"])
    except Exception as e:
        resultado["error"] = f"Error: {e}"
        log.error(resultado["error"])

    enviar_notificacion_email(resultado)
    return resultado


def enviar_notificacion_email(resultado):
    """Enviar email de notificación"""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    password = SMTP_PASSWORD or os.environ.get("SMTP_PASSWORD", "")
    if not password:
        log.warning("SMTP_PASSWORD no configurada, no se envía email")
        return

    fecha = datetime.now().strftime("%d/%m/%Y %H:%M")
    msg = MIMEMultipart()
    msg['From'] = SMTP_USER
    msg['To'] = DESTINATARIO_EMAIL

    if resultado.get("exito"):
        msg['Subject'] = f"Sync Inventarios OK - {fecha}"
        total = resultado.get('ajustes', 0) + resultado.get('costos', 0) + resultado.get('ventas', 0)
        html = f"""<html><body style="font-family:Arial;padding:20px;">
        <h2 style="color:#28a745;">Sincronización Exitosa</h2>
        <p><b>Fecha:</b> {fecha}</p>
        <table style="border-collapse:collapse;width:100%;max-width:400px;">
        <tr style="background:#f8f9fa;"><th style="border:1px solid #dee2e6;padding:8px;">Tipo</th><th style="border:1px solid #dee2e6;padding:8px;text-align:right;">Registros</th></tr>
        <tr><td style="border:1px solid #dee2e6;padding:8px;">Ajustes</td><td style="border:1px solid #dee2e6;padding:8px;text-align:right;">{resultado.get('ajustes',0):,}</td></tr>
        <tr><td style="border:1px solid #dee2e6;padding:8px;">Costos</td><td style="border:1px solid #dee2e6;padding:8px;text-align:right;">{resultado.get('costos',0):,}</td></tr>
        <tr><td style="border:1px solid #dee2e6;padding:8px;">Ventas</td><td style="border:1px solid #dee2e6;padding:8px;text-align:right;">{resultado.get('ventas',0):,}</td></tr>
        <tr style="background:#e9ecef;"><td style="border:1px solid #dee2e6;padding:8px;font-weight:bold;">Total</td><td style="border:1px solid #dee2e6;padding:8px;text-align:right;font-weight:bold;">{total:,}</td></tr>
        </table>
        <p style="color:#999;font-size:11px;">Mensaje automático del servicio de sincronización.</p>
        </body></html>"""
    else:
        msg['Subject'] = f"ERROR Sync Inventarios - {fecha}"
        html = f"""<html><body style="font-family:Arial;padding:20px;">
        <h2 style="color:#dc3545;">Error en Sincronización</h2>
        <p><b>Fecha:</b> {fecha}</p>
        <pre style="background:#f5f5f5;padding:15px;">{resultado.get('error','Error desconocido')}</pre>
        <p style="color:#999;font-size:11px;">Mensaje automático del servicio de sincronización.</p>
        </body></html>"""

    msg.attach(MIMEText(html, 'html'))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, password)
        server.sendmail(SMTP_USER, [DESTINATARIO_EMAIL], msg.as_string())
        server.quit()
        log.info(f"Email enviado a {DESTINATARIO_EMAIL}")
    except Exception as e:
        log.error(f"Error enviando email: {e}")


def main():
    """Punto de entrada principal - Servicio con programación automática"""
    log.info("=" * 60)
    log.info("BRIDGE SERVICIO INICIADO")
    log.info("Programación: Lunes, Miércoles y Viernes a las 07:00")
    log.info("=" * 60)

    schedule.every().monday.at("07:00").do(ejecutar_sincronizacion)
    schedule.every().wednesday.at("07:00").do(ejecutar_sincronizacion)
    schedule.every().friday.at("07:00").do(ejecutar_sincronizacion)

    log.info(f"Próxima ejecución: {schedule.next_run()}")

    while True:
        try:
            schedule.run_pending()
            time.sleep(60)
        except KeyboardInterrupt:
            log.info("Servicio detenido por el usuario")
            break
        except Exception as e:
            log.error(f"Error en loop principal: {e}")
            time.sleep(300)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--ahora":
        log.info("Ejecución manual inmediata")
        ejecutar_sincronizacion()
    else:
        main()
