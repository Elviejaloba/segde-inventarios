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
            # Obtener datos de la sucursal seleccionada con todas las columnas
            query = f"""
            SELECT "Sucursal", "Comprobante", "FechaMovimiento", "TipoMovimiento", 
                   "Codigo", "Articulo", "Diferencia"
            FROM ajustes_sucursales
            WHERE "Sucursal" = '{sucursal_reporte}'
            ORDER BY "FechaMovimiento" DESC, "Comprobante" DESC
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

            # Mostrar tabla completa de ajustes
            st.subheader("📋 Detalle de Ajustes")
            
            # Formato de columnas para mejor visualización
            column_config = {
                "Sucursal": st.column_config.TextColumn("Sucursal", width="medium"),
                "Comprobante": st.column_config.TextColumn("Comprobante", width="medium"), 
                "FechaMovimiento": st.column_config.TextColumn("Fecha", width="small"),
                "TipoMovimiento": st.column_config.TextColumn("Tipo", width="small"),
                "Codigo": st.column_config.TextColumn("Código Art.", width="medium"),
                "Articulo": st.column_config.TextColumn("Artículo", width="large"),
                "Diferencia": st.column_config.NumberColumn("Cantidad", format="%.2f", width="small")
            }
            
            st.dataframe(
                df_sucursal,
                column_config=column_config,
                use_container_width=True,
                height=400
            )
            
            # Gráfico de códigos con mayor diferencia
            st.subheader("📊 Top 10 Códigos con Mayor Movimiento")
            fig, ax = plt.subplots(figsize=(12, 6))
            top_codigos = df_sucursal.groupby('Codigo')['Diferencia'].sum().abs().sort_values(ascending=False).head(10)
            
            # Color bars based on positive/negative values
            colors = ['#e74c3c' if val < 0 else '#2ecc71' for val in df_sucursal.groupby('Codigo')['Diferencia'].sum()[top_codigos.index]]
            
            bars = ax.barh(range(len(top_codigos)), top_codigos.values, color=colors)
            ax.set_yticks(range(len(top_codigos)))
            ax.set_yticklabels(top_codigos.index)
            ax.set_xlabel('Cantidad Total (Valor Absoluto)')
            ax.set_ylabel('Código de Artículo')
            ax.set_title(f'Top 10 Códigos con Mayor Movimiento - {sucursal_reporte}')
            
            # Add value labels on bars
            for i, bar in enumerate(bars):
                width = bar.get_width()
                ax.text(width + max(top_codigos.values) * 0.01, bar.get_y() + bar.get_height()/2, 
                       f'{width:.1f}', ha='left', va='center', fontsize=9)
            
            plt.tight_layout()
            st.pyplot(fig)
            plt.close()

            # Análisis de movimientos por tipo
            if 'TipoMovimiento' in df_sucursal.columns and df_sucursal['TipoMovimiento'].notna().any():
                st.subheader("📈 Análisis por Tipo de Movimiento")
                col1, col2 = st.columns(2)
                
                with col1:
                    # Gráfico de tipos de movimiento
                    tipo_counts = df_sucursal['TipoMovimiento'].value_counts()
                    fig, ax = plt.subplots(figsize=(8, 6))
                    ax.pie(tipo_counts.values, labels=tipo_counts.index, autopct='%1.1f%%', startangle=90)
                    ax.set_title('Distribución por Tipo de Movimiento')
                    st.pyplot(fig)
                    plt.close()
                
                with col2:
                    # Métricas por tipo
                    st.write("**Resumen por Tipo:**")
                    for tipo in tipo_counts.index:
                        tipo_data = df_sucursal[df_sucursal['TipoMovimiento'] == tipo]
                        total_cantidad = tipo_data['Diferencia'].sum()
                        cantidad_registros = len(tipo_data)
                        st.metric(
                            f"{tipo}",
                            f"{cantidad_registros} registros",
                            f"Total: {total_cantidad:.2f}"
                        )
            
            # Tabla de movimientos significativos
            st.subheader("⚠️ Movimientos Significativos")
            umbral = df_sucursal['Diferencia'].std() * 1.5 if len(df_sucursal) > 1 else 0
            movimientos_grandes = df_sucursal[abs(df_sucursal['Diferencia']) > max(umbral, 10)]
            
            if not movimientos_grandes.empty:
                st.dataframe(
                    movimientos_grandes[['Comprobante', 'FechaMovimiento', 'Codigo', 'Articulo', 'Diferencia']]
                    .sort_values('Diferencia', key=abs, ascending=False),
                    column_config={
                        "Comprobante": "Comprobante",
                        "FechaMovimiento": "Fecha", 
                        "Codigo": "Código",
                        "Articulo": "Artículo",
                        "Diferencia": st.column_config.NumberColumn("Cantidad", format="%.2f")
                    },
                    use_container_width=True
                )
            else:
                st.info("No se detectaron movimientos significativos fuera del rango normal")

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