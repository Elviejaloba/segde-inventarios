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
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

REPL_URL = "https://seguimientodeinv.replit.app"
CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bridge_config.ini")

def cargar_configuracion():
    config = configparser.ConfigParser()
    if os.path.exists(CONFIG_FILE): config.read(CONFIG_FILE, encoding='utf-8')
    else: sys.exit(1)
    return config

_config = cargar_configuracion()
BRIDGE_API_KEY = _config.get('bridge', 'api_key', fallback='')
_tango = _config['tango'] if 'tango' in _config else {}
CONN_STR = f"Driver={{SQL Server}};Server={_tango.get('server', 'tangoserver')};Database={_tango.get('database', 'crisa_real1')};UID={_tango.get('user', 'Axoft')};PWD={_tango.get('password', 'Axoft')};"

def get_sync_info():
    try:
        r = requests.get(f"{REPL_URL}/sync-info", headers={'X-Bridge-Api-Key': BRIDGE_API_KEY}, timeout=30)
        return r.json() if r.status_code == 200 else {}
    except: return {}

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
        r = requests.post(f"{REPL_URL}/api/bridge/reporte-semanal",
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
        r = requests.post(f"{REPL_URL}/api/bridge/recordatorios-muestreo",
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
        for intento in range(3):
            try:
                if intento > 0:
                    wait_time = 5 * (2 ** intento)
                    logging.info(f"    Reintento {intento + 1}/3 en {wait_time}s...")
                    time.sleep(wait_time)
                logging.info(f"    {nombre}: Lote {lote_num}/{total_lotes} ({len(lote)} registros)...")
                data = {nombre: lote, "incremental": True}
                json_data = json.dumps(data, default=json_serial)
                response = requests.post(f"{REPL_URL}/sync", data=json_data,
                    headers={'Content-Type': 'application/json', 'X-Bridge-Api-Key': BRIDGE_API_KEY}, timeout=300)
                if response.status_code == 200:
                    enviados += len(lote)
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
    try:
        sync_info = get_sync_info()
        conn = pyodbc.connect(CONN_STR, timeout=30)
        conn.timeout = 120

        logging.info(f"[SYNC-INFO] Respuesta del servidor: {json.dumps(sync_info, default=str)}")

        # ============================================================
        # AJUSTES
        # ============================================================
        logging.info("[AJUSTES] Consultando...")
        ultima_fecha = sync_info.get('ultima_fecha_ajustes', '2025-08-01')
        fecha_desde_aj = (datetime.strptime(ultima_fecha[:10], "%Y-%m-%d") - timedelta(days=7)).strftime("%d/%m/%Y")
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
            logging.info(f"    [OK] Ajustes sincronizados: {enviados}")

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
                logging.info(f"    [OK] Costos sincronizados: {enviados}")
        else:
            logging.info("[COSTOS] Omitido (solo se sincroniza los lunes)")

        # ============================================================
        # VENTAS (incremental)
        # ============================================================
        logging.info("[VENTAS] Consultando...")
        ultima_fecha_ventas = sync_info.get('ultima_fecha_ventas')
        if ultima_fecha_ventas:
            fecha_desde_vtas = datetime.strptime(ultima_fecha_ventas[:10], "%Y-%m-%d").strftime("%d/%m/%Y")
            logging.info(f"    Modo incremental desde: {fecha_desde_vtas}")
        else:
            fecha_desde_vtas = "01/09/2024"
            logging.info(f"    Primera sincronización desde: {fecha_desde_vtas}")

        query_vtas = QUERY_VENTAS.format(fecha_desde=fecha_desde_vtas)
        df_ventas = pd.read_sql(query_vtas, conn)
        logging.info(f"    Registros obtenidos: {len(df_ventas)}")

        if not df_ventas.empty:
            registros_ventas = df_ventas.to_dict(orient="records")
            _, enviados = enviar_en_lotes("ventas", registros_ventas)
            logging.info(f"    [OK] Ventas sincronizadas: {enviados}")

        conn.close()
        logging.info("Sincronización completada exitosamente")
    except Exception as e:
        logging.error(f"Error en sincronización: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
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
        logging.info("  Sync datos: Lun-Sáb 07:00")
        logging.info("  Reporte semanal: Lunes 09:00")
        logging.info("  Recordatorios muestreo: Lunes 09:00")
        while True:
            schedule.run_pending()
            time.sleep(60)
