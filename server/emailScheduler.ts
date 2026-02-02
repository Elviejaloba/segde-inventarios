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

let emailInterval: NodeJS.Timeout | null = null;
let bridgeInterval: NodeJS.Timeout | null = null;

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
msg['Subject'] = "⚠️ Error en sincronización Bridge - ${fecha}"
msg['From'] = SMTP_USER
msg['To'] = "${NOTIFICACION_ERRORES}"

html = """
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
<h2 style="color: #dc3545;">⚠️ Error en Bridge de Sincronización</h2>
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
msg['Subject'] = "✅ Sincronización Bridge exitosa - ${fecha}"
msg['From'] = SMTP_USER
msg['To'] = "${NOTIFICACION_ERRORES}"

html = """
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
<h2 style="color: #28a745;">✅ Sincronización Bridge Exitosa</h2>
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
  
  iniciarSchedulerEmail();
  iniciarSchedulerBridge();
  
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
  console.log('[Scheduler] Schedulers detenidos');
}
