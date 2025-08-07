#!/usr/bin/env python3
"""
Script optimizado para importar ajustes rápidamente usando COPY bulk insert
"""

import pandas as pd
import psycopg2
from datetime import datetime
import os
from urllib.parse import urlparse
import io

SUCURSAL_MAPPING = {
    'CRISA 2': 'Crisa2',
    'CRISA2': 'Crisa2', 
    'LA TIJERA SAN LUIS': 'T.Luis',
    'T.LUIS': 'T.Luis',
    'LA TIJERA LUJAN': 'T.Lujan',
    'T.LUJAN': 'T.Lujan',
    'LA TIJERA SAN MARTIN': 'T.S.Martin',
    'T.S.MARTIN': 'T.S.Martin',
    'LA TIJERA SMARTIN': 'T.S.Martin',
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
    try:
        if pd.isna(fecha_excel):
            return None
        
        if isinstance(fecha_excel, (int, float)):
            fecha = datetime(1900, 1, 1) + pd.Timedelta(days=fecha_excel - 2)
            return fecha.strftime('%Y-%m-%d')
        
        if isinstance(fecha_excel, datetime):
            return fecha_excel.strftime('%Y-%m-%d')
        
        if isinstance(fecha_excel, str):
            formatos = ['%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y', '%m/%d/%Y']
            for formato in formatos:
                try:
                    fecha = datetime.strptime(fecha_excel, formato)
                    return fecha.strftime('%Y-%m-%d')
                except ValueError:
                    continue
        
        return None
    except Exception:
        return None

def conectar_db():
    try:
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            raise ValueError("DATABASE_URL no encontrada")
        
        url_parts = urlparse(database_url)
        conn = psycopg2.connect(
            host=url_parts.hostname,
            port=url_parts.port,
            database=url_parts.path[1:],
            user=url_parts.username,
            password=url_parts.password
        )
        return conn
    except Exception as e:
        print(f"Error conectando: {e}")
        return None

def importar_bulk():
    try:
        conn = conectar_db()
        if not conn:
            return False
        
        cursor = conn.cursor()
        
        # Leer datos
        df = pd.read_excel('ajustes.xlsx')
        print(f"Datos leídos: {len(df)} filas")
        
        # Procesar datos en memoria
        datos_procesados = []
        
        for index, row in df.iterrows():
            try:
                sucursal_original = str(row['Sucursal']).strip()
                sucursal = SUCURSAL_MAPPING.get(sucursal_original.upper(), sucursal_original)
                
                comprobante = str(row.get('Comprobante', row.get('Nro. comprobante', ''))).strip()
                
                fecha_movimiento = formatear_fecha(row['Fecha movimiento'])
                
                tipo_movimiento = str(row.get('Tipo de Movimiento', '')).strip()
                codigo = str(row['Cód. Artículo']).strip()
                articulo = str(row.get('Artículo', '')).strip()
                
                cantidad = row['Cantidad']
                if pd.isna(cantidad):
                    cantidad = 0.0
                else:
                    cantidad = float(cantidad)
                
                datos_procesados.append((
                    sucursal, comprobante, fecha_movimiento, 
                    tipo_movimiento, codigo, articulo, cantidad
                ))
                
                if len(datos_procesados) % 1000 == 0:
                    print(f"Procesados {len(datos_procesados)} registros...")
                    
            except Exception as e:
                print(f"Error en fila {index}: {e}")
                continue
        
        print(f"Datos preparados: {len(datos_procesados)} registros")
        
        # Usar COPY para insertar masivamente
        datos_csv = io.StringIO()
        for dato in datos_procesados:
            linea = '\t'.join([str(d) if d is not None else '\\N' for d in dato]) + '\n'
            datos_csv.write(linea)
        
        datos_csv.seek(0)
        
        cursor.copy_from(
            datos_csv, 
            'ajustes_sucursales',
            columns=('Sucursal', 'Comprobante', 'FechaMovimiento', 'TipoMovimiento', 'Codigo', 'Articulo', 'Diferencia'),
            sep='\t',
            null='\\N'
        )
        
        conn.commit()
        
        # Obtener estadísticas finales
        cursor.execute("SELECT COUNT(*) FROM ajustes_sucursales")
        total = cursor.fetchone()[0]
        
        cursor.execute("SELECT \"Sucursal\", COUNT(*) FROM ajustes_sucursales GROUP BY \"Sucursal\" ORDER BY COUNT(*) DESC")
        stats = cursor.fetchall()
        
        print(f"\n=== IMPORTACIÓN COMPLETADA ===")
        print(f"✅ Total registros en BD: {total}")
        print(f"✅ Registros insertados: {len(datos_procesados)}")
        print("\n📊 Registros por sucursal:")
        for sucursal, count in stats:
            print(f"  {sucursal}: {count}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    success = importar_bulk()
    if success:
        print("\n🎉 Importación exitosa! Los datos están listos en los reportes.")
    else:
        print("\n❌ La importación falló.")