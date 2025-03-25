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

# Selecciona Sucursal
sucursal = st.selectbox(
    "Selecciona Sucursal",
    ["T.Mza", "T.SJuan", "T.SLuis", "Crisa2", "T.SRafael", "T.SMartin", "T.Maipu", "T.Tunuyan", "T.Lujan"]
)

# Mensaje informativo
st.text("Esta herramienta funciona como un recordatorio y permite hacer un seguimiento del progreso.")
st.text("La comunicación continuará por correo electrónico con el archivo adjunto correspondiente.")

# Título de Ranking
st.header("Ranking de Sucursales")
st.text("Seleccione una sucursal para ver su detalle")

# Crear tabla de ranking
data = {
    "Posición": range(1, 10),
    "Sucursal": ["T.SJuan", "T.SLuis", "T.Maipu", "T.Mendoza", "Crisa2", "T.SRafael", "T.SMartin", "T.Tunuyan", "T.Lujan"],
    "Progreso": ["100%", "100%", "100%", "63%", "27%", "0%", "0%", "0%", "0%"],
    "Sin Stock": ["0 items", "0 items", "0 items", "0 items", "7 items", "0 items", "0 items", "0 items", "0 items"]
}

# Mostrar tabla
st.table(data)