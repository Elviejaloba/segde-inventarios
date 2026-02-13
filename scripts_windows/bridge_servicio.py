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
    if um in ['kg', 'kgs', 'kg.', 'kilo', 'kilos'] or any(x in desc for x in ['x kg', 'por kg', 'por kilo']):
        return 'KG'
    # Lógica de Unidades (Blanco, Accesorios, etc)
    if um in ['un', 'und', 'unid', 'unid.', 'unidad', 'unidades'] or any(cod.startswith(p) for p in ['BL', 'ME', 'OT', 'CO', '11RS']):
        return 'UN'
    # Por defecto Metros para el resto de telas
    return 'MTS'

def ejecutar_sincronizacion():
    try:
        sync_info = get_sync_info()
        conn = pyodbc.connect(CONN_STR, timeout=30)
        ultima_fecha = sync_info.get('ultima_fecha_ajustes', '2025-08-01')
        fecha_desde = (datetime.strptime(ultima_fecha[:10], "%Y-%m-%d") - timedelta(days=7)).strftime("%d/%m/%Y")
        
        query = f"SELECT SUCURSAL.DESC_SUCURSAL AS [Sucursal], CTA09.T_COMP AS [Comprobante], CTA11.COD_ARTICU AS [Cód. Artículo], CTA_ARTICULO.DESC_CTA_ARTICULO AS [Artículo], CTA11.FECHA_MOV AS [Fecha movimiento], CTA11.TIPO_MOV AS [Tipo de Movimiento], SUM(CASE CTA11.TIPO_MOV WHEN 'E' THEN CTA11.CANTIDAD ELSE -CTA11.CANTIDAD END) AS [Cantidad], CTA09.N_COMP AS [Nro. comprobante], MEDIDA_STOCK.SIGLA_MEDIDA AS [U.M. stock] FROM CTA11 LEFT JOIN CTA09 ON CTA09.TCOMP_IN_S = CTA11.TCOMP_IN_S AND CTA09.NCOMP_IN_S = CTA11.NCOMP_IN_S AND CTA09.NRO_SUCURS = CTA11.NRO_SUCURS LEFT JOIN SUCURSAL ON (CTA11.NRO_SUCURS = SUCURSAL.NRO_SUCURSAL) LEFT JOIN CTA_ARTICULO ON (CTA11.COD_ARTICU = CTA_ARTICULO.COD_ARTICULO) LEFT JOIN CTA_ARTICULO_SUCURSAL ON (CTA11.COD_ARTICU = CTA_ARTICULO_SUCURSAL.COD_ARTICULO AND SUCURSAL.NRO_SUCURSAL = CTA_ARTICULO_SUCURSAL.NRO_SUCURSAL) LEFT JOIN CTA_MEDIDA AS MEDIDA_STOCK ON (CTA_ARTICULO_SUCURSAL.ID_CTA_MEDIDA_STOCK = MEDIDA_STOCK.ID_CTA_MEDIDA) WHERE CTA09.ESTADO_MOV <> 'A' AND CTA09.T_COMP = 'AJU' AND CTA11.FECHA_MOV >= '{fecha_desde}' GROUP BY SUCURSAL.DESC_SUCURSAL, CTA09.T_COMP, CTA11.COD_ARTICU, CTA_ARTICULO.DESC_CTA_ARTICULO, CTA11.FECHA_MOV, CTA11.TIPO_MOV, CTA09.N_COMP, MEDIDA_STOCK.SIGLA_MEDIDA"
        
        df = pd.read_sql(query, conn)
        if not df.empty:
            registros = []
            for _, r in df.iterrows():
                registros.append({
                    "Sucursal": r['Sucursal'], "Comprobante": r['Comprobante'], "NroComprobante": str(r['Nro. comprobante']),
                    "FechaMovimiento": r['Fecha movimiento'].isoformat(), "TipoMovimiento": r['Tipo de Movimiento'],
                    "Codigo": r['Cód. Artículo'], "Articulo": r['Artículo'], "Diferencia": float(r['Cantidad']),
                    "UnidadMedida": normalizar_um(r['U.M. stock'], r['Artículo'], r['Cód. Artículo'])
                })
            requests.post(f"{REPL_URL}/sync", data=json.dumps({"ajustes": registros, "incremental": True}), headers={'Content-Type': 'application/json', 'X-Bridge-Api-Key': BRIDGE_API_KEY}, timeout=300)
        conn.close()
    except Exception as e: print(f"Error: {e}")

if __name__ == "__main__":
    if "--ahora" in sys.argv: ejecutar_sincronizacion()
    else:
        schedule.every().monday.at("07:00").do(ejecutar_sincronizacion)
        schedule.every().wednesday.at("07:00").do(ejecutar_sincronizacion)
        schedule.every().friday.at("07:00").do(ejecutar_sincronizacion)
        while True:
            schedule.run_pending()
            time.sleep(60)
