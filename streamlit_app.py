import os
# Configurar el puerto mediante variable de entorno
os.environ['STREAMLIT_SERVER_PORT'] = '8504'

import streamlit as st

# Configurar página
st.set_page_config(
    page_title="Seguimiento de muestreo de invierno",
    page_icon="📊",
    layout="wide"
)

# Título y logo
col1, col2 = st.columns([1, 11])
with col1:
    st.image("attached_assets/GRUPO CRISA.jpeg", width=50)
with col2:
    st.title("Seguimiento de muestreo de invierno")

# Mensaje informativo
st.info("Esta herramienta funciona como un recordatorio y permite hacer un seguimiento del progreso.")
st.caption("La comunicación continuará por correo electrónico con el archivo adjunto correspondiente.")

# Menú lateral
st.sidebar.title("Menú")
opcion = st.sidebar.selectbox(
    "Seleccione una opción:",
    ["Inicio", "Cargar Archivo", "Ver Reporte"]
)

# Lógica del menú
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

elif opcion == "Ver Reporte":
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