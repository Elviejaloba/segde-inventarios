import requests
import json
from datetime import datetime

def obtener_ultimos_ajustes():
    firebase_url = "https://check-d1753-default-rtdb.firebaseio.com/ajustes.json"
    
    try:
        response = requests.get(firebase_url)
        
        if response.status_code == 200:
            data = response.json()
            
            if not data or not isinstance(data, list):
                print("No hay datos o los datos no están en el formato esperado")
                return
            
            # Ordenar registros por fecha de movimiento
            # Primero convertimos las fechas en objetos datetime para ordenar correctamente
            for item in data:
                try:
                    if 'fechaMovimiento' in item:
                        date_parts = item['fechaMovimiento'].split('/')
                        if len(date_parts) == 3:
                            day, month, year = map(int, date_parts)
                            item['fecha_obj'] = datetime(year, month, day)
                except Exception as e:
                    print(f"Error procesando fecha: {item.get('fechaMovimiento', 'No fecha')}: {str(e)}")
            
            # Ordenar por fecha
            sorted_data = sorted(data, key=lambda x: x.get('fecha_obj', datetime(1900, 1, 1)), reverse=True)
            
            # Extraer últimos 10 registros
            ultimos_10 = sorted_data[:10]
            
            # Mostrar fechas únicas de los últimos 30 días
            fechas_unicas = set()
            for item in sorted_data[:100]:  # Tomamos los últimos 100 registros para identificar fechas únicas
                if 'fechaMovimiento' in item:
                    fechas_unicas.add(item['fechaMovimiento'])
            
            print("Últimas fechas disponibles:")
            for fecha in sorted(list(fechas_unicas), reverse=True)[:10]:
                print(f"- {fecha}")
            
            print("\nÚltimos 10 registros:")
            for i, item in enumerate(ultimos_10, 1):
                print(f"{i}. Fecha: {item.get('fechaMovimiento', 'N/A')}, Sucursal: {item.get('sucursal', 'N/A')}, Comprobante: {item.get('nroComprobante', 'N/A')}")
        else:
            print(f"Error al obtener datos: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    obtener_ultimos_ajustes()