import sqlite3
import os

# Intentar encontrar la base de datos de Tango o el log del bridge
# Como no tengo acceso directo al SQL Server, busco en los archivos que el bridge genera localmente si existen
print("Buscando rastros de la importacion original...")

# Si hay algun archivo .csv o .xlsx temporal en C:\BridgeSync (simulado aqui en el entorno)
os.system("ls -la scripts_windows/")

# Consultar la base de datos local para ver si el campo UnidadMedida vino vacio o con algo de Tango
import psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
cur.execute("SELECT \"Codigo\", \"Articulo\", \"UnidadMedida\", \"Comprobante\" FROM ajustes_sucursales WHERE \"Codigo\" LIKE 'TI505%' LIMIT 1;")
row = cur.fetchone()
print(f"Dato actual en DB: {row}")
conn.close()
