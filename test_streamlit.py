import streamlit as st

st.set_page_config(
    page_title="Test Streamlit",
    page_icon="🚀",
    layout="centered"
)

st.title("Test Básico de Streamlit")

if st.sidebar.button("Presiona aquí"):
    st.write("¡El botón funciona!")
else:
    st.write("Bienvenido a la prueba de Streamlit")
