"""
BRIDGE SERVICIO - Sincronización Automática Tango -> Replit
============================================================
Se instala como Servicio de Windows usando NSSM.
Corre en segundo plano, se programa solo (Lun/Mié/Vie a las 7:00 AM),
se auto-reinicia si falla, y no requiere intervención.
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

# ==============================================================
# CONFIGURACIÓN
# ==============================================================
REPL_URL = "https://seguimientodeinv.replit.app"
CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bridge_config.ini")

def cargar_configuracion():
    config = configparser.ConfigParser()
    if os.path.exists(CONFIG_FILE):
        config.read(CONFIG_FILE, encoding='utf-8')
    else:
        config['bridge'] = {'api_key': '', 'smtp_password': ''}
        config['tango'] = {'server': 'tangoserver', 'database': 'crisa_real1', 'user': 'Axoft', 'password': 'Axoft'}
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            config.write(f)
        print(f"ARCHIVO DE CONFIGURACIÓN CREADO: {CONFIG_FILE}")
        sys.exit(1)
    return config

_config = cargar_configuracion()
BRIDGE_API_KEY = _config.get('bridge', 'api_key', fallback='')
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
    if hasattr(obj, 'isoformat'): return obj.isoformat()
    return str(obj)

def api_headers():
    return {'Content-Type': 'application/json', 'X-Bridge-Api-Key': BRIDGE_API_KEY}

def get_sync_info():
    try:
        response = requests.get(f"{REPL_URL}/sync-info", headers=api_headers(), timeout=30)
        return response.json() if response.status_code == 200 else {}
    except: return {}

def procesar_ajustes_lote(df):
    lote_procesado = []
    for _, row in df.iterrows():
        # LÓGICA DE UNIDAD DE MEDIDA (NORMALIZACIÓN BASADA EN COLUMNA TANGO Y DESCRIPCIÓN)
        um_original = str(row.get('U.M. stock', '')).strip().lower()
        articulo_desc = str(row.get('Artículo', '')).lower()
        codigo = str(row.get('Cód. Artículo', ''))
        
        # 1. Prioridad: Referencia explícita a Kilos
        if um_original in ['kg', 'kgs', 'kg.', 'kilo', 'kilos'] or any(x in articulo_desc for x in ['x kg', 'por kg', 'por kilo']):
            um_final = 'KG'
        # 2. Referencia explícita a Metros
        elif um_original in ['mts', 'mt.', 'mtrs.', 'mtrs', 'mt', 'm', 'metros', 'metro'] or any(x in articulo_desc for x in ['x mts', 'por mts', 'por metro']):
            um_final = 'MTS'
        # 3. Referencia explícita a Unidades
        elif um_original in ['un', 'und', 'unid', 'unid.', 'unidad', 'unidades']:
            um_final = 'UN'
        # 4. Fallback basado en prefijo de código si la columna viene vacía
        elif codigo.startswith(('TA', 'TF', 'TV', 'TD', 'TI', 'T')):
            um_final = 'MTS'
        else:
            um_final = 'UN'

        lote_procesado.append({
            "Sucursal": row['Sucursal'],
            "Comprobante": row['Comprobante'],
            "NroComprobante": str(row['Nro. comprobante']),
            "FechaMovimiento": row['Fecha movimiento'].isoformat() if hasattr(row['Fecha movimiento'], 'isoformat') else str(row['Fecha movimiento']),
            "TipoMovimiento": row['Tipo de Movimiento'],
            "Codigo": codigo,
            "Articulo": row['Artículo'],
            "Diferencia": float(row['Cantidad']),
            "UnidadMedida": um_final
        })
    return lote_procesado

def enviar_en_lotes(nombre, registros, batch_size=5000):
    if nombre == "ajustes": registros = procesar_ajustes_lote(pd.DataFrame(registros))
    total = len(registros)
    if total == 0: return True, 0
    enviados = 0
    for i in range(0, total, batch_size):
        lote = registros[i:i+batch_size]
        for intento in range(MAX_RETRIES):
            try:
                response = requests.post(f"{REPL_URL}/sync", data=json.dumps({nombre: lote, "incremental": True}, default=json_serial), headers=api_headers(), timeout=300)
                if response.status_code == 200:
                    enviados += len(lote)
                    break
            except Exception as e:
                log.error(f"Error lote: {e}")
                if intento == MAX_RETRIES - 1: break
                time.sleep(5)
    return True, enviados

QUERY_AJUSTES = "SELECT SUCURSAL.DESC_SUCURSAL AS [Sucursal], CTA09.T_COMP AS [Comprobante], CTA11.COD_ARTICU AS [Cód. Artículo], CTA_ARTICULO.DESC_CTA_ARTICULO AS [Artículo], CTA11.FECHA_MOV AS [Fecha movimiento], CTA11.TIPO_MOV AS [Tipo de Movimiento], SUM(CASE CTA11.TIPO_MOV WHEN 'E' THEN CTA11.CANTIDAD ELSE -CTA11.CANTIDAD END) AS [Cantidad], CTA09.N_COMP AS [Nro. comprobante], MEDIDA_STOCK.SIGLA_MEDIDA AS [U.M. stock] FROM CTA11 LEFT JOIN CTA09 ON CTA09.TCOMP_IN_S = CTA11.TCOMP_IN_S AND CTA09.NCOMP_IN_S = CTA11.NCOMP_IN_S AND CTA09.NRO_SUCURS = CTA11.NRO_SUCURS LEFT JOIN SUCURSAL ON (CTA11.NRO_SUCURS = SUCURSAL.NRO_SUCURSAL) LEFT JOIN CTA_ARTICULO ON (CTA11.COD_ARTICU = CTA_ARTICULO.COD_ARTICULO) LEFT JOIN CTA_DEPOSITO ON (CTA11.COD_DEPOSI = CTA_DEPOSITO.COD_CTA_DEPOSITO) LEFT JOIN (Select id_sucursal, id_cta_articulo, id_cta_deposito, Max(fecha) as fecha_max from CTA_SALDO_ARTICULO_DEPOSITO group by id_sucursal, id_cta_articulo, id_cta_deposito) as SALDO on (CTA_ARTICULO.ID_CTA_ARTICULO = SALDO.ID_CTA_ARTICULO AND CTA_DEPOSITO.ID_CTA_DEPOSITO = SALDO.ID_CTA_DEPOSITO AND SUCURSAL.ID_SUCURSAL = SALDO.ID_SUCURSAL) LEFT JOIN CTA_SALDO_ARTICULO_DEPOSITO ON(SALDO.ID_CTA_ARTICULO = CTA_SALDO_ARTICULO_DEPOSITO.ID_CTA_ARTICULO AND SALDO.ID_CTA_DEPOSITO = CTA_SALDO_ARTICULO_DEPOSITO.ID_CTA_DEPOSITO AND SALDO.ID_SUCURSAL = CTA_SALDO_ARTICULO_DEPOSITO.ID_SUCURSAL AND SALDO.fecha_max = CTA_SALDO_ARTICULO_DEPOSITO.fecha) LEFT JOIN GVA81 ON (GVA81.COD_CLASIF = CTA11.COD_CLASIF) LEFT JOIN CTA_ARTICULO_SUCURSAL ON (CTA_SALDO_ARTICULO_DEPOSITO.ID_CTA_ARTICULO = CTA_ARTICULO_SUCURSAL.ID_CTA_ARTICULO AND CTA_SALDO_ARTICULO_DEPOSITO.ID_SUCURSAL = CTA_ARTICULO_SUCURSAL.ID_SUCURSAL) LEFT JOIN CTA_MEDIDA AS MEDIDA_STOCK ON (CTA_ARTICULO_SUCURSAL.ID_CTA_MEDIDA_STOCK = MEDIDA_STOCK.ID_CTA_MEDIDA) WHERE CTA09.ESTADO_MOV <> 'A' AND CTA09.T_COMP = 'AJU' AND CTA11.FECHA_MOV >= '{fecha_desde}' AND CTA11.NRO_SUCURS IN ('2', '3', '4', '5', '6', '12', '13') GROUP BY SUCURSAL.DESC_SUCURSAL, CTA09.T_COMP, CTA11.COD_ARTICU, CTA_ARTICULO.DESC_CTA_ARTICULO, CTA11.FECHA_MOV, CTA11.TIPO_MOV, CTA09.N_COMP, MEDIDA_STOCK.SIGLA_MEDIDA"

def ejecutar_sincronizacion():
    try:
        sync_info = get_sync_info()
        conn = pyodbc.connect(CONN_STR, timeout=30)
        ultima_fecha = sync_info.get('ultima_fecha_ajustes', '2025-08-01')
        fecha_desde = (datetime.strptime(ultima_fecha[:10], "%Y-%m-%d") - timedelta(days=7)).strftime("%d/%m/%Y")
        df_ajustes = pd.read_sql(QUERY_AJUSTES.format(fecha_desde=fecha_desde), conn)
        if len(df_ajustes) > 0: enviar_en_lotes("ajustes", df_ajustes.to_dict(orient="records"))
        conn.close()
        return {"exito": True}
    except Exception as e:
        log.error(f"Error: {e}")
        return {"exito": False, "error": str(e)}

def main():
    schedule.every().monday.at("07:00").do(ejecutar_sincronizacion)
    schedule.every().wednesday.at("07:00").do(ejecutar_sincronizacion)
    schedule.every().friday.at("07:00").do(ejecutar_sincronizacion)
    while True:
        schedule.run_pending()
        time.sleep(60)

if __name__ == "__main__":
    if "--ahora" in sys.argv: ejecutar_sincronizacion()
    else: main()
