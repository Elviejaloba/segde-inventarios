# -*- coding: utf-8 -*-
"""
RECORDATORIOS DE MUESTREO - Grupo Crisa
Ejecutar con Task Scheduler: Lunes/Miércoles/Viernes 9:00 AM

Reglas:
  - Lunes: envía a TODAS las sucursales
  - Miércoles: solo a sucursales con avance < 70%
  - Viernes: solo a sucursales con avance < 40%
"""

import smtplib
import json
import urllib.request
import calendar
import math
import os
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ============================================
# CONFIGURACIÓN - Modificar si es necesario
# ============================================
SMTP_SERVER = "smtp.textilcrisa.com"
SMTP_PORT = 26
SMTP_USER = "reportes@textilcrisa.com"
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")

FIREBASE_URL = "https://check-d1753-default-rtdb.firebaseio.com/branches.json"
APP_URL = os.environ.get("PUBLIC_APP_URL", "http://localhost:5000/")

EMAILS_SUCURSALES = {
    "S.JUAN": ["gerenciasj@textilcrisa.com", "cajasj@textilcrisa.com"],
    "CRISA2": ["gerenciacrisa@textilcrisa.com", "cajacrisa@textilcrisa.com"],
    "T.MZA": ["gerenciatijmza@textilcrisa.com", "vanesa.alvarez@textilcrisa.com"],
    "T.SLUIS": ["gerenciasl@textilcrisa.com", "cajasl@textilcrisa.com"],
    "MAIPU": ["cajamaipu@textilcrisa.com"],
    "LUJAN": ["latijeralujan@textilcrisa.com"],
    "TUNUYAN": ["tunuyan@textilcrisa.com"],
    "S.RAFAEL": ["gerenciasr@textilcrisa.com", "cajasr@textilcrisa.com"],
    "T.S.MARTIN": ["cajasmartin@textilcrisa.com", "sebastianbaron87@gmail.com"],
}

CC_ADMINISTRACION = [
    "lreyes@textilcrisa.com",
    "gerencia@textilcrisa.com",
    "gustavoferrari@textilcrisa.com",
    "adm@textilcrisa.com",
    "vaninaprospero@textilcrisa.com",
    "carolinatripodi@textilcrisa.com",
]

MAPEO_SUCURSALES = {
    "T.Sjuan": "S.JUAN",
    "Crisa2": "CRISA2",
    "T.Mendoza": "T.MZA",
    "T.Luis": "T.SLUIS",
    "T.SLuis": "T.SLUIS",
    "T.Maipu": "MAIPU",
    "T.Lujan": "LUJAN",
    "T.Tunuyan": "TUNUYAN",
    "T.Srafael": "S.RAFAEL",
    "T.S.Martin": "T.S.MARTIN",
}


def obtener_rendimientos():
    with urllib.request.urlopen(FIREBASE_URL, timeout=30) as response:
        data = json.loads(response.read().decode())

    if not data:
        return []

    hoy = datetime.now()
    ultimo_dia = calendar.monthrange(hoy.year, hoy.month)[1]
    dias_restantes = ultimo_dia - hoy.day

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
        pendientes = total - verificados

        rendimientos.append({
            "sucursal": sucursal,
            "verificados": verificados,
            "total": total,
            "porcentaje": round(porcentaje, 1),
            "pendientes": pendientes,
        })

    return rendimientos


def generar_ranking(rendimientos):
    ordenados = sorted(rendimientos, key=lambda x: x["porcentaje"], reverse=True)
    ranking = ""
    for i, r in enumerate(ordenados):
        bloques = round(r["porcentaje"] / 10)
        barra = "\u2588" * bloques + "\u2591" * (10 - bloques)
        ranking += f"  {i+1:2}. {r['sucursal']:<14} {barra} {r['porcentaje']:5.1f}%\n"
    return ranking


def debe_recibir(porcentaje):
    dia = datetime.now().weekday()  # 0=Lun, 1=Mar, 2=Mie, 3=Jue, 4=Vie
    if dia == 0:  # Lunes
        return True
    if dia == 2:  # Miércoles
        return porcentaje < 70
    if dia == 4:  # Viernes
        return porcentaje < 40
    return False


def generar_html(rendimiento, ranking, mes_actual):
    pendientes = rendimiento["pendientes"]
    porcentaje = rendimiento["porcentaje"]
    pct_width = min(porcentaje, 100)

    return f"""
<html>
<body style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; background: #f0f2f5;">
<div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
  
  <div style="background: #4a5d6a; color: white; padding: 20px; text-align: center;">
    <div style="margin-bottom: 12px;">
      <span style="font-size: 14px; letter-spacing: 8px; font-weight: 300; color: #c0c8ce;">G R U P O</span><br>
      <span style="font-size: 28px; letter-spacing: 4px; font-weight: 700; color: white;">C R I S A</span>
    </div>
    <div style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 12px; margin-top: 8px;">
      <p style="margin: 0; font-size: 14px; opacity: 0.9;">📋 Recordatorio de Muestreo</p>
      <p style="margin: 5px 0 0; opacity: 0.7; font-size: 12px;">{mes_actual} - Sistema de Seguimiento de Inventarios</p>
    </div>
  </div>
  
  <div style="padding: 25px 30px;">
    <h2 style="color: #444; margin: 0 0 20px; font-weight: 500; font-size: 18px;">Sucursal: {rendimiento['sucursal']}</h2>
    
    <div style="background: #f8f9fa; border-radius: 10px; padding: 25px; margin: 15px 0; border: 1px solid #e9ecef;">
      <div style="text-align: center; margin-bottom: 15px;">
        <span style="font-size: 42px; font-weight: 600; color: #4a5d6a;">{porcentaje:.0f}%</span>
        <p style="color: #666; margin: 5px 0; font-size: 14px;">Avance del muestreo mensual</p>
      </div>
      
      <div style="background: #e0e4e8; border-radius: 6px; height: 12px; overflow: hidden;">
        <div style="background: #6a8a9a; height: 100%; width: {pct_width}%; border-radius: 6px;"></div>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-top: 12px; color: #666; font-size: 13px;">
        <span>&#10003; {rendimiento['verificados']} códigos verificados</span>
        <span>{rendimiento['total']} códigos asignados</span>
      </div>
    </div>
    
    <div style="text-align: center; background: #f5f0f2; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <div style="font-size: 32px; font-weight: 600; color: #5a5055;">{pendientes}</div>
      <div style="color: #666; font-size: 13px; margin-top: 4px;">Códigos pendientes por verificar</div>
    </div>
    
    <div style="margin: 25px 0;">
      <h3 style="color: #444; font-size: 15px; font-weight: 500; border-bottom: 2px solid #6a8a9a; padding-bottom: 8px; margin-bottom: 12px;">🏆 Ranking de Sucursales</h3>
      <pre style="background: #f8f9fa; padding: 12px 15px; border-radius: 8px; font-family: 'Consolas', monospace; font-size: 12px; overflow-x: auto; border: 1px solid #e9ecef; color: #555;">{ranking}</pre>
    </div>
    
    <div style="text-align: center; margin: 25px 0;">
      <a href="{APP_URL}" style="display: inline-block; background: #4a5d6a; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 15px;">
        📋 Ir al Sistema de Muestreo
      </a>
    </div>
    
    <p style="color: #888; font-size: 11px; text-align: center; margin-top: 25px;">
      Recordatorios automáticos: Lunes (todas las sucursales), Miércoles (avance &lt;70%), Viernes (avance &lt;40%)<br>
      Sistema de Seguimiento de Inventarios - Grupo Crisa
    </p>
  </div>
</div>
</body>
</html>
"""


def enviar_email(destinatarios, cc, asunto, html):
    msg = MIMEMultipart()
    msg["Subject"] = asunto
    msg["From"] = SMTP_USER
    msg["To"] = ", ".join(destinatarios)
    msg["Cc"] = ", ".join(cc)
    msg.attach(MIMEText(html, "html"))

    todos = destinatarios + cc
    server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
    server.starttls()
    server.login(SMTP_USER, SMTP_PASSWORD)
    server.sendmail(SMTP_USER, todos, msg.as_string())
    server.quit()


def main():
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] Iniciando recordatorios de muestreo...")

    dia_nombre = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    hoy = datetime.now()
    print(f"  Día: {dia_nombre[hoy.weekday()]}")

    if hoy.weekday() not in [0, 2, 4]:  # Lun, Mie, Vie
        print("  Hoy no es día de recordatorios (solo Lun/Mié/Vie). Saliendo.")
        return

    rendimientos = obtener_rendimientos()
    if not rendimientos:
        print("  No se obtuvieron datos de Firebase. Saliendo.")
        return

    ranking = generar_ranking(rendimientos)
    meses = {1:"Enero",2:"Febrero",3:"Marzo",4:"Abril",5:"Mayo",6:"Junio",
             7:"Julio",8:"Agosto",9:"Septiembre",10:"Octubre",11:"Noviembre",12:"Diciembre"}
    mes_actual = f"{meses[hoy.month]} {hoy.year}"

    print(f"  Rendimiento actual:")
    for r in rendimientos:
        print(f"    {r['sucursal']}: {r['porcentaje']:.0f}% ({r['verificados']}/{r['total']})")

    enviados = 0
    for r in rendimientos:
        if not debe_recibir(r["porcentaje"]):
            print(f"  {r['sucursal']}: no necesita recordatorio hoy ({r['porcentaje']:.0f}%)")
            continue

        clave = MAPEO_SUCURSALES.get(r["sucursal"])
        if not clave or clave not in EMAILS_SUCURSALES:
            print(f"  {r['sucursal']}: sin email configurado")
            continue

        destinatarios = EMAILS_SUCURSALES[clave]
        asunto = f"📋 Recordatorio de Muestreo - {r['sucursal']} | {mes_actual}"
        html = generar_html(r, ranking, mes_actual)

        try:
            enviar_email(destinatarios, CC_ADMINISTRACION, asunto, html)
            print(f"  ✅ Enviado a {r['sucursal']} ({', '.join(destinatarios)})")
            enviados += 1
        except Exception as e:
            print(f"  ❌ Error enviando a {r['sucursal']}: {e}")

    print(f"\n  Total enviados: {enviados}")
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] Finalizado.")


if __name__ == "__main__":
    main()
