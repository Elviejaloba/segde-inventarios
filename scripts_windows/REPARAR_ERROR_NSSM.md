# Guía de Reparación del Servicio Bridge

El error `"nssm" no se reconoce` significa que Windows no sabe dónde está el programa NSSM. No te preocupes, podemos usar el administrador de servicios de Windows que ya viene instalado.

## 1. Reparar Librerías de Python (Global)
El servicio necesita que las librerías estén disponibles para todo el sistema. Ejecutá este comando en el CMD como Administrador:
```cmd
C:\Users\lreyes\AppData\Local\Programs\Python\Python311\python.exe -m pip install python-dateutil six pandas requests pyodbc schedule
```

## 2. Reiniciar el Servicio (Sin usar NSSM)
1. Presioná la tecla **Windows + R** en tu teclado.
2. Escribí `services.msc` y presioná Enter.
3. Se abrirá una lista. Buscá el que dice **"Bridge Sync Inventarios"** (o "BridgeSyncInventarios").
4. Hacé **clic derecho** sobre él y elegí **Reiniciar**.

## 3. Forzar Sincronización Manual (Para ver los datos YA)
Si no querés esperar al servicio, podés forzar la subida de datos ahora mismo:
1. Abrí la carpeta `C:\BridgeSync\`.
2. Buscá el archivo `ejecutar_bridge_notificacion.bat` y hacé **doble clic**.
3. Se abrirá una ventana negra, dejala que termine (puede tardar un minuto).

---
**Importante: API KEY**
Si los datos siguen sin subir, revisá que en `C:\BridgeSync\bridge_config.ini` la `api_key` sea exactamente esta:
`6dac374f2929194d8a220fa59dc012bfc6e0d3717b5cb3a7521749e8d2ec7a86`
