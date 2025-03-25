import os
# Configurar el puerto mediante variable de entorno
os.environ['STREAMLIT_SERVER_PORT'] = '8504'

import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from io import BytesIO

# Configuración de la página
st.set_page_config(
    page_title="Reporte Consolidado",
    page_icon="📊",
    layout="wide"
)

# Menú lateral
with st.sidebar:
    st.title("📊 Menú Principal")
    opcion = st.radio(
        "Seleccione una opción:",
        ["Cargar Datos", "Ver Reporte"]
    )

# Título principal
st.title("Sistema de Reportes")
st.write("Análisis de ajustes por sucursal")


def load_file(uploaded_file):
    """Carga y procesa archivos Excel"""
    try:
        st.info("Procesando archivo Excel")
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


def generate_reporte_consolidado(df):
    """Genera el reporte consolidado final"""
    st.markdown("### 📊 Análisis Consolidado")

    # Métricas principales
    with st.container():
        col1, col2, col3 = st.columns(3)
        with col1:
            total_comprobantes = len(df)
            st.metric(
                "Total de Comprobantes",
                f"{total_comprobantes:,}",
                help="Número total de comprobantes procesados"
            )
        with col2:
            total_diferencia = df['Diferencia'].abs().sum()
            st.metric(
                "Total de Diferencias",
                f"{total_diferencia:,.2f}",
                help="Suma total de diferencias en valor absoluto"
            )
        with col3:
            promedio_diferencia = df['Diferencia'].abs().mean()
            st.metric(
                "Promedio de Diferencias",
                f"{promedio_diferencia:.2f}",
                help="Promedio de diferencias por comprobante"
            )

    # Análisis por sucursal
    st.markdown("### 📈 Análisis por Sucursal")

    # Gráfico de comprobantes por sucursal
    col1, col2 = st.columns(2)
    with col1:
        fig, ax = plt.subplots(figsize=(8, 6))
        sucursal_counts = df['Sucursal'].value_counts()
        sns.barplot(x=sucursal_counts.values, y=sucursal_counts.index, orient='h')
        plt.title('Comprobantes por Sucursal')
        plt.xlabel('Cantidad de Comprobantes')
        plt.tight_layout()
        st.pyplot(fig)
        plt.close()

    # Gráfico de diferencias por sucursal
    with col2:
        fig, ax = plt.subplots(figsize=(8, 6))
        sucursal_diffs = df.groupby('Sucursal')['Diferencia'].sum()
        sns.barplot(x=sucursal_diffs.values, y=sucursal_diffs.index, orient='h')
        plt.title('Total de Diferencias por Sucursal')
        plt.xlabel('Suma de Diferencias')
        plt.tight_layout()
        st.pyplot(fig)
        plt.close()

    # Análisis de códigos
    st.markdown("### 📊 Análisis de Códigos")

    # Top 10 códigos con mayores diferencias
    top_codigos = df.groupby('Codigo')['Diferencia'].agg(['count', 'mean', 'sum']).sort_values('sum', ascending=False).head(10)
    top_codigos.columns = ['Cantidad', 'Promedio', 'Total']
    st.dataframe(
        top_codigos.style.format({
            'Cantidad': '{:,.0f}',
            'Promedio': '{:,.2f}',
            'Total': '{:,.2f}'
        }),
        use_container_width=True
    )

    # Detección de inconsistencias
    st.markdown("### ⚠️ Detección de Inconsistencias")
    umbral = df['Diferencia'].abs().mean() + df['Diferencia'].abs().std()
    inconsistencias = df[df['Diferencia'].abs() > umbral].sort_values('Diferencia', ascending=False)

    if not inconsistencias.empty:
        st.warning(f"Se detectaron {len(inconsistencias)} comprobantes con diferencias significativas")
        st.dataframe(
            inconsistencias,
            use_container_width=True,
            hide_index=True
        )
    else:
        st.success("No se detectaron inconsistencias significativas")

    # Exportación de datos
    st.markdown("### 📥 Exportar Reporte")
    col1, col2 = st.columns(2)

    with col1:
        # Excel
        output_excel = BytesIO()
        with pd.ExcelWriter(output_excel, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Datos Completos', index=False)
            top_codigos.to_excel(writer, sheet_name='Top Códigos')
            inconsistencias.to_excel(writer, sheet_name='Inconsistencias', index=False)

        st.download_button(
            "📥 Descargar Excel",
            data=output_excel.getvalue(),
            file_name="reporte_consolidado.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            use_container_width=True
        )

    with col2:
        # CSV
        output_csv = BytesIO()
        df.to_csv(output_csv, index=False)
        st.download_button(
            "📄 Descargar CSV",
            data=output_csv.getvalue(),
            file_name="reporte_consolidado.csv",
            mime="text/csv",
            use_container_width=True
        )



# Funcionalidad principal
if opcion == "Cargar Datos":
    st.header("📁 Carga de Datos")
    archivo = st.file_uploader(
        "Seleccione el archivo Excel",
        type=["xlsx"],
        help="El archivo debe contener las columnas: Sucursal, Comprobante, Codigo, Diferencia"
    )

    if archivo:
        try:
            df = load_file(archivo)
            if df is not None:
                st.session_state['datos'] = df
                st.success("✅ Archivo cargado correctamente")
                st.dataframe(df.head())
        except Exception as e:
            st.error(f"Error al cargar el archivo: {str(e)}")

elif opcion == "Ver Reporte":
    if 'datos' not in st.session_state:
        st.warning("⚠️ Primero debe cargar un archivo de datos")
    else:
        df = st.session_state['datos']
        generate_reporte_consolidado(df)

if __name__ == "__main__":
    pass