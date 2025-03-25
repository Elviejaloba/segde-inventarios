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

st.set_page_config(
    page_title="Reporte Final Consolidado",
    page_icon="🏢",
    layout="wide"
)

def parse_txt_file(file):
    """Parsea un archivo .txt y extrae los datos en formato estructurado"""
    try:
        content = file.getvalue().decode('utf-8')
        # Asumimos un formato específico en el archivo txt
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

def generate_consolidated_report(df):
    if df is not None:
        # Métricas generales con diseño responsive
        st.markdown("### 📊 Resumen General")

        # Usar contenedor para mejor diseño móvil
        with st.container():
            # Dividir en 3 columnas para métricas principales
            cols = st.columns(3)

            with cols[0]:
                total_comprobantes = len(df)
                st.metric(
                    "Total de Comprobantes",
                    f"{total_comprobantes:,}",
                    delta=None,
                    help="Número total de comprobantes procesados"
                )

            with cols[1]:
                total_sucursales = df['Sucursal'].nunique()
                st.metric(
                    "Total de Sucursales",
                    total_sucursales,
                    delta=None,
                    help="Número de sucursales con registros"
                )

            with cols[2]:
                promedio_diferencias = df['Diferencia'].abs().mean() if 'Diferencia' in df.columns else 0
                st.metric(
                    "Promedio de Diferencias",
                    f"{promedio_diferencias:.2f}",
                    delta=None,
                    help="Promedio de diferencias absolutas"
                )

        # Análisis por sucursal con gráficos responsivos
        st.markdown("### 📈 Análisis por Sucursal")

        # Gráfico de barras horizontal para mejor visualización en móvil
        fig, ax = plt.subplots(figsize=(10, 6))
        sucursal_counts = df['Sucursal'].value_counts()
        sns.barplot(x=sucursal_counts.values, y=sucursal_counts.index, orient='h')
        plt.title('Comprobantes por Sucursal')
        plt.xlabel('Cantidad de Comprobantes')
        # Ajustar márgenes para mejor visualización
        plt.tight_layout()
        st.pyplot(fig)
        plt.close()

        # Detalles por sucursal en formato acordeón
        st.markdown("### 📋 Detalles por Sucursal")
        sucursales = df['Sucursal'].unique()

        for sucursal in sucursales:
            with st.expander(f"📍 {sucursal}", expanded=False):
                df_sucursal = df[df['Sucursal'] == sucursal]

                # Usar columnas para organizar la información
                col1, col2 = st.columns([1, 1])

                with col1:
                    st.metric(
                        "Comprobantes",
                        len(df_sucursal),
                        help="Total de comprobantes en esta sucursal"
                    )

                with col2:
                    if 'Diferencia' in df_sucursal.columns:
                        diferencia_promedio = df_sucursal['Diferencia'].abs().mean()
                        st.metric(
                            "Diferencia Promedio",
                            f"{diferencia_promedio:.2f}",
                            help="Promedio de diferencias en esta sucursal"
                        )

                # Top códigos con mayor diferencia
                if 'Codigo' in df_sucursal.columns and 'Diferencia' in df_sucursal.columns:
                    st.markdown("#### Top 5 códigos con mayor diferencia")
                    top_diferencias = df_sucursal.groupby('Codigo')['Diferencia'].abs().mean().sort_values(ascending=False).head()

                    # Crear gráfico de barras horizontal para mejor visualización móvil
                    fig, ax = plt.subplots(figsize=(8, 4))
                    sns.barplot(x=top_diferencias.values, y=top_diferencias.index, orient='h')
                    plt.title('Top 5 Códigos por Diferencia')
                    plt.xlabel('Diferencia Promedio')
                    plt.tight_layout()
                    st.pyplot(fig)
                    plt.close()

                # Mostrar datos en tabla scrollable
                st.markdown("#### Detalle de Comprobantes")
                st.dataframe(
                    df_sucursal,
                    use_container_width=True,
                    hide_index=True
                )

        # Opción para exportar con estilo móvil
        st.markdown("### 📥 Exportar Datos")
        with st.container():
            if st.button("Descargar Reporte Completo", type="primary", use_container_width=True):
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

                output.seek(0)
                st.download_button(
                    label="📥 Guardar Excel",
                    data=output,
                    file_name="reporte_consolidado.xlsx",
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    use_container_width=True
                )

def main():
    # Título y descripción con estilo responsive
    st.markdown("""
        <h1 style='text-align: center;'>🏢 Reporte Final Consolidado</h1>
        <p style='text-align: center;'>Sistema de análisis de ajustes por sucursal</p>
    """, unsafe_allow_html=True)

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
            generate_consolidated_report(df)

            # Opción para ver datos crudos
            with st.expander("🔍 Ver Datos Crudos", expanded=False):
                st.dataframe(df, use_container_width=True)

if __name__ == "__main__":
    main()