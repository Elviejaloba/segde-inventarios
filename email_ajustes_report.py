"""
Módulo de Reportes Ejecutivos de Ajustes - GRUPO CRISA
Reporte gerencial de ajustes de inventario valorizados
Compatible con Outlook 2007+
"""

import smtplib
import os
import sys
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor

# Configuración SMTP
SMTP_SERVER = "smtp.textilcrisa.com"
SMTP_PORT = 26
SMTP_USER = "reportes@textilcrisa.com"
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")

# URL del dashboard
DASHBOARD_URL = "https://seguimientodeinv.replit.app"

# Colores corporativos
COLORS = {
    'primary': '#2d3748',
    'header_bg': '#1e40af',
    'red': '#dc3545',
    'yellow': '#ffc107', 
    'green': '#28a745',
    'light': '#f7f7f7',
    'dark': '#333333',
    'border': '#dddddd',
    'text': '#555555'
}

def get_db_connection():
    """Obtiene conexión a la base de datos"""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise Exception("DATABASE_URL no configurada")
    return psycopg2.connect(database_url)

def get_ajustes_valorizados(dias=30):
    """
    Obtiene ajustes valorizados por sucursal
    Cruza ajustes con costos para calcular pérdida valorizada
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        fecha_desde = datetime.now() - timedelta(days=dias)
        
        query = """
        WITH ajustes_periodo AS (
            SELECT 
                a."Sucursal",
                a."Codigo",
                a."Articulo",
                a."Diferencia",
                a."FechaMovimiento",
                a."TipoMovimiento",
                a."NroComprobante"
            FROM ajustes_sucursales a
            WHERE a."FechaMovimiento" >= %s OR a."FechaMovimiento" IS NULL
        ),
        ajustes_valorizado AS (
            SELECT 
                ap."Sucursal",
                ap."Codigo",
                ap."Articulo",
                ap."Diferencia",
                COALESCE(c."Costo", 0) as costo_unitario,
                ap."Diferencia" * COALESCE(c."Costo", 0) as valor_ajuste
            FROM ajustes_periodo ap
            LEFT JOIN costos_articulos c ON TRIM(ap."Codigo") = TRIM(c."Codigo")
        )
        SELECT 
            "Sucursal",
            COUNT(*) as total_ajustes,
            SUM("Diferencia") as diferencia_unidades,
            SUM(CASE WHEN "Diferencia" < 0 THEN "Diferencia" ELSE 0 END) as perdida_unidades,
            SUM(CASE WHEN "Diferencia" > 0 THEN "Diferencia" ELSE 0 END) as ganancia_unidades,
            SUM(CASE WHEN "Diferencia" < 0 THEN valor_ajuste ELSE 0 END) as perdida_valorizada,
            SUM(CASE WHEN "Diferencia" > 0 THEN valor_ajuste ELSE 0 END) as ganancia_valorizada,
            SUM(valor_ajuste) as balance_valorizado,
            COUNT(DISTINCT "Codigo") as articulos_afectados
        FROM ajustes_valorizado
        GROUP BY "Sucursal"
        ORDER BY perdida_valorizada ASC
        """
        
        cursor.execute(query, (fecha_desde,))
        resultados = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return resultados
    except Exception as e:
        print(f"Error obteniendo ajustes valorizados: {e}")
        return []

def get_resumen_comprobantes(dias=30):
    """Obtiene resumen de comprobantes por sucursal"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        fecha_desde = datetime.now() - timedelta(days=dias)
        
        query = """
        SELECT 
            "Sucursal",
            COUNT(DISTINCT "NroComprobante") as total_comprobantes,
            MIN("FechaMovimiento") as primera_fecha,
            MAX("FechaMovimiento") as ultima_fecha
        FROM ajustes_sucursales
        WHERE "FechaMovimiento" >= %s OR "FechaMovimiento" IS NULL
        GROUP BY "Sucursal"
        ORDER BY "Sucursal"
        """
        
        cursor.execute(query, (fecha_desde,))
        resultados = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return resultados
    except Exception as e:
        print(f"Error obteniendo comprobantes: {e}")
        return []

def get_ajustes_por_unidad(dias=30):
    """
    Obtiene el desglose de ajustes por unidad de medida (UN, MTS, KG)
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Consulta simplificada sin filtro de fecha para evitar problemas
        query = """
        SELECT 
            CASE 
                WHEN UPPER(COALESCE("UnidadMedida", 'UN')) LIKE '%%KG%%' OR UPPER(COALESCE("UnidadMedida", 'UN')) LIKE '%%KILO%%' THEN 'KG'
                WHEN UPPER(COALESCE("UnidadMedida", 'UN')) LIKE '%%MTS%%' OR UPPER(COALESCE("UnidadMedida", 'UN')) LIKE '%%METRO%%' THEN 'MTS'
                ELSE 'UN'
            END as unidad_medida,
            COUNT(*) as cantidad_ajustes,
            SUM(ABS("Diferencia")) as total_ajustado
        FROM ajustes_sucursales
        GROUP BY 1
        ORDER BY total_ajustado DESC
        """
        
        cursor.execute(query)
        resultados = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        # Asegurar que tenemos los 3 tipos
        default = {'cantidad_ajustes': 0, 'total_ajustado': 0}
        result_dict = {}
        for r in resultados:
            key = r.get('unidad_medida') or 'UN'
            result_dict[key] = r
        return {
            'UN': result_dict.get('UN', default),
            'MTS': result_dict.get('MTS', default),
            'KG': result_dict.get('KG', default)
        }
    except Exception as e:
        print(f"Error obteniendo ajustes por unidad: {e}")
        import traceback
        traceback.print_exc()
        return {'UN': {'cantidad_ajustes': 0, 'total_ajustado': 0}, 'MTS': {'cantidad_ajustes': 0, 'total_ajustado': 0}, 'KG': {'cantidad_ajustes': 0, 'total_ajustado': 0}}

def clasificar_sucursal(perdida_valorizada):
    """Clasifica el estado de la sucursal según pérdida valorizada"""
    perdida = abs(float(perdida_valorizada or 0))
    if perdida >= 1000000:  # >= $1M pérdida
        return "CRITICO", COLORS['red'], "#ffffff"
    elif perdida >= 500000:  # >= $500K pérdida  
        return "ALERTA", COLORS['yellow'], "#333333"
    else:
        return "CONTROLADO", COLORS['green'], "#ffffff"

def generar_html_reporte(dias=30):
    """Genera HTML del reporte ejecutivo de ajustes"""
    ajustes = get_ajustes_valorizados(dias)
    comprobantes = get_resumen_comprobantes(dias)
    unidades = get_ajustes_por_unidad(dias)
    fecha = datetime.now().strftime("%d/%m/%Y %H:%M")
    
    # Calcular totales
    total_ajustes = sum(float(a['total_ajustes'] or 0) for a in ajustes)
    total_perdida = sum(float(a['perdida_valorizada'] or 0) for a in ajustes)
    total_ganancia = sum(float(a['ganancia_valorizada'] or 0) for a in ajustes)
    total_balance = sum(float(a['balance_valorizado'] or 0) for a in ajustes)
    total_articulos = sum(int(a['articulos_afectados'] or 0) for a in ajustes)
    
    # Contar por estado
    criticos = sum(1 for a in ajustes if abs(float(a['perdida_valorizada'] or 0)) >= 1000000)
    alertas = sum(1 for a in ajustes if 500000 <= abs(float(a['perdida_valorizada'] or 0)) < 1000000)
    controlados = len(ajustes) - criticos - alertas
    
    # Filas de sucursales
    filas_sucursales = ""
    for i, ajuste in enumerate(ajustes):
        perdida = float(ajuste['perdida_valorizada'] or 0)
        ganancia = float(ajuste['ganancia_valorizada'] or 0)
        balance = float(ajuste['balance_valorizado'] or 0)
        sucursal_raw = ajuste.get('Sucursal') or ajuste.get('sucursal', 'N/A')
        # Acortar nombre: quitar "LA TIJERA " 
        sucursal = sucursal_raw.replace('LA TIJERA ', '').replace('SMARTIN', 'SAN MARTIN')
        nivel, color, text_color = clasificar_sucursal(perdida)
        bg = "#ffffff" if i % 2 == 0 else "#f9f9f9"
        
        indicador = f'<span style="color:{color};font-size:14px;font-weight:bold;">&#9679;</span>'
        balance_fmt = f'-${abs(balance):,.0f}' if balance < 0 else f'${balance:,.0f}'
        
        filas_sucursales += f"""
        <tr style="background-color:{bg};">
            <td style="padding:10px 12px;border-bottom:1px solid #eeeeee;font-family:Arial,sans-serif;font-size:13px;white-space:nowrap;">
                {indicador} <strong>{sucursal}</strong>
            </td>
            <td style="padding:10px 8px;border-bottom:1px solid #eeeeee;text-align:right;font-family:Arial,sans-serif;font-size:12px;color:{COLORS['red']};font-weight:bold;white-space:nowrap;">
                ${abs(perdida):,.0f}
            </td>
            <td style="padding:10px 8px;border-bottom:1px solid #eeeeee;text-align:right;font-family:Arial,sans-serif;font-size:12px;color:{COLORS['green']};white-space:nowrap;">
                ${ganancia:,.0f}
            </td>
            <td style="padding:10px 8px;border-bottom:1px solid #eeeeee;text-align:right;font-family:Arial,sans-serif;font-size:12px;color:{'#dc3545' if balance < 0 else '#28a745'};font-weight:bold;white-space:nowrap;">
                {balance_fmt}
            </td>
            <td style="padding:12px 15px;border-bottom:1px solid #eeeeee;text-align:center;font-family:Arial,sans-serif;font-size:14px;">
                {int(ajuste['total_ajustes'] or 0)}
            </td>
            <td style="padding:12px 15px;border-bottom:1px solid #eeeeee;text-align:center;font-family:Arial,sans-serif;font-size:14px;">
                {int(ajuste['articulos_afectados'] or 0)}
            </td>
        </tr>
        """
    
    html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!--[if mso]>
    <style type="text/css">
        table {{border-collapse:collapse;}}
        td {{font-family:Arial,sans-serif;}}
    </style>
    <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#e5e5e5;font-family:Arial,Helvetica,sans-serif;">
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#e5e5e5;">
        <tr>
            <td align="center" style="padding:30px 15px;">
                
                <table role="presentation" width="700" cellspacing="0" cellpadding="0" border="0" style="background-color:#ffffff;border:1px solid #dddddd;">
                    
                    <!-- Header con Logo -->
                    <tr>
                        <td style="background-color:#4a5568;padding:25px;text-align:center;">
                            <img src="cid:logo" alt="GRUPO CRISA" width="200" style="display:block;margin:0 auto;">
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:{COLORS['header_bg']};padding:20px;text-align:center;">
                            <h1 style="color:#ffffff;margin:0;font-family:Arial,sans-serif;font-size:22px;font-weight:bold;">
                                Reporte de ajustes para el directorio
                            </h1>
                            <p style="color:#93c5fd;margin:8px 0 0;font-family:Arial,sans-serif;font-size:13px;">
                                Seguimiento de Inventario
                            </p>
                            <p style="color:#bfdbfe;margin:8px 0 0;font-family:Arial,sans-serif;font-size:11px;">
                                Generado: {fecha} | Período: Últimos {dias} días
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Leyenda de valorización -->
                    <tr>
                        <td style="padding:15px 30px 5px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#fef3c7;border-left:4px solid #f59e0b;">
                                <tr>
                                    <td style="padding:12px 15px;">
                                        <p style="font-family:Arial,sans-serif;font-size:12px;color:#92400e;margin:0;">
                                            <strong>💰 Valorización:</strong> Todos los montos están calculados a <strong>Costo de Reposición</strong> vigente.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Semáforo de sucursales -->
                    <tr>
                        <td style="padding:25px 30px 15px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td width="33%" align="center" style="padding:10px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border:2px solid {COLORS['red']};background-color:#fff5f5;width:100%;">
                                            <tr>
                                                <td style="padding:20px;text-align:center;">
                                                    <div style="font-family:Arial,sans-serif;font-size:36px;font-weight:bold;color:{COLORS['red']};">{criticos}</div>
                                                    <div style="font-family:Arial,sans-serif;font-size:11px;color:{COLORS['red']};text-transform:uppercase;font-weight:bold;">Críticas</div>
                                                    <div style="font-family:Arial,sans-serif;font-size:10px;color:#999;margin-top:5px;">≥ $1M pérdida</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td width="33%" align="center" style="padding:10px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border:2px solid {COLORS['yellow']};background-color:#fffbf0;width:100%;">
                                            <tr>
                                                <td style="padding:20px;text-align:center;">
                                                    <div style="font-family:Arial,sans-serif;font-size:36px;font-weight:bold;color:#b38600;">{alertas}</div>
                                                    <div style="font-family:Arial,sans-serif;font-size:11px;color:#b38600;text-transform:uppercase;font-weight:bold;">En Alerta</div>
                                                    <div style="font-family:Arial,sans-serif;font-size:10px;color:#999;margin-top:5px;">$500K - $1M</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td width="33%" align="center" style="padding:10px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border:2px solid {COLORS['green']};background-color:#f0fff4;width:100%;">
                                            <tr>
                                                <td style="padding:20px;text-align:center;">
                                                    <div style="font-family:Arial,sans-serif;font-size:36px;font-weight:bold;color:{COLORS['green']};">{controlados}</div>
                                                    <div style="font-family:Arial,sans-serif;font-size:11px;color:{COLORS['green']};text-transform:uppercase;font-weight:bold;">Controladas</div>
                                                    <div style="font-family:Arial,sans-serif;font-size:10px;color:#999;margin-top:5px;">< $500K</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Título KPIs con período -->
                    <tr>
                        <td style="padding:15px 30px 5px;">
                            <h3 style="font-family:Arial,sans-serif;font-size:14px;color:#333333;margin:0;font-weight:bold;">
                                Resumen del Período: Últimos {dias} días
                            </h3>
                        </td>
                    </tr>
                    
                    <!-- KPIs Principales -->
                    <tr>
                        <td style="padding:10px 30px 25px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td width="25%" style="padding:5px;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:{COLORS['primary']};">
                                            <tr>
                                                <td style="padding:20px;text-align:center;">
                                                    <div style="font-family:Arial,sans-serif;font-size:22px;font-weight:bold;color:#ffffff;">{int(total_ajustes):,}</div>
                                                    <div style="font-family:Arial,sans-serif;font-size:10px;color:#aaaaaa;text-transform:uppercase;margin-top:5px;">Total Ajustes</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td width="25%" style="padding:5px;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:{COLORS['red']};">
                                            <tr>
                                                <td style="padding:20px;text-align:center;">
                                                    <div style="font-family:Arial,sans-serif;font-size:22px;font-weight:bold;color:#ffffff;">${abs(total_perdida):,.0f}</div>
                                                    <div style="font-family:Arial,sans-serif;font-size:10px;color:#ffcccc;text-transform:uppercase;margin-top:5px;">Pérdida Total</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td width="25%" style="padding:5px;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:{COLORS['green']};">
                                            <tr>
                                                <td style="padding:20px;text-align:center;">
                                                    <div style="font-family:Arial,sans-serif;font-size:22px;font-weight:bold;color:#ffffff;">${total_ganancia:,.0f}</div>
                                                    <div style="font-family:Arial,sans-serif;font-size:10px;color:#ccffcc;text-transform:uppercase;margin-top:5px;">Ganancia Total</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td width="25%" style="padding:5px;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:{'#b91c1c' if total_balance < 0 else '#15803d'};">
                                            <tr>
                                                <td style="padding:20px;text-align:center;">
                                                    <div style="font-family:Arial,sans-serif;font-size:22px;font-weight:bold;color:#ffffff;">${total_balance:,.0f}</div>
                                                    <div style="font-family:Arial,sans-serif;font-size:10px;color:#ffffff;text-transform:uppercase;margin-top:5px;">Balance Neto</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Desglose por Unidad de Medida -->
                    <tr>
                        <td style="padding:15px 30px 5px;">
                            <h3 style="font-family:Arial,sans-serif;font-size:14px;color:#333333;margin:0;font-weight:bold;">
                                📦 Ajustes por Unidad de Medida
                            </h3>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:10px 30px 25px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td width="33%" style="padding:5px;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3e8ff;border:2px solid #9333ea;">
                                            <tr>
                                                <td style="padding:15px;text-align:center;">
                                                    <div style="font-family:Arial,sans-serif;font-size:24px;font-weight:bold;color:#7c3aed;">{float(unidades['UN'].get('total_ajustado', 0) or 0):,.0f}</div>
                                                    <div style="font-family:Arial,sans-serif;font-size:12px;color:#7c3aed;text-transform:uppercase;font-weight:bold;margin-top:5px;">Unidades</div>
                                                    <div style="font-family:Arial,sans-serif;font-size:10px;color:#999;margin-top:3px;">{int(unidades['UN'].get('cantidad_ajustes', 0) or 0):,} registros</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td width="33%" style="padding:5px;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#dbeafe;border:2px solid #2563eb;">
                                            <tr>
                                                <td style="padding:15px;text-align:center;">
                                                    <div style="font-family:Arial,sans-serif;font-size:24px;font-weight:bold;color:#1d4ed8;">{float(unidades['MTS'].get('total_ajustado', 0) or 0):,.1f}</div>
                                                    <div style="font-family:Arial,sans-serif;font-size:12px;color:#1d4ed8;text-transform:uppercase;font-weight:bold;margin-top:5px;">Metros</div>
                                                    <div style="font-family:Arial,sans-serif;font-size:10px;color:#999;margin-top:3px;">{int(unidades['MTS'].get('cantidad_ajustes', 0) or 0):,} registros</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td width="33%" style="padding:5px;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#ffedd5;border:2px solid #ea580c;">
                                            <tr>
                                                <td style="padding:15px;text-align:center;">
                                                    <div style="font-family:Arial,sans-serif;font-size:24px;font-weight:bold;color:#c2410c;">{float(unidades['KG'].get('total_ajustado', 0) or 0):,.2f}</div>
                                                    <div style="font-family:Arial,sans-serif;font-size:12px;color:#c2410c;text-transform:uppercase;font-weight:bold;margin-top:5px;">Kilogramos</div>
                                                    <div style="font-family:Arial,sans-serif;font-size:10px;color:#999;margin-top:3px;">{int(unidades['KG'].get('cantidad_ajustes', 0) or 0):,} registros</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Título tabla -->
                    <tr>
                        <td style="padding:0 30px 10px;">
                            <h3 style="font-family:Arial,sans-serif;font-size:16px;color:#333333;margin:0;font-weight:bold;">
                                📋 Detalle por Sucursal
                            </h3>
                        </td>
                    </tr>
                    
                    <!-- Tabla de sucursales -->
                    <tr>
                        <td style="padding:0 30px 25px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #dddddd;">
                                <tr style="background-color:{COLORS['primary']};">
                                    <th style="padding:12px 15px;text-align:left;font-family:Arial,sans-serif;font-size:12px;color:#ffffff;font-weight:bold;">Sucursal</th>
                                    <th style="padding:12px 15px;text-align:right;font-family:Arial,sans-serif;font-size:12px;color:#ffffff;font-weight:bold;">Pérdida $</th>
                                    <th style="padding:12px 15px;text-align:right;font-family:Arial,sans-serif;font-size:12px;color:#ffffff;font-weight:bold;">Ganancia $</th>
                                    <th style="padding:12px 15px;text-align:right;font-family:Arial,sans-serif;font-size:12px;color:#ffffff;font-weight:bold;">Balance $</th>
                                    <th style="padding:12px 15px;text-align:center;font-family:Arial,sans-serif;font-size:12px;color:#ffffff;font-weight:bold;">Ajustes</th>
                                    <th style="padding:12px 15px;text-align:center;font-family:Arial,sans-serif;font-size:12px;color:#ffffff;font-weight:bold;">Artículos</th>
                                </tr>
                                {filas_sucursales}
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Botón CTA -->
                    <tr>
                        <td style="padding:10px 30px 30px;text-align:center;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                                <tr>
                                    <td style="background-color:{COLORS['header_bg']};padding:14px 35px;border-radius:5px;">
                                        <a href="{DASHBOARD_URL}/reportes" style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;text-decoration:none;font-weight:bold;">
                                            🔍 Ver Dashboard Completo
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f7f7f7;padding:20px 30px;border-top:1px solid #dddddd;">
                            <p style="font-family:Arial,sans-serif;font-size:11px;color:#888888;margin:0;text-align:center;">
                                Sistema de Seguimiento de Inventario - GRUPO CRISA<br>
                                Este es un correo automático generado por el sistema.
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
    
</body>
</html>
"""
    
    return html

def enviar_reporte(destinatarios, dias=30, asunto_personalizado=None):
    """
    Envía el reporte ejecutivo por email
    
    Args:
        destinatarios: Lista de emails o string separado por comas
        dias: Días a considerar para el reporte
        asunto_personalizado: Asunto personalizado (opcional)
    """
    if isinstance(destinatarios, str):
        destinatarios = [d.strip() for d in destinatarios.split(',')]
    
    fecha = datetime.now().strftime("%d/%m/%Y")
    asunto = asunto_personalizado or f"Reporte Ejecutivo de Ajustes - {fecha}"
    
    html_content = generar_html_reporte(dias)
    
    # Usar 'related' para soportar imágenes embebidas
    msg = MIMEMultipart('related')
    msg['Subject'] = asunto
    msg['From'] = SMTP_USER
    msg['To'] = ', '.join(destinatarios)
    
    # Contenedor alternativo (texto plano + HTML)
    msg_alternative = MIMEMultipart('alternative')
    
    # Texto plano como fallback
    texto_plano = f"""
Reporte de ajustes para el directorio - GRUPO CRISA
Fecha: {fecha}
Período: Últimos {dias} días
Valorización: Costo de Reposición

Para ver el reporte completo, acceda a: {DASHBOARD_URL}/reportes

Este es un correo automático generado por el sistema.
    """
    
    part1 = MIMEText(texto_plano, 'plain')
    part2 = MIMEText(html_content, 'html')
    
    msg_alternative.attach(part1)
    msg_alternative.attach(part2)
    msg.attach(msg_alternative)
    
    # Adjuntar logo
    logo_path = os.path.join(os.path.dirname(__file__), 'assets', 'logo_crisa.png')
    if os.path.exists(logo_path):
        with open(logo_path, 'rb') as f:
            logo_data = f.read()
            logo_img = MIMEImage(logo_data)
            logo_img.add_header('Content-ID', '<logo>')
            logo_img.add_header('Content-Disposition', 'inline', filename='logo_crisa.png')
            msg.attach(logo_img)
    
    try:
        if not SMTP_PASSWORD:
            print("⚠️  SMTP_PASSWORD no configurada. Generando vista previa...")
            return False, "SMTP_PASSWORD no configurada"
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, destinatarios, msg.as_string())
        server.quit()
        
        print(f"✅ Reporte enviado exitosamente a: {', '.join(destinatarios)}")
        return True, "Enviado exitosamente"
    except Exception as e:
        print(f"❌ Error enviando email: {e}")
        return False, str(e)

def generar_preview(dias=30, archivo_salida="preview_reporte_ajustes.html"):
    """Genera una vista previa HTML del reporte"""
    html = generar_html_reporte(dias)
    with open(archivo_salida, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"✅ Vista previa generada: {archivo_salida}")
    return archivo_salida

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Reporte Ejecutivo de Ajustes')
    parser.add_argument('--dias', type=int, default=30, help='Días a considerar')
    parser.add_argument('--email', type=str, help='Email(s) destino, separados por coma')
    parser.add_argument('--preview', action='store_true', help='Generar solo preview HTML')
    parser.add_argument('--test', action='store_true', help='Mostrar datos sin enviar')
    
    args = parser.parse_args()
    
    if args.test:
        print("\n=== DATOS DE AJUSTES VALORIZADOS ===\n")
        ajustes = get_ajustes_valorizados(args.dias)
        for a in ajustes:
            sucursal = a.get('Sucursal') or a.get('sucursal', 'N/A')
            print(f"  {sucursal}: {a['total_ajustes']} ajustes, Pérdida: ${abs(float(a['perdida_valorizada'] or 0)):,.0f}")
        print()
    elif args.preview:
        generar_preview(args.dias)
    elif args.email:
        enviar_reporte(args.email, args.dias)
    else:
        print("Uso:")
        print("  python email_ajustes_report.py --test          # Ver datos")
        print("  python email_ajustes_report.py --preview       # Generar HTML preview")
        print("  python email_ajustes_report.py --email user@example.com")
        print("  python email_ajustes_report.py --email user@example.com --dias 60")
