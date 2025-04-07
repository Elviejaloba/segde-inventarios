import pandas as pd
import os
import sys
import json
import requests
import datetime
from datetime import datetime
import io
import argparse
import time

# Mapeo de sucursales según store.ts
SUCURSAL_MAPPING = {
    'LA TIJERA SMARTIN': 'T.S.Martin',
    'LA TIJERA LUJAN': 'T.Lujan',
    'LA TIJERA MAIPU': 'T.Maipu',
    'LA TIJERA TUNUYAN': 'T.Tunuyan',
    'LA TIJERA SAN JUAN': 'T.Sjuan',
    'LA TIJERA MENDOZA': 'T.Mendoza',
    'LA TIJERA SAN LUIS': 'T.Luis',
    'CRISA 2': 'Crisa2',
    'LA TIJERA SAN RAFAEL': 'T.Srafael'
}

def excel_serial_date_to_js_date(serial):
    """Convierte un número serial de Excel a formato de fecha DD/MM/YYYY"""
    excel_start_date = datetime(1899, 12, 30)
    
    # Convertir el número serial a fecha
    delta = datetime.timedelta(days=serial)
    date = excel_start_date + delta
    
    # Formatear como DD/MM/YYYY
    return date.strftime("%d/%m/%Y")

def formatear_fecha(fecha_str):
    """Formatea la fecha según el formato necesario"""
    try:
        # Si es un número, tratar como número serial de Excel
        if isinstance(fecha_str, (int, float)) or (isinstance(fecha_str, str) and fecha_str.isdigit()):
            serial = float(fecha_str)
            fecha_formateada = excel_serial_date_to_js_date(serial)
            return fecha_formateada
        
        # Si ya está en formato DD/MM/YYYY, devolverlo tal cual
        if isinstance(fecha_str, str) and len(fecha_str.split('/')) == 3:
            return fecha_str
        
        # Manejar formato de datetime de pandas
        if isinstance(fecha_str, pd._libs.tslibs.timestamps.Timestamp) or (
            isinstance(fecha_str, str) and ('-' in fecha_str or ' 00:00:00' in fecha_str)):
            # Convertir a timestamp si es string
            if isinstance(fecha_str, str):
                fecha_str = pd.Timestamp(fecha_str)
            
            # Formatear como DD/MM/YYYY
            return fecha_str.strftime('%d/%m/%Y')
        
        return str(fecha_str)
    except Exception as e:
        print(f'Error al formatear fecha: {fecha_str}, {str(e)}')
        return str(fecha_str)

def actualizar_datos(archivo_nuevo=None, reemplazar=False):
    """
    Actualiza los datos en Firebase
    
    Parámetros:
    - archivo_nuevo (str): Ruta al archivo Excel con nuevos datos
    - reemplazar (bool): Si es True, reemplaza todos los datos; si es False, combina con datos existentes
    """
    try:
        print("Iniciando actualización de datos...")
        
        # URL de Firebase para los ajustes
        firebase_url = "https://check-d1753-default-rtdb.firebaseio.com/ajustes.json"
        
        # Si queremos combinar con datos existentes, primero obtenemos los datos actuales
        datos_existentes = []
        if not reemplazar:
            print("Obteniendo datos existentes...")
            response = requests.get(firebase_url)
            if response.status_code == 200 and response.json():
                datos_existentes = response.json()
                print(f"Se obtuvieron {len(datos_existentes)} registros existentes")
            else:
                print("No se encontraron datos existentes o hubo un error al obtenerlos")
        
        if archivo_nuevo:
            # Verificar que el archivo existe
            if not os.path.exists(archivo_nuevo):
                raise FileNotFoundError(f"No se encuentra el archivo en: {archivo_nuevo}")
            
            print(f"Leyendo archivo Excel: {archivo_nuevo}")
            df = pd.read_excel(archivo_nuevo)
            print(f"Datos leídos. Encontradas {len(df)} filas.")
            
            # Procesar columna fecha
            df['fecha_formateada'] = df['Fecha movimiento'].apply(lambda x: formatear_fecha(x) if pd.notna(x) else '')
            
            # Procesar columna sucursal
            df['sucursal_firebase'] = df['Sucursal'].fillna('').astype(str).str.strip().map(
                lambda x: SUCURSAL_MAPPING.get(x, x))
            
            # Crear lista de ajustes nuevos
            ajustes_nuevos = []
            for _, row in df.iterrows():
                # Manejar valores NaN
                nro_comprobante = row.get('Nro. comprobante')
                nro_comprobante = 0 if pd.isna(nro_comprobante) else int(nro_comprobante)
                
                cantidad = row.get('Cantidad')
                cantidad = 0.0 if pd.isna(cantidad) else float(cantidad)
                
                ajuste = {
                    "nroComprobante": nro_comprobante,
                    "fechaMovimiento": row['fecha_formateada'],
                    "tipoMovimiento": str(row.get('Tipo de Movimiento', '')),
                    "codArticulo": str(row.get('Cód. Artículo', '')),
                    "articulo": str(row.get('Artículo', '')),
                    "sucursal": row['sucursal_firebase'],
                    "cantidad": cantidad
                }
                ajustes_nuevos.append(ajuste)
            
            print(f'Datos transformados: {len(ajustes_nuevos)} registros nuevos')
            
            # Si hay datos existentes y no queremos reemplazar, combinar datos
            ajustes_combinados = []
            if datos_existentes and not reemplazar:
                print("Combinando datos existentes con nuevos datos...")
                
                # Crear un índice para búsqueda rápida
                registros_existentes = {}
                for ajuste in datos_existentes:
                    # Crear una clave única para cada registro
                    key = (
                        ajuste.get('nroComprobante', 0),
                        ajuste.get('fechaMovimiento', ''),
                        ajuste.get('codArticulo', ''),
                        ajuste.get('sucursal', '')
                    )
                    registros_existentes[key] = ajuste
                
                # Actualizar con registros nuevos
                registros_nuevos_count = 0
                for ajuste in ajustes_nuevos:
                    key = (
                        ajuste.get('nroComprobante', 0),
                        ajuste.get('fechaMovimiento', ''),
                        ajuste.get('codArticulo', ''),
                        ajuste.get('sucursal', '')
                    )
                    if key not in registros_existentes:
                        registros_existentes[key] = ajuste
                        registros_nuevos_count += 1
                
                # Convertir el diccionario combinado de nuevo a lista
                ajustes_combinados = list(registros_existentes.values())
                print(f"Se agregaron {registros_nuevos_count} registros nuevos. Total: {len(ajustes_combinados)}")
            else:
                # Si no hay datos existentes o queremos reemplazar, usar solo los nuevos
                ajustes_combinados = ajustes_nuevos
                print(f"Usando {len(ajustes_combinados)} registros para actualizar Firebase")
            
            # Ordenar por fecha y comprobante
            def parse_fecha(fecha_str):
                try:
                    return datetime.strptime(fecha_str, '%d/%m/%Y')
                except:
                    return datetime(1900, 1, 1)
            
            ajustes_combinados.sort(
                key=lambda x: (
                    parse_fecha(x.get('fechaMovimiento', '')),
                    x.get('nroComprobante', 0)
                )
            )
            
            # Enviar datos a Firebase
            print(f'Enviando {len(ajustes_combinados)} datos a Firebase: {firebase_url}')
            response = requests.put(firebase_url, data=json.dumps(ajustes_combinados))
            
            if response.status_code == 200:
                print('Datos actualizados exitosamente en Firebase')
                
                # Analizar rango de fechas
                fechas = [ajuste.get('fechaMovimiento', '') for ajuste in ajustes_combinados]
                fechas_validas = [f for f in fechas if f]
                if fechas_validas:
                    # Ordenar fechas
                    fechas_dt = [datetime.strptime(f, '%d/%m/%Y') for f in fechas_validas]
                    fecha_min = min(fechas_dt).strftime('%d/%m/%Y')
                    fecha_max = max(fechas_dt).strftime('%d/%m/%Y')
                    print(f"Rango de fechas disponible: {fecha_min} - {fecha_max}")
                
                return True
            else:
                print(f'Error al actualizar datos: {response.status_code} - {response.text}')
                return False
        
        else:
            print("No se especificó un archivo nuevo. Usando solo datos existentes.")
            if datos_existentes:
                print(f"Datos existentes: {len(datos_existentes)} registros")
                
                # Analizar rango de fechas
                fechas = [ajuste.get('fechaMovimiento', '') for ajuste in datos_existentes]
                fechas_validas = [f for f in fechas if f]
                if fechas_validas:
                    # Ordenar fechas
                    fechas_dt = [datetime.strptime(f, '%d/%m/%Y') for f in fechas_validas]
                    fecha_min = min(fechas_dt).strftime('%d/%m/%Y')
                    fecha_max = max(fechas_dt).strftime('%d/%m/%Y')
                    print(f"Rango de fechas disponible: {fecha_min} - {fecha_max}")
                
                return True
            else:
                print("No hay datos para mostrar")
                return False
            
    except Exception as e:
        print(f"Error durante la importación: {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Actualizar datos de ajustes en Firebase')
    parser.add_argument('--archivo', type=str, help='Ruta al archivo Excel con nuevos datos')
    parser.add_argument('--reemplazar', action='store_true', help='Si se especifica, reemplaza todos los datos en lugar de combinarlos')
    
    args = parser.parse_args()
    
    if not args.archivo and not args.reemplazar:
        print("Mostrando información de datos existentes:")
        actualizar_datos()
    else:
        success = actualizar_datos(args.archivo, args.reemplazar)
        sys.exit(0 if success else 1)