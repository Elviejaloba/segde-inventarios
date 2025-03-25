import os
# Configurar el puerto mediante variable de entorno
os.environ['STREAMLIT_SERVER_PORT'] = '8504'

import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sqlalchemy import create_engine, text

# Configurar página
st.set_page_config(
    page_title="Seguimiento de muestreo de invierno",
    page_icon="📊",
    layout="wide"
)

# Establecer conexión a la base de datos
@st.cache_resource
def get_db_connection():
    return create_engine(os.getenv('DATABASE_URL'))

# Función para obtener datos de la base de datos
@st.cache_data
def get_data_from_db(query):
    with get_db_connection().connect() as conn:
        return pd.read_sql(query, conn)

# Título y logo
col1, col2 = st.columns([1, 11])
with col1:
    st.image("attached_assets/GRUPO CRISA.jpeg", width=50)
with col2:
    st.title("Seguimiento de muestreo de invierno")

# Menú lateral con estilo más visible
st.sidebar.markdown("## 📋 Menú Principal")
menu_option = st.sidebar.selectbox(
    "",
    ["Ranking de Sucursales", "Reporte x Sucursal"],
    index=0
)

if menu_option == "Ranking de Sucursales":
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

    st.table(ranking_data)

elif menu_option == "Reporte x Sucursal":
    try:
        # Obtener lista de sucursales de la base de datos
        sucursales_df = get_data_from_db("SELECT DISTINCT \"Sucursal\" FROM ajustes_sucursales ORDER BY \"Sucursal\"")

        # Selector de sucursal para el reporte
        sucursal_reporte = st.selectbox(
            "Seleccione la sucursal",
            sucursales_df['Sucursal'].tolist(),
            index=None,
            placeholder="Seleccione una sucursal para ver su reporte..."
        )

        if sucursal_reporte:
            # Obtener datos de la sucursal seleccionada
            query = f"""
            SELECT *
            FROM ajustes_sucursales
            WHERE "Sucursal" = '{sucursal_reporte}'
            """
            df_sucursal = get_data_from_db(query)

            # Métricas principales
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric(
                    "Total Comprobantes",
                    len(df_sucursal),
                    help="Número total de comprobantes para esta sucursal"
                )
            with col2:
                st.metric(
                    "Diferencia Total",
                    f"${df_sucursal['Diferencia'].sum():,.2f}",
                    help="Suma total de diferencias"
                )
            with col3:
                st.metric(
                    "Promedio por Comprobante",
                    f"${df_sucursal['Diferencia'].mean():,.2f}",
                    help="Diferencia promedio por comprobante"
                )

            # Gráfico de códigos con mayor diferencia
            st.subheader("Top 5 Códigos con Mayor Diferencia")
            fig, ax = plt.subplots(figsize=(10, 5))
            top_codigos = df_sucursal.groupby('Codigo')['Diferencia'].sum().sort_values(ascending=False).head(5)
            sns.barplot(x=top_codigos.values, y=top_codigos.index, ax=ax)
            plt.title(f'Mayores Diferencias por Código - {sucursal_reporte}')
            ax.set_xlabel('Diferencia ($)')
            ax.set_ylabel('Código')
            st.pyplot(fig)
            plt.close()

            # Tabla de comprobantes con inconsistencias
            st.subheader("Comprobantes con Inconsistencias")
            umbral = df_sucursal['Diferencia'].std() * 2
            inconsistencias = df_sucursal[abs(df_sucursal['Diferencia']) > umbral]
            if not inconsistencias.empty:
                st.dataframe(
                    inconsistencias[['Comprobante', 'Codigo', 'Diferencia']]
                    .style.format({'Diferencia': '${:,.2f}'})
                )
            else:
                st.info("No se detectaron inconsistencias significativas")

            # Exportar reporte
            st.download_button(
                "📄 Exportar Reporte CSV",
                data=df_sucursal.to_csv(index=False).encode('utf-8'),
                file_name=f"reporte_{sucursal_reporte}.csv",
                mime="text/csv",
                help="Descargar el reporte completo en formato CSV"
            )

    except Exception as e:
        st.error(f"Error al procesar los datos: {str(e)}")