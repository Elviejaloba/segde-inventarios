import pandas as pd
import os
import sys
import json
import requests
import datetime
from urllib.parse import quote

# Mapeo de sucursales (copiado del archivo store.ts)
SUCURSAL_MAPPING = {
    "LA TIJERA SMARTIN": "T.S.Martin",
    "TIJERITA TREP": "T.Trelew",
    "LA TIJERA TREP": "T.Trelew",
    "TRELEW": "Trelew",
    "LA TIJERA RADA": "T.Rada Tilly",
    "C.RIVADAVIA": "C.Rivadavia",
    "RADA TILLY": "Rada Tilly",
    "SUCURSAL ESQUEL": "Esquel",
    "POSADAS": "Posadas",
    "SUCU. TRELEW": "Trelew",
    "SUCURSAL TREP": "Trelew",
    "SUCURSAL S.MARTIN": "S.Martin",
    "VILLA LA ANGOSTURA": "V.Angostura",
    "SAN MARTIN DE LOS ANDES": "S.Martin"
}

def excel_serial_date_to_js_date(serial):
    """Convierte un número serial de Excel a formato de fecha DD/MM/YYYY"""
    # Excel usa 1900 como año base y tiene un error con el año bisiesto 1900
    excel_start_date = datetime.datetime(1899, 12, 30)
    milliseconds_per_day = 24 * 60 * 60 * 1000
    
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

def importar_a_firebase():
    """Importa datos del archivo Excel a Firebase"""
    try:
        print("Iniciando importación de datos a Firebase...")
        
        # Verificar que el archivo existe
        ruta_archivo = "attached_assets/ajustes sucursales2025_1.xlsx"
        if not os.path.exists(ruta_archivo):
            raise FileNotFoundError(f"No se encuentra el archivo en: {ruta_archivo}")
        
        print(f"Leyendo archivo Excel: {ruta_archivo}")
        df = pd.read_excel(ruta_archivo)
        print(f"Datos leídos. Encontradas {len(df)} filas.")
        
        # Procesamiento más eficiente usando pandas y sin logs excesivos
        print("Procesando datos...")
        
        # Procesar columna fecha
        df['fecha_formateada'] = df['Fecha movimiento'].apply(lambda x: formatear_fecha(x) if pd.notna(x) else '')
        
        # Procesar columna sucursal
        df['sucursal_firebase'] = df['Sucursal'].fillna('').astype(str).str.strip().map(
            lambda x: SUCURSAL_MAPPING.get(x, x))
        
        # Crear lista de ajustes
        ajustes = []
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
            ajustes.append(ajuste)
        
        print(f'Datos transformados: {len(ajustes)} registros válidos')
        if ajustes:
            print(f'Ejemplo de datos transformados: {ajustes[0]}')
        
        # URL de Firebase para los ajustes
        firebase_url = "https://check-d1753-default-rtdb.firebaseio.com/ajustes.json"
        
        # Como solo necesitamos reemplazar todos los datos, enviaremos directamente
        # todos los registros sin procesar en lotes
        print(f'Enviando todos los datos a Firebase: {firebase_url}')
        response = requests.put(firebase_url, data=json.dumps(ajustes))
        
        if response.status_code == 200:
            print('Datos actualizados exitosamente en Firebase')
            return True
        else:
            print(f'Error al actualizar datos: {response.status_code} - {response.text}')
            return False
        
    except Exception as e:
        print(f"Error durante la importación: {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    success = importar_a_firebase()
    sys.exit(0 if success else 1)