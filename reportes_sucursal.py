import os
os.environ['STREAMLIT_SERVER_PORT'] = '8504'

import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from io import BytesIO

def generar_reporte_sucursal():
    st.title("Reporte por Sucursal")
    
    # Cargar archivo
    uploaded_file = st.file_uploader(
        "Cargar archivo Excel de ajustes",
        type=["xlsx"],
        help="Seleccione el archivo de ajustes por sucursal"
    )
    
    if uploaded_file:
        try:
            df = pd.read_excel(uploaded_file)
            
            # Selector de sucursal
            sucursales = df['Sucursal'].unique()
            sucursal = st.selectbox("Seleccionar Sucursal", sucursales)
            
            if sucursal:
                df_sucursal = df[df['Sucursal'] == sucursal]
                
                # 1. Métricas principales
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric("Total Comprobantes", len(df_sucursal))
                with col2:
                    st.metric("Diferencia Total", f"${df_sucursal['Diferencia'].sum():,.2f}")
                with col3:
                    st.metric("Promedio", f"${df_sucursal['Diferencia'].mean():,.2f}")
                
                # 2. Códigos con mayor diferencia
                st.subheader("Top 5 Códigos con Mayor Diferencia")
                top_codigos = df_sucursal.groupby('Codigo')['Diferencia'].sum().sort_values(ascending=False).head(5)
                
                fig, ax = plt.subplots(figsize=(10, 5))
                sns.barplot(x=top_codigos.values, y=top_codigos.index)
                plt.title(f'Top 5 Códigos por Diferencia - {sucursal}')
                st.pyplot(fig)
                plt.close()
                
                # 3. Listado de inconsistencias
                st.subheader("Comprobantes con Inconsistencias")
                umbral = df_sucursal['Diferencia'].std() * 2
                inconsistencias = df_sucursal[abs(df_sucursal['Diferencia']) > umbral]
                if not inconsistencias.empty:
                    st.dataframe(inconsistencias[['Comprobante', 'Codigo', 'Diferencia']])
                else:
                    st.info("No se detectaron inconsistencias significativas")
                
                # 4. Exportar reporte
                st.subheader("Exportar Reporte")
                col1, col2 = st.columns(2)
                
                # Excel
                with col1:
                    output = BytesIO()
                    with pd.ExcelWriter(output, engine='openpyxl') as writer:
                        df_sucursal.to_excel(writer, index=False, sheet_name='Datos')
                        top_codigos.to_frame().to_excel(writer, sheet_name='Top Codigos')
                        inconsistencias.to_excel(writer, sheet_name='Inconsistencias')
                    
                    st.download_button(
                        "📥 Descargar Excel",
                        data=output.getvalue(),
                        file_name=f"reporte_{sucursal}.xlsx",
                        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    )
                
                # CSV
                with col2:
                    csv = df_sucursal.to_csv(index=False).encode('utf-8')
                    st.download_button(
                        "📄 Descargar CSV",
                        data=csv,
                        file_name=f"reporte_{sucursal}.csv",
                        mime="text/csv"
                    )
                
        except Exception as e:
            st.error(f"Error al procesar el archivo: {str(e)}")

if __name__ == "__main__":
    st.set_page_config(
        page_title="Reporte por Sucursal",
        page_icon="📊",
        layout="wide"
    )
    generar_reporte_sucursal()
