import pyodbc
import pandas as pd
import requests
import json
import time
from datetime import datetime, time as dt_time, timedelta

conn_str = (
    "Driver={SQL Server};"
    "Server=tangoserver;"
    "Database=crisa_real1;"
    "UID=Axoft;"
    "PWD=Axoft;"
)

# ==============================================================
# URL del API - Usar la URL de PRODUCCION
# ==============================================================

# URL de DESARROLLO (solo para pruebas):
# REPL_URL = "https://551f46a0-9017-4b9c-b45c-7fa58ca01f34-00-3437h96u7obki.worf.replit.dev:3000"

# URL de PRODUCCION (activa):
REPL_URL = "https://sales-sync-logic.replit.app"

SYNC_INTERVAL = 300  # 5 minutos entre sincronizaciones
BATCH_SIZE = 2000    # Lotes pequeños para evitar timeout
MAX_RETRIES = 3      # Reintentos por lote

SYNC_HORARIO_INICIO = dt_time(20, 0)
SYNC_HORARIO_FIN = dt_time(6, 0)
SOLO_FUERA_HORARIO = False


def json_serial(obj):
    """Serializar cualquier tipo de fecha/timestamp a string"""
    if hasattr(obj, 'isoformat'):
        return obj.isoformat()
    return str(obj)


def esta_en_horario_sync():
    if not SOLO_FUERA_HORARIO:
        return True

    ahora = datetime.now().time()

    if SYNC_HORARIO_INICIO > SYNC_HORARIO_FIN:
        return ahora >= SYNC_HORARIO_INICIO or ahora < SYNC_HORARIO_FIN
    else:
        return SYNC_HORARIO_INICIO <= ahora < SYNC_HORARIO_FIN


def get_sync_info():
    """Obtener información de sincronización desde Replit"""
    try:
        response = requests.get(f"{REPL_URL}/sync-info", timeout=30)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"  Aviso: No se pudo obtener sync-info: {e}")
    return {}


def enviar_en_lotes(url, nombre, df, batch_size=2000, incremental=True):
    """Enviar datos en lotes pequeños con UPSERT y reintentos"""
    total = len(df)
    if total == 0:
        return True, 0
    
    registros = df.to_dict(orient="records")
    enviados = 0
    
    for i in range(0, total, batch_size):
        lote = registros[i:i+batch_size]
        lote_num = (i // batch_size) + 1
        total_lotes = (total + batch_size - 1) // batch_size
        
        # Reintentos con backoff exponencial
        for intento in range(MAX_RETRIES):
            try:
                if intento > 0:
                    wait_time = 5 * (2 ** intento)  # 10s, 20s, 40s
                    print(f"    Reintento {intento + 1}/{MAX_RETRIES} en {wait_time}s...")
                    time.sleep(wait_time)
                
                print(f"    {nombre}: Lote {lote_num}/{total_lotes} ({len(lote)} registros)...")
                
                data = {nombre: lote, "incremental": incremental}
                json_data = json.dumps(data, default=json_serial)
                
                response = requests.post(
                    f"{url}/sync",
                    data=json_data,
                    headers={'Content-Type': 'application/json'},
                    timeout=120  # 2 minutos por lote
                )
                
                if response.status_code == 200:
                    enviados += len(lote)
                    break  # Éxito, salir del loop de reintentos
                elif response.status_code in [502, 503, 504]:
                    print(f"    Timeout servidor (HTTP {response.status_code}), reintentando...")
                    if intento == MAX_RETRIES - 1:
                        print(f"    Error persistente en lote {lote_num} después de {MAX_RETRIES} intentos")
                        # Continuar con el siguiente lote en vez de abortar
                        break
                else:
                    print(f"    Error en lote {lote_num}: {response.status_code} - {response.text[:200]}")
                    break  # Error no recuperable
                    
            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
                print(f"    Timeout/Conexion en lote {lote_num}: {type(e).__name__}")
                if intento == MAX_RETRIES - 1:
                    print(f"    Continuando con siguiente lote...")
                    break
            except Exception as e:
                print(f"    Error enviando lote {lote_num}: {e}")
                break
    
    return True, enviados


def get_data():
    print("=" * 60)
    print("BRIDGE SQL - Sincronizacion Incremental Tango -> Replit")
    print("=" * 60)
    print(f"Servidor: tangoserver")
    print(f"Base de datos: crisa_real1")
    print(f"Intervalo de sincronizacion: {SYNC_INTERVAL} segundos")
    print(f"Tamano de lote: {BATCH_SIZE} registros")
    print(f"Modo: INCREMENTAL (UPSERT)")
    print("=" * 60)

    while True:
        try:
            if not esta_en_horario_sync():
                ahora = datetime.now()
                print(f"[{ahora}] Fuera de horario de sincronizacion")
                time.sleep(SYNC_INTERVAL)
                continue

            print(f"\n[{datetime.now()}] Iniciando sincronizacion incremental...")
            
            # Obtener info de última sincronización
            sync_info = get_sync_info()
            ultima_fecha_ventas = sync_info.get("ultima_fecha_ventas")
            total_ventas_existentes = sync_info.get("total_ventas", 0)
            total_saldos_existentes = sync_info.get("total_saldos", 0)
            total_precios_existentes = sync_info.get("total_precios", 0)
            ultima_sync_timestamp = sync_info.get("ultima_sync_saldo")
            
            print(f"  Estado actual en Replit:")
            print(f"    - Saldos: {total_saldos_existentes}")
            print(f"    - Ventas: {total_ventas_existentes}")
            print(f"    - Precios: {total_precios_existentes}")
            if ultima_fecha_ventas:
                print(f"    - Ultima fecha ventas: {ultima_fecha_ventas}")
            
            # Determinar si es primera sincronización o incremental
            es_primera_sync = total_saldos_existentes == 0

            conn = pyodbc.connect(conn_str, timeout=30)
            conn.timeout = 120

            # ============================================================
            # SALDOS - Solo si es primera sync o han pasado más de 30 min
            # ============================================================
            sincronizar_saldos = es_primera_sync or total_saldos_existentes == 0
            if not sincronizar_saldos:
                print(f"  Saldos: Ya sincronizados ({total_saldos_existentes}), saltando...")
            
            query_saldo = """
            SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED
            SET DATEFORMAT DMY
            SET DATEFIRST 7
            SET DEADLOCK_PRIORITY -8;
            SELECT
                CTA_ARTICULO.COD_CTA_ARTICULO AS [Cod. Articulo] ,
                CTA_ARTICULO.DESC_CTA_ARTICULO AS [Articulo] ,
                CTA_ARTICULO.SINONIMO AS [Sinonimo] ,
                CTA_DEPOSITO.COD_CTA_DEPOSITO AS [Cod. Deposito] ,
                SUCURSAL.NRO_SUCURSAL AS [Nro. Sucursal] ,
                SUCURSAL.DESC_SUCURSAL AS [Sucursal] ,
                CTA_DEPOSITO.DESC_CTA_DEPOSITO AS [Deposito] ,
                (CASE CTA_ARTICULO.BASE when '' then CTA_ARTICULO.COD_ARTICULO ELSE CTA_ARTICULO.BASE end) AS [Cod. base / articulo] ,
                (CASE CTA_ARTICULO.BASE when '' then CTA_ARTICULO.DESC_CTA_ARTICULO ELSE BASE.DESC_CTA_ARTICULO end) AS [Desc. Base / Articulo] ,
                CTA_ARTICULO.ESCALA_1 AS [Cod. escala 1] ,
                STA33.DESC_VALOR AS [Desc. escala 1] ,
                MEDIDA_STOCK.SIGLA_MEDIDA AS [U.M. stock] ,
                SUM(CTA_SALDO_ARTICULO_DEPOSITO.CANTIDAD_STOCK) AS [Stock 1]
            FROM
            CTA_SALDO_ARTICULO_DEPOSITO RIGHT JOIN (SELECT ID_CTA_ARTICULO, ID_CTA_DEPOSITO,ID_SUCURSAL,MAX(FECHA) AS [FECHA_MAX] FROM CTA_SALDO_ARTICULO_DEPOSITO GROUP BY ID_CTA_ARTICULO, ID_CTA_DEPOSITO,ID_SUCURSAL) AS ULT_SALDO ON (CTA_SALDO_ARTICULO_DEPOSITO.ID_CTA_ARTICULO = ULT_SALDO.ID_CTA_ARTICULO AND CTA_SALDO_ARTICULO_DEPOSITO.ID_CTA_DEPOSITO = ULT_SALDO.ID_CTA_DEPOSITO AND CTA_SALDO_ARTICULO_DEPOSITO.ID_SUCURSAL = ULT_SALDO.ID_SUCURSAL AND CTA_SALDO_ARTICULO_DEPOSITO.FECHA = ULT_SALDO.FECHA_MAX)
            LEFT JOIN CTA_ARTICULO ON (CTA_SALDO_ARTICULO_DEPOSITO.ID_CTA_ARTICULO = CTA_ARTICULO.ID_CTA_ARTICULO)
            LEFT JOIN (SELECT COD_ARTICULO, DESC_CTA_ARTICULO FROM CTA_ARTICULO WHERE USA_ESC = 'B') AS BASE ON (BASE.COD_ARTICULO = CTA_ARTICULO.BASE)
            LEFT JOIN SUCURSAL ON (CTA_SALDO_ARTICULO_DEPOSITO.ID_SUCURSAL = SUCURSAL.ID_SUCURSAL)
            LEFT JOIN CTA_DEPOSITO ON (CTA_SALDO_ARTICULO_DEPOSITO.ID_CTA_DEPOSITO = CTA_DEPOSITO.ID_CTA_DEPOSITO)
            LEFT JOIN STA33 ON (CTA_ARTICULO.ESCALA_1 = STA33.COD_ESCALA AND CTA_ARTICULO.VALOR1 = STA33.COD_VALOR)
            LEFT JOIN STA33 AS STA33_BIS ON (CTA_ARTICULO.ESCALA_2 = STA33_BIS.COD_ESCALA AND CTA_ARTICULO.VALOR2 = STA33_BIS.COD_VALOR)
            LEFT JOIN CTA_ARTICULO_SUCURSAL ON (CTA_SALDO_ARTICULO_DEPOSITO.ID_CTA_ARTICULO = CTA_ARTICULO_SUCURSAL.ID_CTA_ARTICULO AND CTA_SALDO_ARTICULO_DEPOSITO.ID_SUCURSAL = CTA_ARTICULO_SUCURSAL.ID_SUCURSAL)
            LEFT JOIN CTA_MEDIDA AS MEDIDA_STOCK ON (CTA_ARTICULO_SUCURSAL.ID_CTA_MEDIDA_STOCK = MEDIDA_STOCK.ID_CTA_MEDIDA)
            LEFT JOIN CTA_MEDIDA AS MEDIDA_STOCK_2 ON (CTA_ARTICULO_SUCURSAL.ID_CTA_MEDIDA_STOCK_2 = MEDIDA_STOCK_2.ID_CTA_MEDIDA)
            WHERE
            CTA_ARTICULO.STOCK = 1
            GROUP BY
                CTA_ARTICULO.COD_CTA_ARTICULO, CTA_ARTICULO.DESC_CTA_ARTICULO, CTA_ARTICULO.SINONIMO, CTA_DEPOSITO.COD_CTA_DEPOSITO, SUCURSAL.NRO_SUCURSAL, SUCURSAL.DESC_SUCURSAL, CTA_DEPOSITO.DESC_CTA_DEPOSITO, (CASE CTA_ARTICULO.BASE when '' then CTA_ARTICULO.COD_ARTICULO ELSE CTA_ARTICULO.BASE end), (CASE CTA_ARTICULO.BASE when '' then CTA_ARTICULO.DESC_CTA_ARTICULO ELSE BASE.DESC_CTA_ARTICULO end), CTA_ARTICULO.ESCALA_1, STA33.DESC_VALOR, MEDIDA_STOCK.SIGLA_MEDIDA
            """

            # ============================================================
            # VENTAS - Solo desde última fecha sincronizada
            # ============================================================
            # Fecha de inicio: si hay datos, desde última fecha; sino desde inicio
            if ultima_fecha_ventas and total_ventas_existentes > 0:
                # Restar 7 días para asegurar que capturamos cualquier modificación
                fecha_desde = (datetime.strptime(ultima_fecha_ventas, "%Y-%m-%d") - timedelta(days=7)).strftime("%d/%m/%Y")
                print(f"  Modo incremental: Ventas desde {fecha_desde}")
            else:
                fecha_desde = "01/09/2024"
                print(f"  Primera sincronizacion: Ventas desde {fecha_desde}")

            query_ventas = f"""
            SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED
            SET DATEFORMAT DMY
            SET DATEFIRST 7
            SET DEADLOCK_PRIORITY -8;
            SELECT
                CTA03.FECHA_MOV AS [Fecha] ,
                CTA02.NRO_SUCURS AS [Nro. Sucursal] ,
                SUCURSAL.DESC_SUCURSAL AS [Desc. sucursal] ,
                CTA03.Cod_Articu AS [Cod. Articulo] ,
                CTA_ARTICULO.DESC_CTA_ARTICULO AS [Descripcion] ,
                CTA_ARTICULO.SINONIMO AS [Sinonimo] ,
                ISNULL(FAMILIA_ART.COD_AGR,'') AS [Cod. Familia (Articulo)] ,
                FAMILIA_ART.NOM_AGR AS [Descripcion Familia (Articulo)] ,
                SUM(CASE CTA03.TCOMP_IN_V WHEN 'CC' THEN(-1) ELSE(1) END * CTA03.CANTIDAD / CASE WHEN CAN_EQUI_V = 0 THEN 1 ELSE CAN_EQUI_V END) AS [Cantidad venta] ,
                MEDIDA_STOCK.SIGLA_MEDIDA AS [U.M. stock] ,
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
                AND (CTA03.FECHA_MOV BETWEEN '{fecha_desde}' AND '31/05/2026')
                AND ((ISNULL(CTA03.RENGL_PADR,0) = 0) OR (ISNULL(CTA03.INSUMO_KIT_SEPARADO,0) = 1))
            GROUP BY
                CTA03.FECHA_MOV, CTA02.NRO_SUCURS, SUCURSAL.DESC_SUCURSAL, CTA03.Cod_Articu, CTA_ARTICULO.DESC_CTA_ARTICULO, CTA_ARTICULO.SINONIMO, ISNULL(FAMILIA_ART.COD_AGR,''), FAMILIA_ART.NOM_AGR, MEDIDA_STOCK.SIGLA_MEDIDA
            """

            # ============================================================
            # PRECIOS - Solo si es primera sync o no hay precios
            # ============================================================
            sincronizar_precios = es_primera_sync or total_precios_existentes == 0
            if not sincronizar_precios:
                print(f"  Precios: Ya sincronizados ({total_precios_existentes}), saltando...")
            
            query_precios = """
            SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED
            SET DATEFORMAT DMY
            SET DATEFIRST 7
            SET DEADLOCK_PRIORITY -8;
            SELECT
                STA11.COD_ARTICU AS [Cod. Articulo] ,
                STA11.DESCRIPCIO AS [Descripcion] ,
                STA11.SINONIMO AS [Sinonimo] ,
                FAMILIA_ART.COD_AGR AS [Cod. familia] ,
                FAMILIA_ART.NOM_AGR AS [Familia] ,
                GVA17.PRECIO AS [Precio] ,
                GVA10.NRO_DE_LIS AS [Cod. Lista de Precios] ,
                GVA10.NOMBRE_LIS AS [Lista de precios] ,
                GVA17.FECHA_MODI AS [Fecha de ultima modificacion]
            FROM
             gva17 (nolock)  inner join gva10 (nolock) on gva10.NRO_DE_LIS = gva17.NRO_DE_LIS  inner join sta11 (nolock) on sta11.COD_ARTICU = gva17.COD_ARTICU
            LEFT JOIN STA16 ON 1=1
            LEFT JOIN STA29 FAMILIA_ART (NOLOCK) ON  SUBSTRING(STA11.COD_ARTICU, 1, LONG_FAM_A) = FAMILIA_ART.COD_AGR
            LEFT JOIN STA29 GRUPO_ART (NOLOCK) ON  SUBSTRING(STA11.COD_ARTICU, 0, LONG_FAM_A + LONG_GRU_A + 1) = GRUPO_ART.COD_AGR
            LEFT JOIN (SELECT COD_ARTICU, DESCRIPCIO FROM STA11 WHERE USA_ESC = 'B') AS BASE ON  (CASE sta11.base when '' then STA11.COD_ARTICU ELSE STA11.BASE end) = BASE.COD_ARTICU
            LEFT JOIN MEDIDA ON MEDIDA.ID_MEDIDA = STA11.ID_MEDIDA_STOCK
            LEFT JOIN (SELECT N1.CODE, N1.IDFOLDER,  F1.PADRE0, F1.PADRE1, F1.PADRE2, F1.PADRE3, F1.PADRE4, F1.PADRE5, F1.PADRE6, F1.PADRE7, F1.PADRE8, F1.PADRE9, F1.PADRE10, F1.PADRE11  FROM STA11ITC N1  JOIN V_LI_CLASIFICADOR_STA11FLD F1 ON  (N1.IDFOLDER= F1.IDFOLDER_V)  ) AS CLASIF_ITEMS ON CLASIF_ITEMS.CODE = STA11.COD_ARTICU
            WHERE
            sta11.perfil <> 'N'
             AND
             GVA10.HABILITADA = 1 AND GVA10.NRO_DE_LIS IN ( '2' , '102' )
            GROUP BY
                STA11.COD_ARTICU , STA11.DESCRIPCIO , STA11.SINONIMO , FAMILIA_ART.COD_AGR , FAMILIA_ART.NOM_AGR , GVA17.PRECIO , GVA10.NRO_DE_LIS , GVA10.NOMBRE_LIS , GVA17.FECHA_MODI
            """

            # Consultar datos (solo lo necesario)
            df_saldo = pd.DataFrame()
            df_precios = pd.DataFrame()
            
            if sincronizar_saldos:
                print("  Consultando saldos...")
                df_saldo = pd.read_sql(query_saldo, conn)
                print(f"  Saldos obtenidos: {len(df_saldo)} registros")

            print("  Consultando ventas...")
            df_ventas = pd.read_sql(query_ventas, conn)
            print(f"  Ventas obtenidas: {len(df_ventas)} registros")

            if sincronizar_precios:
                print("  Consultando precios (Listas 2 y 102)...")
                df_precios = pd.read_sql(query_precios, conn)
                print(f"  Precios obtenidos: {len(df_precios)} registros")

            conn.close()

            # ============================================================
            # Enviar datos incrementalmente (SOLO lo que cambió)
            # ============================================================
            print("\n  Enviando datos a Replit (modo incremental)...")
            
            # Enviar saldos solo si hay datos nuevos
            if len(df_saldo) > 0:
                ok, n = enviar_en_lotes(REPL_URL, "saldo", df_saldo, BATCH_SIZE, incremental=True)
                if ok:
                    print(f"  [OK] Saldos sincronizados: {n} registros")
                else:
                    print(f"  [ERROR] Saldos. Enviados: {n}")
            
            # Enviar ventas solo si hay datos nuevos
            if len(df_ventas) > 0:
                ok, n = enviar_en_lotes(REPL_URL, "ventas", df_ventas, BATCH_SIZE, incremental=True)
                if ok:
                    print(f"  [OK] Ventas sincronizadas: {n} registros")
                else:
                    print(f"  [ERROR] Ventas. Enviados: {n}")
            else:
                print(f"  Ventas: Sin datos nuevos")
            
            # Enviar precios solo si hay datos nuevos
            if len(df_precios) > 0:
                ok, n = enviar_en_lotes(REPL_URL, "precios", df_precios, BATCH_SIZE, incremental=True)
                if ok:
                    print(f"  [OK] Precios sincronizados: {n} registros")
                else:
                    print(f"  [ERROR] Precios. Enviados: {n}")
            
            # Calcular metricas
            print("  Calculando metricas...")
            try:
                response = requests.post(
                    f"{REPL_URL}/sync",
                    json={"calculate_metrics": True},
                    timeout=180
                )
                if response.status_code == 200:
                    result = response.json()
                    print(f"  [OK] Metricas: {result.get('message', 'OK')}")
                else:
                    print(f"  [ERROR] Metricas: {response.text[:100]}")
            except Exception as e:
                print(f"  [ERROR] Metricas: {e}")

            print(f"\n[{datetime.now()}] Sincronizacion completada")
            print(f"  Proxima sincronizacion en {SYNC_INTERVAL} segundos...")
            print("-" * 60)
            time.sleep(SYNC_INTERVAL)

        except pyodbc.Error as db_error:
            print(f"[{datetime.now()}] Error de base de datos: {db_error}")
            time.sleep(SYNC_INTERVAL)
        except requests.exceptions.RequestException as req_error:
            print(f"[{datetime.now()}] Error de conexion a Replit: {req_error}")
            time.sleep(SYNC_INTERVAL)
        except Exception as e:
            print(f"[{datetime.now()}] Error general: {e}")
            import traceback
            traceback.print_exc()
            time.sleep(SYNC_INTERVAL)


if __name__ == "__main__":
    get_data()
