# -*- coding: utf-8 -*-
"""
REPORTE EJECUTIVO SEMANAL - Grupo Crisa
Ejecutar con Task Scheduler: Lunes 9:00 AM

Envía resumen de avance de todas las sucursales a gerencia.
"""

import smtplib
import json
import urllib.request
import calendar
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

FIREBASE_URL = "https://check-d1753-default-rtdb.firebaseio.com/branches.json"
APP_URL = "https://seguimientodeinv.replit.app/"

DESTINATARIOS = [
    "adolfotripodi@textilcrisa.com",
    "carotripodi@textilcrisa.com",
    "florenciatripodi@textilcrisa.com",
    "gerencia@textilcrisa.com",
    "cristinatripodi@textilcrisa.com",
    "lreyes@textilcrisa.com",
    "vaninaprospero@textilcrisa.com",
    "gustavoferrari@textilcrisa.com",
]


def obtener_rendimientos():
    with urllib.request.urlopen(FIREBASE_URL, timeout=30) as response:
        data = json.loads(response.read().decode())

    if not data:
        return []

    rendimientos = []
    branches = data if isinstance(data, list) else [data]

    for sucursal_data in branches:
        if not sucursal_data:
            continue
        sucursal = sucursal_data.get("id", "Desconocida")
        if "Ctro" in sucursal or "Centro" in sucursal or "Distribucion" in sucursal:
            continue
        items = sucursal_data.get("items", {})
        if not items:
            continue

        total = len(items)
        verificados = sum(1 for item in items.values() if item.get("completed", False))
        porcentaje = (verificados / total * 100) if total > 0 else 0

        rendimientos.append({
            "sucursal": sucursal,
            "verificados": verificados,
            "total": total,
            "porcentaje": round(porcentaje, 1),
            "pendientes": total - verificados,
        })

    return sorted(rendimientos, key=lambda x: x["porcentaje"], reverse=True)


def generar_html(rendimientos, mes_actual):
    total_verificados = sum(r["verificados"] for r in rendimientos)
    total_codigos = sum(r["total"] for r in rendimientos)
    avance_global = (total_verificados / total_codigos * 100) if total_codigos > 0 else 0

    filas = ""
    for i, r in enumerate(rendimientos):
        color_fondo = "#f8f9fa" if i % 2 == 0 else "white"
        color_pct = "#28a745" if r["porcentaje"] >= 70 else "#fd7e14" if r["porcentaje"] >= 40 else "#dc3545"
        medalla = "🥇" if i == 0 else "🥈" if i == 1 else "🥉" if i == 2 else f"{i+1}."
        filas += f"""
        <tr style="background: {color_fondo};">
          <td style="padding: 10px 12px; border-bottom: 1px solid #e9ecef;">{medalla}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e9ecef; font-weight: 500;">{r['sucursal']}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e9ecef; text-align: center; color: {color_pct}; font-weight: 600;">{r['porcentaje']:.0f}%</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e9ecef; text-align: center;">{r['verificados']}/{r['total']}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e9ecef; text-align: center; color: #888;">{r['pendientes']}</td>
        </tr>"""

    return f"""
<html>
<body style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; background: #f0f2f5;">
<div style="max-width: 650px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
  
  <div style="background: #4a5d6a; color: white; padding: 20px; text-align: center;">
    <div style="margin-bottom: 12px;">
      <span style="font-size: 14px; letter-spacing: 8px; font-weight: 300; color: #c0c8ce;">G R U P O</span><br>
      <span style="font-size: 28px; letter-spacing: 4px; font-weight: 700; color: white;">C R I S A</span>
    </div>
    <div style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 12px; margin-top: 8px;">
      <p style="margin: 0; font-size: 14px; opacity: 0.9;">📊 Reporte Ejecutivo Semanal</p>
      <p style="margin: 5px 0 0; opacity: 0.7; font-size: 12px;">{mes_actual} - Sistema de Seguimiento de Inventarios</p>
    </div>
  </div>
  
  <div style="padding: 25px 30px;">
    
    <div style="background: #f8f9fa; border-radius: 10px; padding: 25px; margin: 15px 0; border: 1px solid #e9ecef; text-align: center;">
      <span style="font-size: 42px; font-weight: 600; color: #4a5d6a;">{avance_global:.0f}%</span>
      <p style="color: #666; margin: 5px 0; font-size: 14px;">Avance global de muestreo</p>
      <div style="background: #e0e4e8; border-radius: 6px; height: 12px; overflow: hidden; margin-top: 10px;">
        <div style="background: #6a8a9a; height: 100%; width: {min(avance_global, 100)}%; border-radius: 6px;"></div>
      </div>
      <p style="color: #888; font-size: 12px; margin-top: 8px;">
        {total_verificados} de {total_codigos} códigos verificados en {len(rendimientos)} sucursales
      </p>
    </div>
    
    <h3 style="color: #444; font-size: 15px; font-weight: 500; border-bottom: 2px solid #6a8a9a; padding-bottom: 8px; margin: 25px 0 12px;">🏆 Detalle por Sucursal</h3>
    
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background: #4a5d6a; color: white;">
          <th style="padding: 10px 12px; text-align: left; font-weight: 500;">Pos.</th>
          <th style="padding: 10px 12px; text-align: left; font-weight: 500;">Sucursal</th>
          <th style="padding: 10px 12px; text-align: center; font-weight: 500;">Avance</th>
          <th style="padding: 10px 12px; text-align: center; font-weight: 500;">Verificados</th>
          <th style="padding: 10px 12px; text-align: center; font-weight: 500;">Pendientes</th>
        </tr>
      </thead>
      <tbody>
        {filas}
      </tbody>
    </table>
    
    <div style="text-align: center; margin: 25px 0;">
      <a href="{APP_URL}" style="display: inline-block; background: #4a5d6a; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 15px;">
        📊 Ver Dashboard Completo
      </a>
    </div>
    
    <p style="color: #888; font-size: 11px; text-align: center; margin-top: 25px;">
      Reporte automático semanal - Lunes 9:00 AM<br>
      Sistema de Seguimiento de Inventarios - Grupo Crisa
    </p>
  </div>
</div>
</body>
</html>
"""


def main():
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] Generando reporte ejecutivo semanal...")

    rendimientos = obtener_rendimientos()
    if not rendimientos:
        print("  No se obtuvieron datos de Firebase. Saliendo.")
        return

    meses = {1:"Enero",2:"Febrero",3:"Marzo",4:"Abril",5:"Mayo",6:"Junio",
             7:"Julio",8:"Agosto",9:"Septiembre",10:"Octubre",11:"Noviembre",12:"Diciembre"}
    hoy = datetime.now()
    mes_actual = f"{meses[hoy.month]} {hoy.year}"

    html = generar_html(rendimientos, mes_actual)

    asunto = f"📊 Reporte Ejecutivo Semanal - Muestreo {mes_actual}"

    msg = MIMEMultipart()
    msg["Subject"] = asunto
    msg["From"] = SMTP_USER
    msg["To"] = ", ".join(DESTINATARIOS)
    msg.attach(MIMEText(html, "html"))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, DESTINATARIOS, msg.as_string())
        server.quit()
        print(f"  ✅ Reporte enviado a {len(DESTINATARIOS)} destinatarios")
    except Exception as e:
        print(f"  ❌ Error: {e}")

    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] Finalizado.")


if __name__ == "__main__":
    main()
