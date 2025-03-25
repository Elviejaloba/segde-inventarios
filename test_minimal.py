import os
# Configurar el puerto mediante variable de entorno
os.environ['STREAMLIT_SERVER_PORT'] = '8504'

import streamlit as st

# Configuración básica
st.set_page_config(
    page_title="Test Streamlit",
    page_icon="🔧",
    layout="wide"
)

st.title("Test de Streamlit")

# Menú lateral simple
menu = st.sidebar.selectbox(
    "Seleccione una opción:",
    ["Opción 1", "Opción 2", "Opción 3"]
)

st.write(f"Has seleccionado: {menu}")
