# -*- coding: utf-8 -*-
"""
NOTIFICACIÓN DE BRIDGE - Grupo Crisa
Ejecutar DESPUÉS del bridge de sincronización.
Notifica éxito o error a lreyes@textilcrisa.com

Uso: python notificacion_bridge.py [exito|error] [mensaje]
  python notificacion_bridge.py exito "Ajustes: 400, Costos: 37570, Ventas: 504136"
  python notificacion_bridge.py error "No se pudo conectar a SQL Server"
"""

import smtplib
import sys
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ============================================
# CONFIGURACIÓN - Modificar si es necesario
# ============================================
SMTP_SERVER = "smtp.textilcrisa.com"
SMTP_PORT = 26
SMTP_USER = "reportes@textilcrisa.com"
SMTP_PASSWORD = "TU_PASSWORD_AQUI"  # <-- CAMBIAR

DESTINATARIO = "lreyes@textilcrisa.com"


def enviar_notificacion_exito(mensaje=""):
    fecha = datetime.now().strftime("%d/%m/%Y %H:%M")

    html = f"""
<html>
<body style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; background: #f0f2f5;">
<div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
  
  <div style="background: #4a5d6a; color: white; padding: 20px; text-align: center;">
    <div style="margin-bottom: 12px;">
      <span style="font-size: 14px; letter-spacing: 8px; font-weight: 300; color: #c0c8ce;">G R U P O</span><br>
      <span style="font-size: 28px; letter-spacing: 4px; font-weight: 700; color: white;">C R I S A</span>
    </div>
    <div style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 12px; margin-top: 8px;">
      <p style="margin: 0; font-size: 14px; opacity: 0.9;">✅ Sincronización Exitosa</p>
      <p style="margin: 5px 0 0; opacity: 0.7; font-size: 12px;">{fecha}</p>
    </div>
  </div>
  
  <div style="padding: 25px 30px;">
    <div style="background: #e8f5e9; border-radius: 8px; padding: 20px; margin: 15px 0; border-left: 4px solid #4caf50;">
      <h3 style="color: #2e7d32; margin: 0 0 10px;">Bridge ejecutado correctamente</h3>
      <p style="color: #555; margin: 0;">{mensaje if mensaje else "La sincronización de datos se completó sin errores."}</p>
    </div>
    
    <p style="color: #888; font-size: 11px; text-align: center; margin-top: 25px;">
      Notificación automática del sistema de sincronización<br>
      Sistema de Seguimiento de Inventarios - Grupo Crisa
    </p>
  </div>
</div>
</body>
</html>
"""

    msg = MIMEMultipart()
    msg["Subject"] = f"✅ Bridge Exitoso - {fecha}"
    msg["From"] = SMTP_USER
    msg["To"] = DESTINATARIO
    msg.attach(MIMEText(html, "html"))

    server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
    server.starttls()
    server.login(SMTP_USER, SMTP_PASSWORD)
    server.sendmail(SMTP_USER, [DESTINATARIO], msg.as_string())
    server.quit()
    print(f"  ✅ Notificación de éxito enviada a {DESTINATARIO}")


def enviar_notificacion_error(mensaje=""):
    fecha = datetime.now().strftime("%d/%m/%Y %H:%M")

    html = f"""
<html>
<body style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; background: #f0f2f5;">
<div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
  
  <div style="background: #4a5d6a; color: white; padding: 20px; text-align: center;">
    <div style="margin-bottom: 12px;">
      <span style="font-size: 14px; letter-spacing: 8px; font-weight: 300; color: #c0c8ce;">G R U P O</span><br>
      <span style="font-size: 28px; letter-spacing: 4px; font-weight: 700; color: white;">C R I S A</span>
    </div>
    <div style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 12px; margin-top: 8px;">
      <p style="margin: 0; font-size: 14px; opacity: 0.9;">⚠️ Error en Sincronización</p>
      <p style="margin: 5px 0 0; opacity: 0.7; font-size: 12px;">{fecha}</p>
    </div>
  </div>
  
  <div style="padding: 25px 30px;">
    <div style="background: #fef2f2; border-radius: 8px; padding: 20px; margin: 15px 0; border-left: 4px solid #dc3545;">
      <h3 style="color: #c62828; margin: 0 0 10px;">Error en el Bridge</h3>
      <pre style="color: #555; margin: 0; white-space: pre-wrap; font-family: Consolas, monospace; font-size: 12px;">{mensaje if mensaje else "Se produjo un error durante la sincronización."}</pre>
    </div>
    
    <p style="color: #888; font-size: 11px; text-align: center; margin-top: 25px;">
      Notificación automática del sistema de sincronización<br>
      Sistema de Seguimiento de Inventarios - Grupo Crisa
    </p>
  </div>
</div>
</body>
</html>
"""

    msg = MIMEMultipart()
    msg["Subject"] = f"⚠️ Error Bridge - {fecha}"
    msg["From"] = SMTP_USER
    msg["To"] = DESTINATARIO
    msg.attach(MIMEText(html, "html"))

    server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
    server.starttls()
    server.login(SMTP_USER, SMTP_PASSWORD)
    server.sendmail(SMTP_USER, [DESTINATARIO], msg.as_string())
    server.quit()
    print(f"  ⚠️ Notificación de error enviada a {DESTINATARIO}")


def main():
    if len(sys.argv) < 2:
        print("Uso: python notificacion_bridge.py [exito|error] [mensaje opcional]")
        print('  Ejemplo: python notificacion_bridge.py exito "Sync OK: 500 registros"')
        print('  Ejemplo: python notificacion_bridge.py error "No se pudo conectar"')
        return

    tipo = sys.argv[1].lower()
    mensaje = sys.argv[2] if len(sys.argv) > 2 else ""

    try:
        if tipo == "exito":
            enviar_notificacion_exito(mensaje)
        elif tipo == "error":
            enviar_notificacion_error(mensaje)
        else:
            print(f"Tipo no válido: {tipo}. Usar 'exito' o 'error'.")
    except Exception as e:
        print(f"❌ Error enviando notificación: {e}")


if __name__ == "__main__":
    main()
