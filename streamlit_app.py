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

# Selector de Sucursal
st.selectbox(
    "Selecciona Sucursal",
    ["T.Mza", "T.SJuan", "T.SLuis", "Crisa2", "T.SRafael", "T.SMartin", "T.Maipu", "T.Tunuyan", "T.Lujan"],
    index=None,
    placeholder="Selecciona una sucursal..."
)

# Mensaje informativo
st.info("Esta herramienta funciona como un recordatorio y permite hacer un seguimiento del progreso.")
st.caption("La comunicación continuará por correo electrónico con el archivo adjunto correspondiente.")

# Título de ranking
st.subheader("Ranking de Sucursales")
st.caption("Seleccione una sucursal para ver su detalle")

# Tabla de ranking simple
data = {
    "Posición": ["1", "2", "3", "4", "5", "6", "7", "8", "9"], #Expanded to match original data size.  Could be improved with dynamic data handling.
    "Sucursal": ["T.SJuan", "T.SLuis", "T.Maipu", "T.Mendoza", "Crisa2", "T.SRafael", "T.SMartin", "T.Tunuyan", "T.Lujan"],
    "Progreso": ["100%", "100%", "100%", "63%", "27%", "0%", "0%", "0%", "0%"],
    "Sin Stock": ["0 items", "0 items", "0 items", "0 items", "7 items", "0 items", "0 items", "0 items", "0 items"]
}

st.table(data)