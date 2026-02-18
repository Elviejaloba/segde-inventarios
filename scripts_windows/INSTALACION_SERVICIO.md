# Guía de Reparación del Servicio Bridge

Si el comando `nssm` no es reconocido o las librerías fallan, seguí estos pasos:

## 1. Reparar Librerías de Python (Global)
El servicio necesita que las librerías estén instaladas para todo el sistema, no solo para tu usuario. Ejecutá este comando en el CMD como Administrador:
```cmd
C:\Users\lreyes\AppData\Local\Programs\Python\Python311\python.exe -m pip install python-dateutil six pandas requests pyodbc schedule
```
*(Nota: Esto asegura que el usuario SYSTEM pueda ver las librerías)*

## 2. Reiniciar el Servicio (Vía Windows)
Si `nssm` no figura en el PATH, lo más fácil es usar el administrador de servicios:
1. Presioná `Win + R`, escribí `services.msc` y dale Enter.
2. Buscá el servicio llamado **"BridgeSyncInventarios"**.
3. Dale Click Derecho -> **Reiniciar**.

## 3. Forzar Sincronización Manual
Para subir las ventas del sábado inmediatamente sin esperar al servicio:
1. Abrí la carpeta `C:\BridgeSync\`.
2. Hacé doble click en el archivo `ejecutar_bridge_notificacion.bat`.

---
**Recordatorio de API KEY:**
Asegurate que en `C:\BridgeSync\bridge_config.ini` la api_key sea:
`6dac374f2929194d8a220fa59dc012bfc6e0d3717b5cb3a7521749e8d2ec7a86`
