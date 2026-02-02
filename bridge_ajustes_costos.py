"""
BRIDGE SQL - Sincronización Tango -> Replit
Sincroniza: AJUSTES, COSTOS y VENTAS
"""
import pyodbc
import pandas as pd
import requests
import json
import time
import os
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
                    timeout=300  # 5 minutos para lotes grandes
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
    AND CTA09.T_COMP = 'AJU'
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


# ==============================================================
# QUERY: VENTAS (INCREMENTAL)
# ==============================================================
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


def main():
    """Ejecutar sincronización una vez y retornar resultado"""
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
        print("=" * 60)
        print("BRIDGE SQL - Sincronización AJUSTES, COSTOS y VENTAS")
        print("=" * 60)
        print(f"Servidor: tangoserver")
        print(f"Base de datos: crisa_real1")
        print(f"Destino: {REPL_URL}")
        print("=" * 60)
        
        # Obtener info de última sincronización
        sync_info = get_sync_info()
        print(f"  Estado actual en Replit:")
        print(f"    - Ajustes: {sync_info.get('total_ajustes', 0)}")
        print(f"    - Costos: {sync_info.get('total_costos', 0)}")
        print(f"    - Ventas: {sync_info.get('total_ventas', 0)}")
        
        # Conectar a SQL Server
        print("\n  Conectando a Tango...")
        conn = pyodbc.connect(conn_str, timeout=30)
        conn.timeout = 120

        # ============================================================
        # SINCRONIZAR AJUSTES
        # ============================================================
        print("\n  [AJUSTES] Consultando...")
        
        ultima_fecha_ajustes = sync_info.get('ultima_fecha_ajustes')
        if ultima_fecha_ajustes:
            fecha_desde_ajustes = (datetime.strptime(ultima_fecha_ajustes[:10], "%Y-%m-%d") - timedelta(days=7)).strftime("%d/%m/%Y")
            print(f"    Modo incremental desde: {fecha_desde_ajustes}")
        else:
            fecha_desde_ajustes = "01/08/2025"
            print(f"    Primera sincronización desde: {fecha_desde_ajustes}")
        
        query_ajustes = QUERY_AJUSTES.format(fecha_desde=fecha_desde_ajustes)
        df_ajustes = pd.read_sql(query_ajustes, conn)
        print(f"    Registros obtenidos: {len(df_ajustes)}")
        
        if len(df_ajustes) > 0:
            registros_ajustes = df_ajustes.to_dict(orient="records")
            _, enviados = enviar_en_lotes("ajustes", registros_ajustes, BATCH_SIZE)
            resultado["ajustes"] = enviados
            print(f"    Sincronizados: {enviados}")

        # ============================================================
        # SINCRONIZAR COSTOS (solo los lunes para optimizar)
        # ============================================================
        dia_semana = datetime.now().weekday()  # 0=Lunes, 1=Martes, etc.
        
        if dia_semana == 0:  # Solo los lunes
            print("\n  [COSTOS] Consultando (sincronización semanal - Lunes)...")
            
            df_costos = pd.read_sql(QUERY_COSTOS, conn)
            print(f"    Registros obtenidos: {len(df_costos)}")
            
            if len(df_costos) > 0:
                registros_costos = df_costos.to_dict(orient="records")
                _, enviados = enviar_en_lotes("costos", registros_costos, BATCH_SIZE)
                resultado["costos"] = enviados
                print(f"    Sincronizados: {enviados}")
        else:
            print("\n  [COSTOS] Omitido (solo se sincroniza los lunes)")
            resultado["costos"] = 0

        # ============================================================
        # SINCRONIZAR VENTAS (INCREMENTAL)
        # ============================================================
        print("\n  [VENTAS] Consultando...")
        
        ultima_fecha_ventas = sync_info.get('ultima_fecha_ventas')
        if ultima_fecha_ventas:
            # Tomar desde la última fecha exacta (sin retroceder días)
            fecha_desde_ventas = datetime.strptime(ultima_fecha_ventas[:10], "%Y-%m-%d").strftime("%d/%m/%Y")
            print(f"    Modo incremental desde: {fecha_desde_ventas}")
        else:
            fecha_desde_ventas = "01/09/2024"
            print(f"    Primera sincronización desde: {fecha_desde_ventas}")
        
        query_ventas = QUERY_VENTAS.format(fecha_desde=fecha_desde_ventas)
        df_ventas = pd.read_sql(query_ventas, conn)
        print(f"    Registros obtenidos: {len(df_ventas)}")
        
        if len(df_ventas) > 0:
            registros_ventas = df_ventas.to_dict(orient="records")
            _, enviados = enviar_en_lotes("ventas", registros_ventas, BATCH_SIZE)
            resultado["ventas"] = enviados
            print(f"    Sincronizados: {enviados}")

        conn.close()
        
        # Obtener fechas actualizadas después de la sincronización
        try:
            sync_info_final = get_sync_info()
            resultado["ultima_fecha_ajustes"] = sync_info_final.get('ultima_fecha_ajustes')
            resultado["ultima_fecha_costos"] = sync_info_final.get('ultima_sync_costos')
            resultado["ultima_fecha_ventas"] = sync_info_final.get('ultima_fecha_ventas')
        except:
            pass
        
        resultado["exito"] = True
        print(f"\n[{datetime.now()}] Sincronización completada exitosamente")
        print(f"  Ajustes: {resultado['ajustes']} registros (última fecha: {resultado['ultima_fecha_ajustes']})")
        print(f"  Costos: {resultado['costos']} registros (última fecha: {resultado['ultima_fecha_costos']})")
        print(f"  Ventas: {resultado['ventas']} registros (última fecha: {resultado['ultima_fecha_ventas']})")
        
        return resultado

    except pyodbc.Error as e:
        error_msg = f"Error de conexión SQL: {e}"
        print(f"\n[ERROR] {error_msg}")
        resultado["error"] = error_msg
        return resultado
    except Exception as e:
        error_msg = f"Error inesperado: {e}"
        print(f"\n[ERROR] {error_msg}")
        resultado["error"] = error_msg
        return resultado


def enviar_notificacion_email(resultado):
    """Enviar email de notificación al finalizar la sincronización"""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    SMTP_SERVER = "smtp.textilcrisa.com"
    SMTP_PORT = 26
    SMTP_USER = "reportes@textilcrisa.com"
    # La contraseña debe estar configurada como variable de entorno
    SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
    
    if not SMTP_PASSWORD:
        print("  [AVISO] No se pudo enviar email: SMTP_PASSWORD no configurada")
        return
    
    fecha = datetime.now().strftime("%d/%m/%Y %H:%M")
    destinatario = "lreyes@textilcrisa.com"
    
    msg = MIMEMultipart()
    msg['From'] = SMTP_USER
    msg['To'] = destinatario
    
    if resultado.get("exito"):
        msg['Subject'] = f"✅ Sistema de Seguimiento de Inventarios - Sincronización exitosa - {fecha}"
        
        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #28a745;">✅ Sistema de Seguimiento de Inventarios</h2>
        <h3 style="color: #666; margin-top: 5px;">Sincronización Bridge Exitosa</h3>
        <p><strong>Fecha de ejecución:</strong> {fecha}</p>
        
        <table style="border-collapse: collapse; width: 100%; max-width: 500px; margin: 20px 0;">
          <tr style="background: #f8f9fa;">
            <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left;">Tipo de Dato</th>
            <th style="border: 1px solid #dee2e6; padding: 12px; text-align: right;">Registros</th>
            <th style="border: 1px solid #dee2e6; padding: 12px; text-align: center;">Última Fecha</th>
          </tr>
          <tr>
            <td style="border: 1px solid #dee2e6; padding: 12px;">📦 Ajustes</td>
            <td style="border: 1px solid #dee2e6; padding: 12px; text-align: right; font-weight: bold;">{resultado.get('ajustes', 0):,}</td>
            <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center; color: #0066cc;">{resultado.get('ultima_fecha_ajustes', 'N/A')}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #dee2e6; padding: 12px;">💰 Costos</td>
            <td style="border: 1px solid #dee2e6; padding: 12px; text-align: right; font-weight: bold;">{resultado.get('costos', 0):,}</td>
            <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center; color: #0066cc;">{resultado.get('ultima_fecha_costos', 'N/A')}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #dee2e6; padding: 12px;">🛒 Ventas</td>
            <td style="border: 1px solid #dee2e6; padding: 12px; text-align: right; font-weight: bold;">{resultado.get('ventas', 0):,}</td>
            <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center; color: #0066cc;">{resultado.get('ultima_fecha_ventas', 'N/A')}</td>
          </tr>
          <tr style="background: #e9ecef;">
            <td style="border: 1px solid #dee2e6; padding: 12px; font-weight: bold;">Total</td>
            <td style="border: 1px solid #dee2e6; padding: 12px; text-align: right; font-weight: bold;">{resultado.get('ajustes', 0) + resultado.get('costos', 0) + resultado.get('ventas', 0):,}</td>
            <td style="border: 1px solid #dee2e6; padding: 12px;"></td>
          </tr>
        </table>
        
        <p style="color: #666; font-size: 12px;">Este es un mensaje automático del sistema de sincronización.</p>
        </body>
        </html>
        """
    else:
        msg['Subject'] = f"⚠️ Sistema de Seguimiento de Inventarios - Error en sincronización - {fecha}"
        error = resultado.get("error", "Error desconocido")
        
        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #dc3545;">⚠️ Sistema de Seguimiento de Inventarios</h2>
        <h3 style="color: #666; margin-top: 5px;">Error en Bridge de Sincronización</h3>
        <p><strong>Fecha:</strong> {fecha}</p>
        <p><strong>Detalle del error:</strong></p>
        <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto;">{error}</pre>
        <p style="color: #666; font-size: 12px;">Este es un mensaje automático del sistema de sincronización.</p>
        </body>
        </html>
        """
    
    msg.attach(MIMEText(html, 'html'))
    
    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, [destinatario], msg.as_string())
        server.quit()
        print(f"  [EMAIL] Notificación enviada a {destinatario}")
    except Exception as e:
        print(f"  [ERROR EMAIL] No se pudo enviar notificación: {e}")


def ejecutar_una_vez():
    """Ejecutar sincronización una sola vez y enviar notificación"""
    print("=" * 60)
    print("BRIDGE SQL - Sincronización Única")
    print("Sistema de Seguimiento de Inventarios")
    print("=" * 60)
    print(f"Fecha de ejecución: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print("=" * 60)
    
    resultado = main()
    
    # Enviar notificación por email
    print("\n  Enviando notificación por email...")
    enviar_notificacion_email(resultado)
    
    if resultado.get("exito"):
        print("\n" + "=" * 60)
        print("SINCRONIZACIÓN COMPLETADA EXITOSAMENTE")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("SINCRONIZACIÓN FINALIZADA CON ERRORES")
        print("=" * 60)
    
    return resultado


def sincronizar():
    """Ejecutar sincronización en loop continuo (modo legacy)"""
    print("=" * 60)
    print("BRIDGE SQL - Sincronización Continua")
    print("=" * 60)
    print(f"Intervalo: {SYNC_INTERVAL} segundos")
    print("=" * 60)

    while True:
        try:
            if not esta_en_horario_sync():
                ahora = datetime.now()
                print(f"[{ahora}] Fuera de horario de sincronización")
                time.sleep(SYNC_INTERVAL)
                continue

            main()
            
            print(f"Próxima sincronización en {SYNC_INTERVAL} segundos...")
            time.sleep(SYNC_INTERVAL)

        except Exception as e:
            print(f"\n[ERROR] Error inesperado: {e}")
            print(f"Reintentando en 60 segundos...")
            time.sleep(60)


if __name__ == "__main__":
    import sys
    
    # Si se pasa --loop, ejecuta en modo continuo (legacy)
    # Por defecto ejecuta una sola vez para tareas programadas
    if len(sys.argv) > 1 and sys.argv[1] == "--loop":
        sincronizar()
    else:
        ejecutar_una_vez()
