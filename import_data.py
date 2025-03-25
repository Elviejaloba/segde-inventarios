import pandas as pd
from sqlalchemy import create_engine, text
import os
import sys

def importar_datos():
    try:
        print("Iniciando importación de datos...")
        # Verificar que el archivo existe
        ruta_archivo = "attached_assets/ajustes sucursales2025.xlsx"
        if not os.path.exists(ruta_archivo):
            raise FileNotFoundError(f"No se encuentra el archivo en: {ruta_archivo}")

        print("Leyendo archivo Excel...")
        df = pd.read_excel(ruta_archivo)
        print(f"Datos leídos. Encontradas {len(df)} filas.")

        # Conexión a la base de datos
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            raise ValueError("No se encontró DATABASE_URL en las variables de entorno")

        print("Conectando a la base de datos...")
        engine = create_engine(database_url)

        # Limpiar la tabla existente
        with engine.connect() as conn:
            print("Limpiando tabla existente...")
            conn.execute(text("TRUNCATE TABLE ajustes_sucursales RESTART IDENTITY"))
            conn.commit()

        # Importar datos
        print("Importando datos a la base de datos...")
        df.to_sql('ajustes_sucursales', engine, if_exists='append', index=False)

        print("Importación completada exitosamente")

        # Verificar la importación
        with engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM ajustes_sucursales")).fetchone()
            print(f"Total de registros importados: {result[0]}")

        return True

    except Exception as e:
        print(f"Error durante la importación: {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    success = importar_datos()
    sys.exit(0 if success else 1)