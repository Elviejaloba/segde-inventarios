import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from io import BytesIO

# Configurar Streamlit para usar el puerto 8502
st.set_page_config(
    page_title="Reporte Final Consolidado",
    page_icon="🏢",
    layout="wide"
)

def load_excel_file(uploaded_file):
    try:
        df = pd.read_excel(uploaded_file)

        # Validar columnas requeridas
        required_columns = ['Sucursal', 'Comprobante', 'Codigo', 'Diferencia']
        missing_columns = [col for col in required_columns if col not in df.columns]

        if missing_columns:
            st.error(f"Faltan las siguientes columnas en el archivo: {', '.join(missing_columns)}")
            return None

        return df
    except Exception as e:
        st.error(f"Error al cargar el archivo: {str(e)}")
        return None

def generate_consolidated_report(df):
    if df is not None:
        # Métricas generales
        st.subheader("📊 Resumen General")
        col1, col2, col3 = st.columns(3)

        with col1:
            total_comprobantes = len(df)
            st.metric("Total de Comprobantes", total_comprobantes)

        with col2:
            total_sucursales = df['Sucursal'].nunique()
            st.metric("Total de Sucursales", total_sucursales)

        with col3:
            promedio_diferencias = df['Diferencia'].abs().mean() if 'Diferencia' in df.columns else 0
            st.metric("Promedio de Diferencias", f"{promedio_diferencias:.2f}")

        # Análisis por sucursal
        st.subheader("📈 Análisis por Sucursal")

        # Gráfico de comprobantes por sucursal
        fig, ax = plt.subplots(figsize=(10, 6))
        sucursal_counts = df['Sucursal'].value_counts()
        sns.barplot(x=sucursal_counts.values, y=sucursal_counts.index)
        plt.title('Comprobantes por Sucursal')
        plt.xlabel('Cantidad de Comprobantes')
        st.pyplot(fig)
        plt.close()

        # Tabla detallada por sucursal
        st.subheader("📋 Detalles por Sucursal")
        sucursales = df['Sucursal'].unique()

        for sucursal in sucursales:
            with st.expander(f"Sucursal: {sucursal}"):
                df_sucursal = df[df['Sucursal'] == sucursal]

                col1, col2 = st.columns(2)
                with col1:
                    st.write(f"Total de comprobantes: {len(df_sucursal)}")
                    if 'Diferencia' in df_sucursal.columns:
                        st.write(f"Diferencia promedio: {df_sucursal['Diferencia'].abs().mean():.2f}")

                # Top códigos con mayor diferencia
                if 'Codigo' in df_sucursal.columns and 'Diferencia' in df_sucursal.columns:
                    st.write("Top 5 códigos con mayor diferencia:")
                    top_diferencias = df_sucursal.groupby('Codigo')['Diferencia'].abs().mean().sort_values(ascending=False).head()
                    st.bar_chart(top_diferencias)

                # Mostrar datos de la sucursal
                st.dataframe(df_sucursal)

        # Opción para exportar
        if st.button("📥 Exportar Reporte"):
            # Crear un buffer en memoria para el Excel
            output = BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                # Hoja principal con todos los datos
                df.to_excel(writer, sheet_name='Datos Completos', index=False)

                # Hoja de resumen por sucursal
                resumen_sucursal = df.groupby('Sucursal').agg({
                    'Comprobante': 'count',
                    'Diferencia': ['mean', 'sum'] if 'Diferencia' in df.columns else 'count'
                }).round(2)
                resumen_sucursal.to_excel(writer, sheet_name='Resumen por Sucursal')

            # Configurar el botón de descarga
            output.seek(0)
            st.download_button(
                label="Descargar Excel",
                data=output,
                file_name="reporte_consolidado.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )

def main():
    st.title("🏢 Reporte Final Consolidado")
    st.write("Cargue el archivo Excel (.xlsx) con los datos de ajustes por sucursal")

    uploaded_file = st.file_uploader("Cargar archivo Excel", type=['xlsx'])

    if uploaded_file is not None:
        df = load_excel_file(uploaded_file)
        if df is not None:
            generate_consolidated_report(df)

            # Mostrar datos crudos si se desea
            if st.checkbox("Mostrar datos crudos"):
                st.dataframe(df)

if __name__ == "__main__":
    main()