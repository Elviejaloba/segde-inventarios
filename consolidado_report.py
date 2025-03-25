import os
# Configurar el puerto mediante variable de entorno
os.environ['STREAMLIT_SERVER_PORT'] = '8504'

import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from io import BytesIO
import docx
import re

def parse_txt_file(file):
    """Parsea un archivo .txt y extrae los datos en formato estructurado"""
    try:
        content = file.getvalue().decode('utf-8')
        pattern = r'Sucursal:\s*(\w+)\s*Comprobante:\s*(\w+)\s*Codigo:\s*(\w+)\s*Diferencia:\s*(-?\d+\.?\d*)'
        matches = re.findall(pattern, content)

        if not matches:
            st.error("No se encontraron datos en el formato esperado en el archivo .txt")
            return None

        data = {
            'Sucursal': [m[0] for m in matches],
            'Comprobante': [m[1] for m in matches],
            'Codigo': [m[2] for m in matches],
            'Diferencia': [float(m[3]) for m in matches]
        }
        return pd.DataFrame(data)
    except Exception as e:
        st.error(f"Error al procesar el archivo .txt: {str(e)}")
        return None

def parse_docx_file(file):
    """Parsea un archivo .docx y extrae los datos en formato estructurado"""
    try:
        doc = docx.Document(BytesIO(file.getvalue()))
        data = []
        current_record = {}

        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                if current_record and len(current_record) == 4:  # Asegurar que tenga todos los campos
                    data.append(current_record)
                current_record = {}
                continue

            # Buscar campos clave
            if ':' in text:
                key, value = text.split(':', 1)
                key = key.strip()
                value = value.strip()

                if key == 'Sucursal':
                    current_record['Sucursal'] = value
                elif key == 'Comprobante':
                    current_record['Comprobante'] = value
                elif key == 'Codigo':
                    current_record['Codigo'] = value
                elif key == 'Diferencia':
                    try:
                        current_record['Diferencia'] = float(value)
                    except ValueError:
                        current_record['Diferencia'] = 0.0

        if current_record and len(current_record) == 4:  # Agregar el último registro si está completo
            data.append(current_record)

        if not data:
            st.error("No se encontraron datos en el formato esperado en el archivo .docx")
            return None

        return pd.DataFrame(data)
    except Exception as e:
        st.error(f"Error al procesar el archivo .docx: {str(e)}")
        return None

def load_file(uploaded_file):
    """Carga y procesa archivos en diferentes formatos"""
    try:
        file_type = uploaded_file.name.split('.')[-1].lower()
        st.info(f"Procesando archivo de tipo: {file_type}")

        if file_type == 'xlsx':
            df = pd.read_excel(uploaded_file)
        elif file_type == 'txt':
            df = parse_txt_file(uploaded_file)
        elif file_type in ['doc', 'docx']:
            df = parse_docx_file(uploaded_file)
        else:
            st.error("Formato de archivo no soportado")
            return None

        if df is None:
            return None

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

def generate_reporte_ajustes(df):
    """Genera el reporte de ajustes por sucursal"""
    st.markdown("### 📊 Resumen de Ajustes por Sucursal")

    with st.container():
        cols = st.columns(3)
        with cols[0]:
            st.metric("Total Comprobantes", len(df))
        with cols[1]:
            st.metric("Total Sucursales", df['Sucursal'].nunique())
        with cols[2]:
            st.metric("Diferencia Promedio", f"{df['Diferencia'].mean():.2f}")

    # Gráfico de ajustes por sucursal
    st.markdown("### 📈 Ajustes por Sucursal")
    fig, ax = plt.subplots(figsize=(10, 6))
    sns.barplot(data=df, x='Sucursal', y='Diferencia')
    plt.xticks(rotation=45)
    plt.title('Ajustes por Sucursal')
    plt.tight_layout()
    st.pyplot(fig)
    plt.close()

def generate_reporte_consolidado(df):
    """Genera el reporte consolidado final"""
    st.markdown("### 📊 Análisis Consolidado")

    # Métricas principales
    with st.container():
        cols = st.columns(3)
        with cols[0]:
            total_comprobantes = len(df)
            st.metric(
                "Total de Comprobantes",
                f"{total_comprobantes:,}",
                help="Número total de comprobantes procesados"
            )
        with cols[1]:
            total_diferencia = df['Diferencia'].abs().sum()
            st.metric(
                "Total de Diferencias",
                f"{total_diferencia:,.2f}",
                help="Suma total de diferencias en valor absoluto"
            )
        with cols[2]:
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

def main():
    # Configuración de la página
    st.set_page_config(
        page_title="Reporte Final Consolidado",
        page_icon="🏢",
        layout="wide"
    )

    # Título y descripción con estilo responsive
    st.markdown("""
        <h1 style='text-align: center;'>🏢 Reporte Final Consolidado</h1>
        <p style='text-align: center;'>Sistema de análisis de ajustes por sucursal</p>
    """, unsafe_allow_html=True)

    # Crear menú lateral
    with st.sidebar:
        st.title("🔍 Menú de Reportes")
        menu = st.radio(
            "Seleccione el tipo de reporte",
            ["Ajustes por Sucursal", "Reporte Final Consolidado"],
            format_func=lambda x: "📊 " + x
        )

    # Área de carga de archivo con mejor UX
    with st.container():
        st.markdown("### 📁 Cargar Datos")
        uploaded_file = st.file_uploader(
            "Seleccione el archivo con los datos de ajustes",
            type=['xlsx', 'txt', 'doc', 'docx'],
            help="El archivo debe contener los campos: Sucursal, Comprobante, Codigo, Diferencia"
        )

    if uploaded_file is not None:
        df = load_file(uploaded_file)
        if df is not None:
            if menu == "Reporte Final Consolidado":
                generate_reporte_consolidado(df)
            else:
                generate_reporte_ajustes(df)

            # Opción para ver datos crudos
            with st.expander("🔍 Ver Datos Crudos", expanded=False):
                st.dataframe(df, use_container_width=True)
    else:
        st.info("Seleccione un archivo para comenzar el análisis.")

if __name__ == "__main__":
    main()