import streamlit as st

# Configuración básica
st.set_page_config(
    page_title="Test",
    page_icon="📊",
    layout="wide"
)

# Menú lateral simple
st.sidebar.title("Menú de prueba")
opcion = st.sidebar.selectbox("Seleccione:", ["Opción 1", "Opción 2"])

# Contenido principal
st.title("Prueba Streamlit")

if opcion == "Opción 1":
    st.write("Has seleccionado la Opción 1")
else:
    st.write("Has seleccionado la Opción 2")