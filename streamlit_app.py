import streamlit as st

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
    ["Inicio", "Resultados"]
)

# Título principal
st.title("Sistema de Reportes")

# Lógica básica del menú
if opcion == "Inicio":
    st.write("Bienvenido al Sistema de Reportes")
    st.write("Seleccione una opción del menú lateral para comenzar")

elif opcion == "Resultados":
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