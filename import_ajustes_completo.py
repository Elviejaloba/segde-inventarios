#!/usr/bin/env python3
"""
Script para importar ajustes con formato completo a PostgreSQL.
Formato esperado: Comprobante | Sucursal | Nro. comprobante | Fecha movimiento | Tipo de Movimiento | Cód. Artículo | Artículo | Cantidad
"""

import pandas as pd
import psycopg2
from datetime import datetime
import os
from urllib.parse import urlparse

# Mapeo de nombres de sucursales para consistencia
SUCURSAL_MAPPING = {
    'CRISA 2': 'Crisa2',
    'CRISA2': 'Crisa2',
    'LA TIJERA SAN LUIS': 'T.Luis',
    'T.LUIS': 'T.Luis',
    'LA TIJERA LUJAN': 'T.Lujan',
    'T.LUJAN': 'T.Lujan',
    'LA TIJERA SAN MARTIN': 'T.S.Martin',
    'T.S.MARTIN': 'T.S.Martin',
    'LA TIJERA MAIPU': 'T.Maipu',
    'T.MAIPU': 'T.Maipu',
    'LA TIJERA TUNUYAN': 'T.Tunuyan',
    'T.TUNUYAN': 'T.Tunuyan',
    'LA TIJERA SAN RAFAEL': 'T.Srafael',
    'T.SRAFAEL': 'T.Srafael',
    'T.MENDOZA': 'T.Mendoza',
    'LA TIJERA MENDOZA': 'T.Mendoza',
    'T.SJUAN': 'T.Sjuan',
    'LA TIJERA SAN JUAN': 'T.Sjuan'
}

def formatear_fecha(fecha_excel):
    """
    Convierte fecha de Excel a formato DD/MM/YYYY
    """
    try:
        if pd.isna(fecha_excel):
            return None
        
        # Si es un número (serial de Excel)
        if isinstance(fecha_excel, (int, float)):
            # Convertir número serial de Excel a fecha
            fecha = datetime(1900, 1, 1) + pd.Timedelta(days=fecha_excel - 2)
            return fecha.strftime('%d/%m/%Y')
        
        # Si ya es una fecha
        if isinstance(fecha_excel, datetime):
            return fecha_excel.strftime('%d/%m/%Y')
        
        # Si es string, intentar parsearlo
        if isinstance(fecha_excel, str):
            # Intentar varios formatos
            formatos = ['%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y', '%m/%d/%Y']
            for formato in formatos:
                try:
                    fecha = datetime.strptime(fecha_excel, formato)
                    return fecha.strftime('%d/%m/%Y')
                except ValueError:
                    continue
        
        return str(fecha_excel)  # Si no se puede convertir, devolver como string
    except Exception as e:
        print(f"Error al formatear fecha {fecha_excel}: {e}")
        return None

def conectar_db():
    """Conecta a PostgreSQL usando DATABASE_URL"""
    try:
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            raise ValueError("DATABASE_URL no encontrada en variables de entorno")
        
        # Parse de la URL de la base de datos
        url_parts = urlparse(database_url)
        
        conn = psycopg2.connect(
            host=url_parts.hostname,
            port=url_parts.port,
            database=url_parts.path[1:],  # Remove leading slash
            user=url_parts.username,
            password=url_parts.password
        )
        return conn
    except Exception as e:
        print(f"Error conectando a la base de datos: {e}")
        return None

def importar_ajustes(ruta_archivo):
    """
    Importa ajustes desde un archivo Excel con formato completo
    """
    try:
        print("Conectando a la base de datos...")
        conn = conectar_db()
        if not conn:
            return False
        
        cursor = conn.cursor()
        
        print(f"Leyendo archivo Excel: {ruta_archivo}")
        df = pd.read_excel(ruta_archivo)
        print(f"Datos leídos. Encontradas {len(df)} filas.")
        
        # Mostrar columnas disponibles
        print("Columnas disponibles:", df.columns.tolist())
        
        # Verificar que tenemos las columnas necesarias
        columnas_requeridas = ['Sucursal', 'Comprobante', 'Cód. Artículo', 'Cantidad']
        columnas_opcionales = ['Nro. comprobante', 'Fecha movimiento', 'Tipo de Movimiento', 'Artículo']
        
        for col in columnas_requeridas:
            if col not in df.columns:
                print(f"Error: Columna requerida '{col}' no encontrada")
                return False
        
        print("Procesando datos...")
        registros_insertados = 0
        errores = 0
        
        for index, row in df.iterrows():
            try:
                # Mapear nombre de sucursal
                sucursal_original = str(row['Sucursal']).strip()
                sucursal = SUCURSAL_MAPPING.get(sucursal_original.upper(), sucursal_original)
                
                # Obtener comprobante
                comprobante = str(row.get('Comprobante', row.get('Nro. comprobante', ''))).strip()
                
                # Formatear fecha si existe
                fecha_movimiento = None
                if 'Fecha movimiento' in df.columns:
                    fecha_movimiento = formatear_fecha(row['Fecha movimiento'])
                
                # Obtener otros campos
                tipo_movimiento = str(row.get('Tipo de Movimiento', '')).strip()
                codigo = str(row['Cód. Artículo']).strip()
                articulo = str(row.get('Artículo', '')).strip()
                
                # Procesar cantidad
                cantidad = row['Cantidad']
                if pd.isna(cantidad):
                    cantidad = 0.0
                else:
                    cantidad = float(cantidad)
                
                # Verificar si el registro ya existe
                cursor.execute("""
                    SELECT COUNT(*) FROM ajustes_sucursales 
                    WHERE "Sucursal" = %s AND "Comprobante" = %s AND "Codigo" = %s
                """, (sucursal, comprobante, codigo))
                
                existe = cursor.fetchone()[0] > 0
                
                if existe:
                    print(f"Registro ya existe: {sucursal} - {comprobante} - {codigo}")
                    continue
                
                # Insertar nuevo registro
                cursor.execute("""
                    INSERT INTO ajustes_sucursales 
                    ("Sucursal", "Comprobante", "FechaMovimiento", "TipoMovimiento", "Codigo", "Articulo", "Diferencia")
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (sucursal, comprobante, fecha_movimiento, tipo_movimiento, codigo, articulo, cantidad))
                
                registros_insertados += 1
                
                if registros_insertados % 100 == 0:
                    print(f"Procesados {registros_insertados} registros...")
                    
            except Exception as e:
                errores += 1
                print(f"Error procesando fila {index + 1}: {e}")
                continue
        
        # Confirmar transacción
        conn.commit()
        
        print(f"\n=== RESUMEN DE IMPORTACIÓN ===")
        print(f"✅ Registros insertados: {registros_insertados}")
        print(f"❌ Errores: {errores}")
        print(f"📊 Total procesado: {len(df)} filas")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"Error en la importación: {e}")
        return False

if __name__ == "__main__":
    # Buscar archivo Excel en el directorio actual
    archivos_excel = [f for f in os.listdir('.') if f.endswith(('.xlsx', '.xls'))]
    
    if not archivos_excel:
        print("No se encontraron archivos Excel (.xlsx o .xls) en el directorio actual.")
        print("Por favor coloca tu archivo Excel en este directorio y ejecuta el script nuevamente.")
    else:
        print("Archivos Excel encontrados:")
        for i, archivo in enumerate(archivos_excel):
            print(f"{i + 1}. {archivo}")
        
        if len(archivos_excel) == 1:
            archivo_seleccionado = archivos_excel[0]
            print(f"Usando archivo: {archivo_seleccionado}")
        else:
            try:
                opcion = int(input("Selecciona el número del archivo a importar: ")) - 1
                archivo_seleccionado = archivos_excel[opcion]
            except (ValueError, IndexError):
                print("Selección inválida.")
                exit(1)
        
        success = importar_ajustes(archivo_seleccionado)
        if success:
            print("\n🎉 Importación completada exitosamente!")
        else:
            print("\n❌ La importación falló. Revisa los errores anteriores.")