import os
# Configurar el puerto mediante variable de entorno
os.environ['STREAMLIT_SERVER_PORT'] = '8504'

import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from io import BytesIO

# Configurar página
st.set_page_config(
    page_title="Sistema de Reportes",
    page_icon="📊",
    layout="wide"
)

# Crear menú lateral
st.sidebar.title("Menú")
opcion = st.sidebar.selectbox(
    "Seleccione una opción:",
    ["Inicio", "Cargar Archivo", "Ver Reporte"]
)

# Título principal
st.title("Sistema de Reportes")

# Lógica básica del menú
if opcion == "Inicio":
    st.write("Bienvenido al Sistema de Reportes")
    st.write("Seleccione una opción del menú lateral para comenzar")

elif opcion == "Cargar Archivo":
    st.subheader("Cargar archivo Excel")

    # Widget para cargar archivo
    file = st.file_uploader(
        "Seleccione un archivo Excel",
        type=["xlsx"],
        help="El archivo debe contener las columnas: Sucursal, Comprobante, Codigo, Diferencia"
    )

    if file:
        try:
            # Cargar datos
            df = pd.read_excel(file)

            # Mostrar preview
            st.success("✅ Archivo cargado correctamente")
            st.write("Vista previa de los datos:")
            st.dataframe(df.head())

            # Guardar en session state
            st.session_state['datos'] = df

        except Exception as e:
            st.error(f"Error al cargar el archivo: {str(e)}")

elif opcion == "Ver Reporte":
    if 'datos' not in st.session_state:
        st.warning("⚠️ Primero debe cargar un archivo")
    else:
        df = st.session_state['datos']

        # Submenú para Resultados
        sub_opcion = st.sidebar.radio(
            "Tipo de Resultado:",
            ["Por Sucursal", "Por Código", "Consolidado"]
        )

        # Mostrar contenido según la sub-opción seleccionada
        if sub_opcion == "Por Sucursal":
            st.header("Resultados por Sucursal")
            st.write("Aquí se mostrarán los resultados por sucursal")

        elif sub_opcion == "Por Código":
            st.header("Resultados por Código")
            st.write("Aquí se mostrarán los resultados por código")

        elif sub_opcion == "Consolidado":
            st.header("Resultados Consolidados")
            st.write("Aquí se mostrarán los resultados consolidados")