"""
BRIDGE SQL - Sincronización Tango -> Replit
Sincroniza: AJUSTES y COSTOS
"""
import pyodbc
import pandas as pd
import requests
import json
import time
from datetime import datetime, time as dt_time, timedelta

# ==============================================================
# CONFIGURACIÓN DE CONEXIÓN SQL SERVER (TANGO)
# ==============================================================
conn_str = (
    "Driver={SQL Server};"
    "Server=tangoserver;"
    "Database=crisa_real1;"
    "UID=Axoft;"
    "PWD=Axoft;"
)

# ==============================================================
# URL DEL API REPLIT - CAMBIAR A PRODUCCIÓN CUANDO ESTÉ LISTO
# ==============================================================

# URL de PRODUCCIÓN:
REPL_URL = "https://seguimientodeinv.replit.app"

# ==============================================================
# CONFIGURACIÓN DE SINCRONIZACIÓN
# ==============================================================
SYNC_INTERVAL = 300      # 5 minutos entre sincronizaciones
BATCH_SIZE = 5000        # Registros por lote (aumentado para velocidad)
MAX_RETRIES = 3          # Reintentos por lote

# Horario de sincronización (opcional)
SYNC_HORARIO_INICIO = dt_time(6, 0)   # 6:00 AM
SYNC_HORARIO_FIN = dt_time(23, 0)     # 11:00 PM
SOLO_EN_HORARIO = False               # True para respetar horario


def json_serial(obj):
    """Serializar fechas a string"""
    if hasattr(obj, 'isoformat'):
        return obj.isoformat()
    return str(obj)


def esta_en_horario_sync():
    """Verificar si estamos en horario de sincronización"""
    if not SOLO_EN_HORARIO:
        return True
    ahora = datetime.now().time()
    return SYNC_HORARIO_INICIO <= ahora <= SYNC_HORARIO_FIN


def get_sync_info():
    """Obtener información de sincronización desde Replit"""
    try:
        response = requests.get(f"{REPL_URL}/sync-info", timeout=30)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"  Aviso: No se pudo obtener sync-info: {e}")
    return {}


def enviar_en_lotes(nombre, registros, batch_size=2000):
    """Enviar datos en lotes con reintentos"""
    total = len(registros)
    if total == 0:
        print(f"    {nombre}: Sin registros para sincronizar")
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
                    print(f"    Reintento {intento + 1}/{MAX_RETRIES} en {wait_time}s...")
                    time.sleep(wait_time)
                
                print(f"    {nombre}: Lote {lote_num}/{total_lotes} ({len(lote)} registros)...")
                
                data = {nombre: lote, "incremental": True}
                json_data = json.dumps(data, default=json_serial)
                
                response = requests.post(
                    f"{REPL_URL}/sync",
                    data=json_data,
                    headers={'Content-Type': 'application/json'},
                    timeout=120
                )
                
                if response.status_code == 200:
                    enviados += len(lote)
                    break
                elif response.status_code in [502, 503, 504]:
                    print(f"    Timeout servidor (HTTP {response.status_code}), reintentando...")
                    if intento == MAX_RETRIES - 1:
                        print(f"    Error persistente en lote {lote_num}")
                        break
                else:
                    print(f"    Error en lote {lote_num}: {response.status_code} - {response.text[:200]}")
                    break
                    
            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
                print(f"    Timeout/Conexión en lote {lote_num}: {type(e).__name__}")
                if intento == MAX_RETRIES - 1:
                    print(f"    Continuando con siguiente lote...")
                    break
            except Exception as e:
                print(f"    Error enviando lote {lote_num}: {e}")
                break
    
    return True, enviados


# ==============================================================
# QUERY: AJUSTES DE INVENTARIO
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
    AND CTA11.FECHA_MOV >= '{fecha_desde}'
    AND CTA11.NRO_SUCURS IN ('2', '3', '4', '5', '6', '12', '13')
GROUP BY 
    SUCURSAL.DESC_SUCURSAL, CTA09.T_COMP, CTA11.COD_ARTICU, CTA_ARTICULO.DESC_CTA_ARTICULO, 
    CTA11.FECHA_MOV, CTA11.TIPO_MOV, CTA09.N_COMP, MEDIDA_STOCK.SIGLA_MEDIDA
"""


# ==============================================================
# QUERY: COSTOS DE ARTÍCULOS
# ==============================================================
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


def sincronizar():
    """Ejecutar sincronización completa"""
    print("=" * 60)
    print("BRIDGE SQL - Sincronización AJUSTES y COSTOS")
    print("=" * 60)
    print(f"Servidor: tangoserver")
    print(f"Base de datos: crisa_real1")
    print(f"Destino: {REPL_URL}")
    print(f"Intervalo: {SYNC_INTERVAL} segundos")
    print(f"Tamaño de lote: {BATCH_SIZE} registros")
    print("=" * 60)

    while True:
        try:
            if not esta_en_horario_sync():
                ahora = datetime.now()
                print(f"[{ahora}] Fuera de horario de sincronización")
                time.sleep(SYNC_INTERVAL)
                continue

            print(f"\n[{datetime.now()}] Iniciando sincronización...")
            
            # Obtener info de última sincronización
            sync_info = get_sync_info()
            print(f"  Estado actual en Replit:")
            print(f"    - Ajustes: {sync_info.get('total_ajustes', 0)}")
            print(f"    - Costos: {sync_info.get('total_costos', 0)}")
            
            # Conectar a SQL Server
            print("  Conectando a Tango...")
            conn = pyodbc.connect(conn_str, timeout=30)
            conn.timeout = 120

            # ============================================================
            # SINCRONIZAR AJUSTES
            # ============================================================
            print("\n  [AJUSTES] Consultando...")
            
            # Fecha desde: última sincronización o inicio
            ultima_fecha = sync_info.get('ultima_fecha_ajustes')
            if ultima_fecha:
                fecha_desde = (datetime.strptime(ultima_fecha[:10], "%Y-%m-%d") - timedelta(days=7)).strftime("%d/%m/%Y")
                print(f"    Modo incremental desde: {fecha_desde}")
            else:
                fecha_desde = "01/08/2025"
                print(f"    Primera sincronización desde: {fecha_desde}")
            
            query_ajustes = QUERY_AJUSTES.format(fecha_desde=fecha_desde)
            df_ajustes = pd.read_sql(query_ajustes, conn)
            print(f"    Registros obtenidos: {len(df_ajustes)}")
            
            if len(df_ajustes) > 0:
                registros_ajustes = df_ajustes.to_dict(orient="records")
                _, enviados = enviar_en_lotes("ajustes", registros_ajustes, BATCH_SIZE)
                print(f"    Sincronizados: {enviados}")

            # ============================================================
            # SINCRONIZAR COSTOS
            # ============================================================
            print("\n  [COSTOS] Consultando...")
            
            df_costos = pd.read_sql(QUERY_COSTOS, conn)
            print(f"    Registros obtenidos: {len(df_costos)}")
            
            if len(df_costos) > 0:
                registros_costos = df_costos.to_dict(orient="records")
                _, enviados = enviar_en_lotes("costos", registros_costos, BATCH_SIZE)
                print(f"    Sincronizados: {enviados}")

            conn.close()
            
            print(f"\n[{datetime.now()}] Sincronización completada")
            print(f"Próxima sincronización en {SYNC_INTERVAL} segundos...")
            time.sleep(SYNC_INTERVAL)

        except pyodbc.Error as e:
            print(f"\n[ERROR] Error de conexión SQL: {e}")
            print(f"Reintentando en 60 segundos...")
            time.sleep(60)
        except Exception as e:
            print(f"\n[ERROR] Error inesperado: {e}")
            print(f"Reintentando en 60 segundos...")
            time.sleep(60)


if __name__ == "__main__":
    sincronizar()
