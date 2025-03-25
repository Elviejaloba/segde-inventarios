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
sucursal = st.selectbox(
    "Selecciona Sucursal",
    ["T.Mza", "T.SJuan", "T.SLuis", "Crisa2", "T.SRafael", "T.SMartin", "T.Maipu", "T.Tunuyan", "T.Lujan"],
    index=None,
    placeholder="Selecciona una sucursal..."
)

# Mensaje informativo en un recuadro gris claro
st.info("Esta herramienta funciona como un recordatorio y permite hacer un seguimiento del progreso.")
st.caption("La comunicación continuará por correo electrónico con el archivo adjunto correspondiente.")

# Título de Ranking
st.markdown("### 📊 Ranking de Sucursales")
st.caption("Seleccione una sucursal para ver su detalle")

# Crear tabla de ranking con estilo
ranking_data = {
    "Posición": ["🏆", "🥈", "🥉", "4", "5"],
    "Sucursal": ["T.SJuan", "T.SLuis", "T.Maipu", "T.Mendoza", "Crisa2"],
    "Progreso": ["100%", "100%", "100%", "63%", "27%"],
    "Sin Stock": ["0 items", "0 items", "0 items", "0 items", "7 items"]
}

st.markdown("""
<style>
    .dataframe {
        font-size: 14px !important;
    }
    .dataframe td {
        text-align: left !important;
        padding: 8px !important;
    }
    .dataframe th {
        text-align: left !important;
        padding: 8px !important;
        background-color: #f8f9fa !important;
    }
</style>
""", unsafe_allow_html=True)

st.table(ranking_data)