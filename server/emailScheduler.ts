import { spawn } from 'child_process';

const DESTINATARIOS_REPORTE = [
  "adolfotripodi@textilcrisa.com",
  "carotripodi@textilcrisa.com",
  "florenciatripodi@textilcrisa.com",
  "gerencia@textilcrisa.com",
  "cristinatripodi@textilcrisa.com",
  "lreyes@textilcrisa.com",
  "vaninaprospero@textilcrisa.com",
  "gustavoferrari@textilcrisa.com"
];

const NOTIFICACION_ERRORES = "lreyes@textilcrisa.com";

// Configuración de emails por sucursal para recordatorios de muestreo
const EMAILS_SUCURSALES: Record<string, string[]> = {
  "S.JUAN": ["gerencias@textilcrisa.com", "cajas@textilcrisa.com"],
  "CRISA2": ["gerenciacrisa@textilcrisa.com"],
  "T.MZA": ["gerenciatjmza@textilcrisa.com", "vanesaalvarez@textilcrisa.com"],
  "T.SLUIS": ["gerencias@textilcrisa.com", "cajas@textilcrisa.com"],
  "MAIPU": ["cajamaipu@textilcrisa.com"],
  "LUJAN": ["lattijeralujan@textilcrisa.com"],
  "TUNUYAN": ["tunuyan@textilcrisa.com"],
  "S.RAFAEL": ["gerenciasr@textilcrisa.com", "cajas@textilcrisa.com"],
  "T.S.MARTIN": ["cajasmartin@textilcrisa.com", "sebastianbaron87@gmail.com"]
};

// CC Administración en todos los emails de recordatorio
const CC_ADMINISTRACION = [
  "lreyes@textilcrisa.com",
  "gerencia@textilcrisa.com",
  "gustavoferrari@textilcrisa.com",
  "adm@textilcrisa.com",
  "vaninaprospero@textilcrisa.com",
  "carolinatripodi@textilcrisa.com"
];

// Mapeo de nombres de sucursales (Firebase → Email)
const MAPEO_SUCURSALES: Record<string, string> = {
  "T.Sjuan": "S.JUAN",
  "Crisa2": "CRISA2", 
  "T.Mendoza": "T.MZA",
  "T.Luis": "T.SLUIS",
  "T.SLuis": "T.SLUIS",
  "T.Maipu": "MAIPU",
  "T.Lujan": "LUJAN",
  "T.Tunuyan": "TUNUYAN",
  "T.Srafael": "S.RAFAEL",
  "T.S.Martin": "T.S.MARTIN"
  // "Ctro. de Distribucion" no tiene email asignado
};

let emailInterval: NodeJS.Timeout | null = null;
let bridgeInterval: NodeJS.Timeout | null = null;
let muestreoInterval: NodeJS.Timeout | null = null;

interface RendimientoSucursal {
  sucursal: string;
  codigosVerificados: number;
  totalCodigos: number;
  porcentaje: number;
  diasRestantes: number;
  codigosPorDia: number;
}

interface BridgeResultado {
  exito: boolean;
  ajustes: number;
  costos: number;
  ventas: number;
  ultima_fecha_ajustes: string | null;
  ultima_fecha_costos: string | null;
  ultima_fecha_ventas: string | null;
  error: string | null;
}

function ejecutarPython(codigo: string): Promise<{ exito: boolean; salida: string }> {
  return new Promise((resolve) => {
    const proc = spawn('python', ['-c', codigo], {
      cwd: process.cwd(),
      env: process.env
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });
    
    proc.on('close', (code) => {
      resolve({
        exito: code === 0,
        salida: code === 0 ? stdout : stderr
      });
    });
  });
}

async function enviarNotificacionError(error: string): Promise<void> {
  console.log(`[Bridge] Enviando notificación de error a ${NOTIFICACION_ERRORES}...`);
  
  const fecha = new Date().toLocaleString('es-AR');
  const pythonCode = `
import sys
sys.path.insert(0, '.')
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_SERVER = "smtp.textilcrisa.com"
SMTP_PORT = 26
SMTP_USER = "reportes@textilcrisa.com"
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")

msg = MIMEMultipart()
msg['Subject'] = "⚠️ Sistema de Seguimiento de Inventarios - Error en sincronización - ${fecha}"
msg['From'] = SMTP_USER
msg['To'] = "${NOTIFICACION_ERRORES}"

html = """
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
<h2 style="color: #dc3545;">⚠️ Sistema de Seguimiento de Inventarios</h2>
<h3 style="color: #666; margin-top: 5px;">Error en Bridge de Sincronización</h3>
<p><strong>Fecha:</strong> ${fecha}</p>
<p><strong>Detalle del error:</strong></p>
<pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto;">${error.replace(/"/g, '\\"').replace(/\n/g, '\\n')}</pre>
<p style="color: #666; font-size: 12px;">Este es un mensaje automático del sistema de sincronización.</p>
</body>
</html>
"""

msg.attach(MIMEText(html, 'html'))

try:
    if SMTP_PASSWORD:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, ["${NOTIFICACION_ERRORES}"], msg.as_string())
        server.quit()
        print("Notificación enviada")
    else:
        print("SMTP_PASSWORD no configurada")
except Exception as e:
    print(f"Error: {e}")
`;
  
  await ejecutarPython(pythonCode);
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return 'N/A';
  try {
    const d = new Date(fecha);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return fecha;
  }
}

async function enviarNotificacionExito(resultado: BridgeResultado): Promise<void> {
  console.log(`[Bridge] Enviando notificación de éxito a ${NOTIFICACION_ERRORES}...`);
  
  const fecha = new Date().toLocaleString('es-AR');
  const fechaAjustes = formatearFecha(resultado.ultima_fecha_ajustes);
  const fechaCostos = formatearFecha(resultado.ultima_fecha_costos);
  const fechaVentas = formatearFecha(resultado.ultima_fecha_ventas);
  
  const pythonCode = `
import sys
sys.path.insert(0, '.')
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_SERVER = "smtp.textilcrisa.com"
SMTP_PORT = 26
SMTP_USER = "reportes@textilcrisa.com"
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")

msg = MIMEMultipart()
msg['Subject'] = "✅ Sistema de Seguimiento de Inventarios - Sincronización exitosa - ${fecha}"
msg['From'] = SMTP_USER
msg['To'] = "${NOTIFICACION_ERRORES}"

html = """
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
<h2 style="color: #28a745;">✅ Sistema de Seguimiento de Inventarios</h2>
<h3 style="color: #666; margin-top: 5px;">Sincronización Bridge Exitosa</h3>
<p><strong>Fecha de ejecución:</strong> ${fecha}</p>

<table style="border-collapse: collapse; width: 100%; max-width: 500px; margin: 20px 0;">
  <tr style="background: #f8f9fa;">
    <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left;">Tipo de Dato</th>
    <th style="border: 1px solid #dee2e6; padding: 12px; text-align: right;">Registros</th>
    <th style="border: 1px solid #dee2e6; padding: 12px; text-align: center;">Última Fecha</th>
  </tr>
  <tr>
    <td style="border: 1px solid #dee2e6; padding: 12px;">📦 Ajustes</td>
    <td style="border: 1px solid #dee2e6; padding: 12px; text-align: right; font-weight: bold;">${resultado.ajustes.toLocaleString()}</td>
    <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center; color: #0066cc;">${fechaAjustes}</td>
  </tr>
  <tr>
    <td style="border: 1px solid #dee2e6; padding: 12px;">💰 Costos</td>
    <td style="border: 1px solid #dee2e6; padding: 12px; text-align: right; font-weight: bold;">${resultado.costos.toLocaleString()}</td>
    <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center; color: #0066cc;">${fechaCostos}</td>
  </tr>
  <tr>
    <td style="border: 1px solid #dee2e6; padding: 12px;">🛒 Ventas</td>
    <td style="border: 1px solid #dee2e6; padding: 12px; text-align: right; font-weight: bold;">${resultado.ventas.toLocaleString()}</td>
    <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center; color: #0066cc;">${fechaVentas}</td>
  </tr>
  <tr style="background: #e9ecef;">
    <td style="border: 1px solid #dee2e6; padding: 12px; font-weight: bold;">Total</td>
    <td style="border: 1px solid #dee2e6; padding: 12px; text-align: right; font-weight: bold;">${(resultado.ajustes + resultado.costos + resultado.ventas).toLocaleString()}</td>
    <td style="border: 1px solid #dee2e6; padding: 12px;"></td>
  </tr>
</table>

<p style="color: #666; font-size: 12px;">Este es un mensaje automático del sistema de sincronización.</p>
</body>
</html>
"""

msg.attach(MIMEText(html, 'html'))

try:
    if SMTP_PASSWORD:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, ["${NOTIFICACION_ERRORES}"], msg.as_string())
        server.quit()
        print("Notificación de éxito enviada")
    else:
        print("SMTP_PASSWORD no configurada")
except Exception as e:
    print(f"Error: {e}")
`;
  
  await ejecutarPython(pythonCode);
}

async function ejecutarBridge(): Promise<BridgeResultado> {
  console.log('[Bridge] Iniciando sincronización de datos...');
  
  const pythonCode = `
import sys
import json
sys.path.insert(0, '.')
from bridge_ajustes_costos import main
try:
    resultado = main()
    print("BRIDGE_RESULT:" + json.dumps(resultado))
except Exception as e:
    print(f"BRIDGE_ERROR: {e}")
    sys.exit(1)
`;
  
  const resultado = await ejecutarPython(pythonCode);
  
  if (resultado.exito && resultado.salida.includes('BRIDGE_RESULT:')) {
    try {
      const jsonStr = resultado.salida.split('BRIDGE_RESULT:')[1].trim().split('\n')[0];
      const bridgeResult: BridgeResultado = JSON.parse(jsonStr);
      
      console.log('[Bridge] Sincronización completada:');
      console.log(`  - Ajustes: ${bridgeResult.ajustes}`);
      console.log(`  - Costos: ${bridgeResult.costos}`);
      console.log(`  - Ventas: ${bridgeResult.ventas}`);
      
      if (bridgeResult.exito) {
        await enviarNotificacionExito(bridgeResult);
      } else if (bridgeResult.error) {
        await enviarNotificacionError(bridgeResult.error);
      }
      
      return bridgeResult;
    } catch (e) {
      console.error('[Bridge] Error parseando resultado:', e);
      await enviarNotificacionError(`Error parseando resultado: ${resultado.salida}`);
      return { exito: false, ajustes: 0, costos: 0, ventas: 0, ultima_fecha_ajustes: null, ultima_fecha_costos: null, ultima_fecha_ventas: null, error: 'Error parseando resultado' };
    }
  } else {
    console.error('[Bridge] Error en sincronización:', resultado.salida);
    await enviarNotificacionError(resultado.salida);
    return { exito: false, ajustes: 0, costos: 0, ventas: 0, ultima_fecha_ajustes: null, ultima_fecha_costos: null, ultima_fecha_ventas: null, error: resultado.salida };
  }
}

function debeCorrrerBridge(): boolean {
  const now = new Date();
  const dia = now.getDay();
  const hora = now.getHours();
  
  // Miércoles (3) y Domingo (0) a las 23:00
  const esDiaDeSync = dia === 0 || dia === 3;
  const esHoraDeSync = hora === 23;
  
  return esDiaDeSync && esHoraDeSync;
}

function getNextMondayAt9AM(): Date {
  const now = new Date();
  const next = new Date(now);
  
  const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
  next.setDate(now.getDate() + daysUntilMonday);
  next.setHours(9, 0, 0, 0);
  
  if (now.getDay() === 1 && now.getHours() < 9) {
    next.setDate(now.getDate());
  }
  
  return next;
}

async function enviarReporteSemanal(): Promise<void> {
  console.log('[EmailScheduler] Preparando envío de reporte semanal...');
  
  console.log('[EmailScheduler] Actualizando datos del bridge antes de enviar...');
  await ejecutarBridge();
  
  console.log(`[EmailScheduler] Enviando reporte a ${DESTINATARIOS_REPORTE.length} destinatarios...`);
  
  const destinatariosStr = DESTINATARIOS_REPORTE.join(',');
  const pythonCode = `
import sys
sys.path.insert(0, '.')
from email_ajustes_report import enviar_reporte

destinatarios = "${destinatariosStr}".split(',')
exito, mensaje = enviar_reporte(destinatarios, dias=30)
print(f"Resultado: {'Exitoso' if exito else 'Error'} - {mensaje}")
`;
  
  const resultado = await ejecutarPython(pythonCode);
  
  if (resultado.exito) {
    console.log(`[EmailScheduler] Reporte enviado: ${resultado.salida}`);
  } else {
    console.error(`[EmailScheduler] Error al enviar reporte: ${resultado.salida}`);
  }
}

function iniciarSchedulerEmail() {
  const nextRun = getNextMondayAt9AM();
  const msUntilNext = nextRun.getTime() - Date.now();
  
  console.log(`[EmailScheduler] Próximo envío: ${nextRun.toLocaleString('es-AR')}`);
  console.log(`[EmailScheduler] Tiempo restante: ${Math.round(msUntilNext / 1000 / 60 / 60)} horas`);
  
  emailInterval = setTimeout(async () => {
    try {
      await enviarReporteSemanal();
    } catch (error) {
      console.error('[EmailScheduler] Error:', error);
    }
    iniciarSchedulerEmail();
  }, msUntilNext);
}

function iniciarSchedulerBridge() {
  console.log('[Bridge] Scheduler activo - Miércoles y Domingo a las 23:00');
  
  // Chequea cada hora si es momento de ejecutar
  bridgeInterval = setInterval(async () => {
    if (debeCorrrerBridge()) {
      console.log(`[Bridge] Ejecutando sincronización programada...`);
      await ejecutarBridge();
    }
  }, 60 * 60 * 1000);
}

// ==========================================
// SISTEMA DE RECORDATORIOS DE MUESTREO
// ==========================================

function getDiasRestantesMes(): number {
  const hoy = new Date();
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  return ultimoDia.getDate() - hoy.getDate();
}

function getSemanaDelMes(): number {
  const hoy = new Date();
  return Math.ceil(hoy.getDate() / 7);
}

function getNivelUrgencia(porcentaje: number, semana: number): 'normal' | 'urgente' | 'muy_urgente' | 'critico' {
  if (semana >= 4) {
    if (porcentaje < 40) return 'critico';
    if (porcentaje < 70) return 'muy_urgente';
    return 'normal';
  }
  if (semana >= 3) {
    if (porcentaje < 40) return 'muy_urgente';
    if (porcentaje < 70) return 'urgente';
    return 'normal';
  }
  if (semana >= 2) {
    if (porcentaje < 40) return 'urgente';
    return 'normal';
  }
  return 'normal';
}

function debeRecibirRecordatorio(porcentaje: number): boolean {
  const hoy = new Date();
  const diaSemana = hoy.getDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
  
  // Lunes: todos reciben
  if (diaSemana === 1) return true;
  
  // Miércoles: solo <70%
  if (diaSemana === 3) return porcentaje < 70;
  
  // Viernes: solo <40%
  if (diaSemana === 5) return porcentaje < 40;
  
  return false;
}

function generarBarraProgreso(porcentaje: number): string {
  const bloques = Math.round(porcentaje / 10);
  const llenos = '█'.repeat(bloques);
  const vacios = '░'.repeat(10 - bloques);
  return llenos + vacios;
}

function generarRanking(rendimientos: RendimientoSucursal[]): string {
  const ordenados = [...rendimientos].sort((a, b) => b.porcentaje - a.porcentaje);
  let ranking = '';
  
  ordenados.forEach((r, i) => {
    const posicion = (i + 1).toString().padStart(2, ' ');
    const barra = generarBarraProgreso(r.porcentaje);
    const porcentajeStr = r.porcentaje.toFixed(0).padStart(3, ' ');
    ranking += `  ${posicion}. ${r.sucursal.padEnd(12)} ${barra} ${porcentajeStr}%\n`;
  });
  
  return ranking;
}

async function obtenerRendimientoMensual(): Promise<RendimientoSucursal[]> {
  // Usar REST API de Firebase para obtener datos sin credenciales hardcodeadas
  const pythonCode = `
import sys
import json
import urllib.request
from datetime import datetime, timedelta
import calendar

FIREBASE_URL = "https://check-d1753-default-rtdb.firebaseio.com/branches.json"

try:
    # Obtener datos de Firebase via REST API
    with urllib.request.urlopen(FIREBASE_URL, timeout=30) as response:
        data = json.loads(response.read().decode())
    
    if not data:
        print(json.dumps([]))
        sys.exit(0)
    
    hoy = datetime.now()
    ultimo_dia = calendar.monthrange(hoy.year, hoy.month)[1]
    dias_restantes = ultimo_dia - hoy.day
    
    rendimientos = []
    
    # Data es una lista de sucursales, cada una con 'id' e 'items'
    branches = data if isinstance(data, list) else [data]
    
    for sucursal_data in branches:
        if not sucursal_data:
            continue
        sucursal = sucursal_data.get('id', 'Desconocida')
        items = sucursal_data.get('items', {})
        if not items:
            continue
        
        total = len(items)
        # Campo 'completed' es el que usa la app para marcar items verificados
        verificados = sum(1 for item in items.values() if item.get('completed', False))
        porcentaje = (verificados / total * 100) if total > 0 else 0
        
        # Códigos por día necesarios (solo días Lun/Mie/Vie restantes)
        dias_muestreo_restantes = max(1, dias_restantes // 2)
        codigos_pendientes = total - verificados
        codigos_por_dia = round(codigos_pendientes / dias_muestreo_restantes, 1) if dias_muestreo_restantes > 0 else codigos_pendientes
        
        rendimientos.append({
            'sucursal': sucursal,
            'codigosVerificados': verificados,
            'totalCodigos': total,
            'porcentaje': round(porcentaje, 1),
            'diasRestantes': dias_restantes,
            'codigosPorDia': codigos_por_dia
        })
    
    print(json.dumps(rendimientos))
except Exception as e:
    print(json.dumps([]))
`;

  const resultado = await ejecutarPython(pythonCode);
  
  if (resultado.exito) {
    try {
      return JSON.parse(resultado.salida.trim());
    } catch {
      console.error('[Muestreo] Error parseando rendimientos:', resultado.salida);
      return [];
    }
  }
  
  console.error('[Muestreo] Error obteniendo rendimientos:', resultado.salida);
  return [];
}

async function enviarRecordatorioMuestreo(rendimiento: RendimientoSucursal, ranking: string): Promise<void> {
  const sucursalEmail = MAPEO_SUCURSALES[rendimiento.sucursal];
  if (!sucursalEmail) {
    console.log(`[Muestreo] No hay mapeo de email para ${rendimiento.sucursal}`);
    return;
  }
  
  const destinatarios = EMAILS_SUCURSALES[sucursalEmail];
  if (!destinatarios || destinatarios.length === 0) {
    console.log(`[Muestreo] No hay destinatarios para ${sucursalEmail}`);
    return;
  }
  
  const semana = getSemanaDelMes();
  const urgencia = getNivelUrgencia(rendimiento.porcentaje, semana);
  const mesActual = new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  
  // Determinar emoji y color según urgencia
  let emoji = '📊';
  let color = '#17a2b8'; // info blue
  let titulo = 'Recordatorio de Muestreo';
  
  switch (urgencia) {
    case 'critico':
      emoji = '🚨';
      color = '#dc3545';
      titulo = 'URGENTE: Muestreo Crítico';
      break;
    case 'muy_urgente':
      emoji = '⚠️';
      color = '#fd7e14';
      titulo = 'Atención: Muestreo Pendiente';
      break;
    case 'urgente':
      emoji = '📈';
      color = '#ffc107';
      titulo = 'Recordatorio de Muestreo';
      break;
  }
  
  const barra = generarBarraProgreso(rendimiento.porcentaje);
  
  const pythonCode = `
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_SERVER = "smtp.textilcrisa.com"
SMTP_PORT = 26
SMTP_USER = "reportes@textilcrisa.com"
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")

msg = MIMEMultipart()
msg['Subject'] = "${emoji} ${titulo} - ${rendimiento.sucursal} | ${mesActual}"
msg['From'] = SMTP_USER
msg['To'] = "${destinatarios.join(', ')}"
msg['Cc'] = "${CC_ADMINISTRACION.join(', ')}"

html = """
<html>
<body style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5;">
<div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
  
  <div style="background: ${color}; color: white; padding: 25px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">${emoji} ${titulo}</h1>
    <p style="margin: 10px 0 0; opacity: 0.9;">${mesActual} - Sistema de Seguimiento de Inventarios</p>
  </div>
  
  <div style="padding: 30px;">
    <h2 style="color: #333; margin-top: 0;">Sucursal: ${rendimiento.sucursal}</h2>
    
    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <div style="text-align: center; margin-bottom: 15px;">
        <span style="font-size: 48px; font-weight: bold; color: ${color};">${rendimiento.porcentaje.toFixed(0)}%</span>
        <p style="color: #666; margin: 5px 0;">Avance del mes</p>
      </div>
      
      <div style="background: #e9ecef; border-radius: 4px; height: 20px; overflow: hidden;">
        <div style="background: ${color}; height: 100%; width: ${Math.min(rendimiento.porcentaje, 100)}%;"></div>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-top: 15px; color: #666;">
        <span>✅ ${rendimiento.codigosVerificados} verificados</span>
        <span>📦 ${rendimiento.totalCodigos} total</span>
      </div>
    </div>
    
    <div style="display: flex; gap: 15px; margin: 20px 0;">
      <div style="flex: 1; background: #e3f2fd; border-radius: 8px; padding: 15px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold; color: #1976d2;">${rendimiento.diasRestantes}</div>
        <div style="color: #666; font-size: 12px;">Días restantes</div>
      </div>
      <div style="flex: 1; background: #fff3e0; border-radius: 8px; padding: 15px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold; color: #f57c00;">${rendimiento.codigosPorDia}</div>
        <div style="color: #666; font-size: 12px;">Códigos por día</div>
      </div>
      <div style="flex: 1; background: #fce4ec; border-radius: 8px; padding: 15px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold; color: #c2185b;">${rendimiento.totalCodigos - rendimiento.codigosVerificados}</div>
        <div style="color: #666; font-size: 12px;">Pendientes</div>
      </div>
    </div>
    
    <div style="margin: 25px 0;">
      <h3 style="color: #333; border-bottom: 2px solid ${color}; padding-bottom: 10px;">🏆 Ranking de Sucursales</h3>
      <pre style="background: #f8f9fa; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 13px; overflow-x: auto;">${ranking}</pre>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://inventory-crisa.replit.app/" style="display: inline-block; background: ${color}; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        📋 Completar Muestreo
      </a>
    </div>
    
    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
      📅 Recordatorios: Lunes (todos), Miércoles (&lt;70%), Viernes (&lt;40%)<br>
      Sistema de Seguimiento de Inventarios - Grupo Crisa
    </p>
  </div>
</div>
</body>
</html>
"""

msg.attach(MIMEText(html, 'html'))

try:
    if SMTP_PASSWORD:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        
        todos = ${JSON.stringify(destinatarios)} + ${JSON.stringify(CC_ADMINISTRACION)}
        server.sendmail(SMTP_USER, todos, msg.as_string())
        server.quit()
        print("Email enviado a ${rendimiento.sucursal}")
    else:
        print("SMTP_PASSWORD no configurada")
except Exception as e:
    print(f"Error: {e}")
`;

  await ejecutarPython(pythonCode);
}

async function enviarRecordatoriosMuestreo(): Promise<void> {
  console.log('[Muestreo] Obteniendo rendimiento mensual de sucursales...');
  
  const rendimientos = await obtenerRendimientoMensual();
  
  if (rendimientos.length === 0) {
    console.log('[Muestreo] No se obtuvieron datos de rendimiento');
    return;
  }
  
  const ranking = generarRanking(rendimientos);
  
  console.log('[Muestreo] Rendimiento actual:');
  rendimientos.forEach(r => {
    console.log(`  ${r.sucursal}: ${r.porcentaje.toFixed(0)}% (${r.codigosVerificados}/${r.totalCodigos})`);
  });
  
  let enviados = 0;
  
  for (const r of rendimientos) {
    if (debeRecibirRecordatorio(r.porcentaje)) {
      console.log(`[Muestreo] Enviando recordatorio a ${r.sucursal}...`);
      await enviarRecordatorioMuestreo(r, ranking);
      enviados++;
    } else {
      console.log(`[Muestreo] ${r.sucursal} no necesita recordatorio hoy (${r.porcentaje.toFixed(0)}%)`);
    }
  }
  
  console.log(`[Muestreo] Enviados ${enviados} recordatorios`);
}

function getNextMuestreoTime(): Date {
  const now = new Date();
  const next = new Date(now);
  
  // Buscar próximo Lunes, Miércoles o Viernes a las 9:00
  const diasMuestreo = [1, 3, 5]; // Lun, Mie, Vie
  
  let diasHastaProximo = 1;
  for (let i = 0; i < 7; i++) {
    const diaCheck = (now.getDay() + i) % 7;
    if (diasMuestreo.includes(diaCheck)) {
      if (i === 0 && now.getHours() >= 9) {
        continue; // Si ya pasó la hora hoy, buscar el siguiente
      }
      diasHastaProximo = i;
      break;
    }
  }
  
  if (diasHastaProximo === 0) {
    next.setHours(9, 0, 0, 0);
  } else {
    next.setDate(now.getDate() + diasHastaProximo);
    next.setHours(9, 0, 0, 0);
  }
  
  return next;
}

function iniciarSchedulerMuestreo() {
  const nextRun = getNextMuestreoTime();
  const msUntilNext = nextRun.getTime() - Date.now();
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  
  console.log(`[Muestreo] Próximo envío: ${diasSemana[nextRun.getDay()]} ${nextRun.toLocaleString('es-AR')}`);
  console.log(`[Muestreo] Tiempo restante: ${Math.round(msUntilNext / 1000 / 60 / 60)} horas`);
  
  muestreoInterval = setTimeout(async () => {
    try {
      await enviarRecordatoriosMuestreo();
    } catch (error) {
      console.error('[Muestreo] Error:', error);
    }
    iniciarSchedulerMuestreo();
  }, msUntilNext);
}

export function iniciarScheduler() {
  console.log('='.repeat(50));
  console.log('[Scheduler] Iniciando schedulers automáticos...');
  console.log('='.repeat(50));
  
  console.log('\n[EmailScheduler] Configuración de emails semanales:');
  console.log(`  Destinatarios: ${DESTINATARIOS_REPORTE.length}`);
  DESTINATARIOS_REPORTE.forEach(d => console.log(`    - ${d}`));
  console.log(`  Horario: Lunes 9:00 AM`);
  
  console.log('\n[Bridge] Configuración de sincronización:');
  console.log(`  Horario: Miércoles y Domingo a las 23:00`);
  console.log(`  Notificación de errores: ${NOTIFICACION_ERRORES}`);
  console.log(`  Notificación de éxito: ${NOTIFICACION_ERRORES}`);
  
  console.log('\n[Muestreo] Configuración de recordatorios:');
  console.log(`  Horario: Lun/Mié/Vie 9:00 AM`);
  console.log(`  Sucursales: ${Object.keys(EMAILS_SUCURSALES).length}`);
  console.log(`  CC Administración: ${CC_ADMINISTRACION.length} destinatarios`);
  console.log(`  Reglas:`);
  console.log(`    - Lunes: Todas las sucursales`);
  console.log(`    - Miércoles: Solo <70% avance`);
  console.log(`    - Viernes: Solo <40% avance`);
  
  iniciarSchedulerEmail();
  iniciarSchedulerBridge();
  iniciarSchedulerMuestreo();
  
  console.log('\n[Scheduler] Todos los schedulers activos');
  console.log('='.repeat(50));
}

export function detenerScheduler() {
  if (emailInterval) {
    clearTimeout(emailInterval);
    emailInterval = null;
  }
  if (bridgeInterval) {
    clearInterval(bridgeInterval);
    bridgeInterval = null;
  }
  if (muestreoInterval) {
    clearTimeout(muestreoInterval);
    muestreoInterval = null;
  }
  console.log('[Scheduler] Schedulers detenidos');
}

// Exportar función para envío manual de recordatorios
export { enviarRecordatoriosMuestreo };
