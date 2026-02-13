# Instalación del Servicio de Sincronización Automática

## Resumen
Este servicio sincroniza datos de Tango (SQL Server) a Replit automáticamente los **Lunes, Miércoles y Viernes a las 7:00 AM**. Se instala una sola vez y funciona solo, sin intervención.

Tu PC actúa como "gateway": solo hace conexiones salientes (como un navegador). No necesitás abrir puertos ni exponer nada.

---

## Paso 1: Instalar Python y dependencias

Si no tenés Python instalado, descargalo de https://www.python.org/downloads/

Abrí una terminal (CMD o PowerShell) y ejecutá:

```
pip install pyodbc pandas requests schedule
```

---

## Paso 2: Configurar las claves

La primera vez que ejecutes el script, se crea automáticamente un archivo `bridge_config.ini` en la misma carpeta. Editalo con las claves:

```ini
[bridge]
api_key = PEGAR_AQUÍ_LA_API_KEY_DE_REPLIT
smtp_password = CONTRASEÑA_DE_reportes@textilcrisa.com

[tango]
server = tangoserver
database = crisa_real1
user = Axoft
password = Axoft
```

La `api_key` es la misma que se configuró en Replit (secret BRIDGE_API_KEY).

**IMPORTANTE**: No compartas este archivo ni lo subas a ningún repositorio.

---

## Paso 3: Probar manualmente

Antes de instalar como servicio, probá que funcione:

```
python bridge_servicio.py --ahora
```

Esto ejecuta una sincronización inmediata. Verificá que no haya errores.

---

## Paso 4: Instalar como Servicio de Windows (con NSSM)

### 4a. Descargar NSSM

1. Ir a https://nssm.cc/download
2. Descargar la última versión
3. Extraer el ZIP
4. Copiar `nssm.exe` (de la carpeta `win64`) a `C:\nssm\nssm.exe`

### 4b. Instalar el servicio

Abrí CMD **como Administrador** y ejecutá:

```
C:\nssm\nssm.exe install BridgeSyncInventarios
```

Se abre una ventana. Completá así:

| Campo | Valor |
|-------|-------|
| **Path** | `C:\Users\TU_USUARIO\AppData\Local\Programs\Python\Python3X\pythonw.exe` (buscar donde está Python) |
| **Startup directory** | La carpeta donde está `bridge_servicio.py` |
| **Arguments** | `bridge_servicio.py` |

> Nota: Usamos `pythonw.exe` (con W) para que no abra ventana de consola.

En la pestaña **Details**:
- Display name: `Bridge Sync Inventarios`
- Description: `Sincronización automática Tango -> Replit`
- Startup type: `Automatic`

En la pestaña **I/O**:
- Output (stdout): `C:\ruta\al\script\logs\servicio_stdout.log`
- Error (stderr): `C:\ruta\al\script\logs\servicio_stderr.log`

Hacer clic en **Install service**.

### 4c. Iniciar el servicio

```
C:\nssm\nssm.exe start BridgeSyncInventarios
```

---

## Paso 5: Verificar que funciona

### Ver el estado del servicio:
```
C:\nssm\nssm.exe status BridgeSyncInventarios
```

### Ver los logs:
Los logs se guardan en la carpeta `logs/` junto al script:
- `bridge_servicio.log` - Log completo de actividad

### Desde Windows:
1. Abrí "Servicios" (escribí `services.msc` en Inicio)
2. Buscá "Bridge Sync Inventarios"
3. Verificá que el estado sea "En ejecución" y el inicio sea "Automático"

---

## Comandos útiles

| Acción | Comando |
|--------|---------|
| Iniciar servicio | `nssm start BridgeSyncInventarios` |
| Detener servicio | `nssm stop BridgeSyncInventarios` |
| Reiniciar servicio | `nssm restart BridgeSyncInventarios` |
| Ver estado | `nssm status BridgeSyncInventarios` |
| Desinstalar | `nssm remove BridgeSyncInventarios confirm` |
| Ejecutar manualmente | `python bridge_servicio.py --ahora` |

---

## Comportamiento automático

- **Arranque con Windows**: El servicio se inicia solo cuando prendés la PC
- **Reinicio automático**: Si falla, se reinicia solo
- **Sin sesión**: No necesitás tener la sesión de Windows iniciada
- **Programación**: Lunes, Miércoles y Viernes a las 07:00
- **Costos**: Solo los Lunes (optimización)
- **Notificaciones**: Envía email después de cada sincronización (éxito o error)
- **Logs**: Todo queda registrado en `logs/bridge_servicio.log`

---

## Solución de problemas

| Problema | Solución |
|----------|----------|
| El servicio no inicia | Verificar la ruta a `pythonw.exe` en la configuración de NSSM |
| Error "API key inválida" | Verificar que `api_key` en `bridge_config.ini` coincida con la configurada en Replit |
| No se conecta a Tango | Verificar que `tangoserver` sea accesible desde la PC |
| No envía emails | Configurar `smtp_password` en `bridge_config.ini` |
| El servicio se detiene | Revisar `logs/bridge_servicio.log` para ver el error |

---

## Encontrar la ruta de Python

Si no sabés dónde está `pythonw.exe`, ejecutá en CMD:

```
where pythonw
```

O en PowerShell:

```
Get-Command pythonw | Select-Object Source
```
