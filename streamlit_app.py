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

# Título principal con estilo personalizado
st.markdown("""
    <h1 style='text-align: left; font-size: 24px; padding: 10px;'>
        Seguimiento de muestreo de invierno
    </h1>
""", unsafe_allow_html=True)

# Selector de Sucursal con estilo
with st.container():
    sucursal = st.selectbox(
        "Selecciona Sucursal",
        ["T.Mza", "T.SJuan", "T.SLuis", "Crisa2", "T.SRafael", "T.SMartin", "T.Maipu", "T.Tunuyan", "T.Lujan"],
        index=None,
        placeholder="Selecciona una sucursal..."
    )

# Mensaje informativo en un contenedor con estilo
with st.container():
    st.markdown("""
        <div style='background-color: rgba(242, 242, 242, 0.5); padding: 15px; border-radius: 5px; margin: 10px 0;'>
            <p>Esta herramienta funciona como un recordatorio y permite hacer un seguimiento del progreso.</p>
            <p style='color: gray;'>La comunicación continuará por correo electrónico con el archivo adjunto correspondiente.</p>
        </div>
    """, unsafe_allow_html=True)

# Título de Ranking con ícono
st.markdown("""
    <div style='display: flex; align-items: center; margin-top: 20px;'>
        <h2 style='font-size: 20px; margin: 0;'>📊 Ranking de Sucursales</h2>
    </div>
    <p style='color: gray; font-size: 14px; margin-top: 5px;'>Seleccione una sucursal para ver su detalle</p>
""", unsafe_allow_html=True)

# Datos de la tabla
data = {
    "Posición": list(range(1, 10)),
    "Sucursal": ["T.SJuan", "T.SLuis", "T.Maipu", "T.Mendoza", "Crisa2", "T.SRafael", "T.SMartin", "T.Tunuyan", "T.Lujan"],
    "Progreso": ["100%", "100%", "100%", "63%", "27%", "0%", "0%", "0%", "0%"],
    "Sin Stock": ["0 items", "0 items", "0 items", "0 items", "7 items", "0 items", "0 items", "0 items", "0 items"]
}

# Mostrar tabla con estilo personalizado
st.markdown("""
    <style>
        .stTable td, .stTable th {
            text-align: left !important;
            padding: 10px !important;
        }
        .stTable th {
            background-color: #f0f2f6 !important;
        }
    </style>
""", unsafe_allow_html=True)

st.table(data)