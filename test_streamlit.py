import streamlit as st

st.set_page_config(
    page_title="Test Streamlit",
    page_icon="🚀",
    layout="centered"
)

st.title("Test Básico de Streamlit")

# Menú lateral con submenú
st.sidebar.title("Menú Principal")

# Opción principal del menú
opcion_principal = st.sidebar.selectbox(
    "Seleccione una sección:",
    ["Inicio", "Resultados"]
)

# Si selecciona Resultados, mostrar submenú
if opcion_principal == "Resultados":
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

else:
    st.write("Bienvenido al sistema de reportes")
    st.write("Seleccione una opción del menú lateral para comenzar")