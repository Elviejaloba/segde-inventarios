import { spawn } from 'child_process';
import { getCalendarioSucursal } from '@shared/calendario-semanal';

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
  "S.JUAN": ["gerenciasj@textilcrisa.com", "cajasj@textilcrisa.com"],
  "CRISA2": ["gerenciacrisa@textilcrisa.com", "cajacrisa@textilcrisa.com"],
  "T.MZA": ["gerenciatijmza@textilcrisa.com", "vanesa.alvarez@textilcrisa.com"],
  "T.SLUIS": ["gerenciasl@textilcrisa.com", "cajasl@textilcrisa.com"],
  "MAIPU": ["cajamaipu@textilcrisa.com"],
  "LUJAN": ["latijeralujan@textilcrisa.com"],
  "TUNUYAN": ["tunuyan@textilcrisa.com"],
  "S.RAFAEL": ["gerenciasr@textilcrisa.com", "cajasr@textilcrisa.com"],
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
  tieneCalendario: boolean;
  // Total temporada
  codigosVerificados: number;
  totalCodigos: number;
  porcentaje: number;
  // Mes actual (solo si tieneCalendario)
  codigosVerificadosMes: number;
  totalCodigosMes: number;
  porcentajeMes: number;
  nombreMes: string;
  // Sin calendario: métricas simples
  noStockPct: number;
  // Días restantes
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
  
  // Lunes(1) a Sábado(6) a las 7:00
  const esDiaDeSync = dia >= 1 && dia <= 6;
  const esHoraDeSync = hora === 7;
  
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

async function enviarReporteSemanal(skipBridge: boolean = false): Promise<void> {
  console.log('[EmailScheduler] Preparando envío de reporte semanal...');
  
  if (!skipBridge) {
    console.log('[EmailScheduler] Actualizando datos del bridge antes de enviar...');
    await ejecutarBridge();
  } else {
    console.log('[EmailScheduler] Bridge omitido (datos ya sincronizados desde servicio Windows)');
  }
  
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
  console.log('[Bridge] Scheduler activo - Lunes a Sábado a las 07:00');
  
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
  // Ordenar por % del mes actual (si disponible) o por total temporada
  const ordenados = [...rendimientos].sort((a, b) => {
    const pctA = a.totalCodigosMes > 0 ? a.porcentajeMes : a.porcentaje;
    const pctB = b.totalCodigosMes > 0 ? b.porcentajeMes : b.porcentaje;
    return pctB - pctA;
  });
  
  let ranking = '';
  ordenados.forEach((r, i) => {
    const posicion = (i + 1).toString().padStart(2, ' ');
    const pctMes = r.totalCodigosMes > 0 ? r.porcentajeMes : r.porcentaje;
    const pctTemporada = r.porcentaje;
    const barra = generarBarraProgreso(pctMes);
    const mesPctStr = pctMes.toFixed(0).padStart(3, ' ');
    const tmpStr = pctTemporada.toFixed(0).padStart(3, ' ');
    ranking += `  ${posicion}. ${r.sucursal.padEnd(12)} ${barra} ${mesPctStr}% (temp: ${tmpStr}%)\n`;
  });
  
  return ranking;
}

const MESES_ES: Record<number, string> = {
  1: 'ENERO', 2: 'FEBRERO', 3: 'MARZO', 4: 'ABRIL',
  5: 'MAYO', 6: 'JUNIO', 7: 'JULIO', 8: 'AGOSTO',
  9: 'SEPTIEMBRE', 10: 'OCTUBRE', 11: 'NOVIEMBRE', 12: 'DICIEMBRE'
};

const MESES_DISPLAY: Record<number, string> = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
  5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
  9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
};

function sanitizarCodigo(code: string): string {
  return code.toLowerCase().replace(/[/.#$[\]]/g, '-');
}

async function obtenerRendimientoMensual(): Promise<RendimientoSucursal[]> {
  try {
    const res = await fetch('https://check-d1753-default-rtdb.firebaseio.com/branches.json', {
      signal: AbortSignal.timeout(30000)
    });
    if (!res.ok) throw new Error(`Firebase error: ${res.status}`);
    const data = await res.json();
    if (!data) return [];

    const now = new Date();
    const mesActualKey = MESES_ES[now.getMonth() + 1];
    const nombreMes = MESES_DISPLAY[now.getMonth() + 1];
    const ultimoDia = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const diasRestantes = ultimoDia - now.getDate();
    const diasMuestreoRestantes = Math.max(1, Math.floor(diasRestantes / 2));

    const branches: any[] = Array.isArray(data) ? data : [data];
    const rendimientos: RendimientoSucursal[] = [];

    for (const branchData of branches) {
      if (!branchData) continue;
      const sucursal: string = branchData.id || 'Desconocida';
      // Ignorar Centro de Distribución y T.Luis (clave obsoleta de Firebase; la sucursal San Luis usa T.SLuis)
      if (sucursal.includes('Ctro') || sucursal.includes('Centro') || sucursal.includes('Distribucion') || sucursal === 'T.Luis') continue;

      const items: Record<string, any> = branchData.items || {};
      if (Object.keys(items).length === 0) continue;

      const calendario = getCalendarioSucursal(sucursal);
      let totalCodigos: number;
      let codigosVerificados: number;
      let totalCodigosMes: number;
      let codigosVerificadosMes: number;
      let noStockPct: number = 0;
      const tieneCalendario: boolean = !!calendario;

      if (calendario) {
        // === TOTAL TEMPORADA: todos los items del calendario ===
        const codigosCalendario = calendario.semanas.flatMap(s => s.items);
        totalCodigos = codigosCalendario.length;
        codigosVerificados = codigosCalendario.filter(code => {
          const s = sanitizarCodigo(code);
          return items[s]?.completed === true || items[code]?.completed === true;
        }).length;

        // === MES ACTUAL: solo items de las semanas del mes en curso ===
        const semanasMesActual = calendario.semanas.filter(s => s.mes === mesActualKey);
        const codigosMesActual = semanasMesActual.flatMap(s => s.items);
        totalCodigosMes = codigosMesActual.length;
        codigosVerificadosMes = codigosMesActual.filter(code => {
          const s = sanitizarCodigo(code);
          return items[s]?.completed === true || items[code]?.completed === true;
        }).length;
      } else {
        // Sin calendario: % de cumplimiento desde Firebase + % sin stock
        totalCodigos = 0;
        codigosVerificados = 0;
        totalCodigosMes = 0;
        codigosVerificadosMes = 0;
        // noStockPct: artículos sin stock / total items de Firebase
        const allItems = Object.values(items) as any[];
        const sinStock = allItems.filter(v => v && !v.hasStock).length;
        noStockPct = allItems.length > 0 ? Math.round((sinStock / allItems.length) * 1000) / 10 : 0;
      }

      // Porcentaje de cumplimiento: para calendario = calculado; sin calendario = totalCompleted de Firebase
      const porcentaje = tieneCalendario
        ? (totalCodigos > 0 ? Math.round((codigosVerificados / totalCodigos) * 1000) / 10 : 0)
        : parseFloat(String(branchData.totalCompleted || 0));
      const porcentajeMes = totalCodigosMes > 0
        ? Math.round((codigosVerificadosMes / totalCodigosMes) * 1000) / 10
        : 0;

      // Pendientes en base al mes actual (urgencia inmediata)
      const pendientesMes = totalCodigosMes - codigosVerificadosMes;
      const codigosPorDia = Math.round((pendientesMes / diasMuestreoRestantes) * 10) / 10;

      rendimientos.push({
        sucursal,
        tieneCalendario,
        codigosVerificados,
        totalCodigos,
        porcentaje,
        codigosVerificadosMes,
        totalCodigosMes,
        porcentajeMes,
        nombreMes,
        noStockPct,
        diasRestantes,
        codigosPorDia
      });
    }

    return rendimientos;
  } catch (err) {
    console.error('[Muestreo] Error obteniendo rendimientos:', err);
    return [];
  }
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
  // Urgencia basada en el avance del mes actual; si no hay calendario usa el total
  const pctParaUrgencia = rendimiento.totalCodigosMes > 0 ? rendimiento.porcentajeMes : rendimiento.porcentaje;
  const urgencia = getNivelUrgencia(pctParaUrgencia, semana);
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
<body style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; background: #f0f2f5;">
<div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
  
  <div style="background: #4a5d6a; color: white; padding: 20px; text-align: center;">
    <div style="margin-bottom: 12px;">
      <span style="font-size: 14px; letter-spacing: 8px; font-weight: 300; color: #c0c8ce;">G R U P O</span><br>
      <span style="font-size: 28px; letter-spacing: 4px; font-weight: 700; color: white;">C R I S A</span>
    </div>
    <div style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 12px; margin-top: 8px;">
      <p style="margin: 0; font-size: 14px; opacity: 0.9;">${emoji} ${titulo}</p>
      <p style="margin: 5px 0 0; opacity: 0.7; font-size: 12px;">${mesActual} - Sistema de Seguimiento de Inventarios</p>
    </div>
  </div>
  
  <div style="padding: 25px 30px;">
    <h2 style="color: #444; margin: 0 0 20px; font-weight: 500; font-size: 18px;">Sucursal: ${rendimiento.sucursal}</h2>

    <!-- BLOQUE MES ACTUAL -->
    ${rendimiento.totalCodigosMes > 0 ? `
    <div style="background: #f0f7f4; border-radius: 10px; padding: 20px 25px; margin: 0 0 14px; border: 1px solid #c3ddd2;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
        <div>
          <div style="font-size: 11px; font-weight: 600; letter-spacing: 1px; color: #5a7a6a; text-transform: uppercase; margin-bottom: 2px;">📅 ${rendimiento.nombreMes} (mes actual)</div>
          <div style="font-size: 13px; color: #666;">${rendimiento.codigosVerificadosMes} de ${rendimiento.totalCodigosMes} items completados</div>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 36px; font-weight: 700; color: ${rendimiento.porcentajeMes >= 70 ? '#2d7a4f' : rendimiento.porcentajeMes >= 40 ? '#b36a00' : '#c0392b'};">${rendimiento.porcentajeMes.toFixed(0)}%</span>
        </div>
      </div>
      <div style="background: #d4e8de; border-radius: 6px; height: 10px; overflow: hidden;">
        <div style="background: ${rendimiento.porcentajeMes >= 70 ? '#28a745' : rendimiento.porcentajeMes >= 40 ? '#fd7e14' : '#dc3545'}; height: 100%; width: ${Math.min(rendimiento.porcentajeMes, 100)}%; border-radius: 6px;"></div>
      </div>
      <div style="margin-top: 10px; color: #666; font-size: 12px;">
        ⏳ Pendientes este mes: <strong>${rendimiento.totalCodigosMes - rendimiento.codigosVerificadosMes}</strong> items
        ${rendimiento.diasRestantes > 0 ? ` · Ritmo necesario: <strong>${rendimiento.codigosPorDia} items/día</strong>` : ''}
      </div>
    </div>
    ` : ''}

    <!-- BLOQUE CUMPLIMIENTO: con calendario = items detallados; sin calendario = % simple + sin stock -->
    ${rendimiento.tieneCalendario ? `
    <div style="background: #f8f9fa; border-radius: 10px; padding: 20px 25px; margin: 0 0 20px; border: 1px solid #e9ecef;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
        <div>
          <div style="font-size: 11px; font-weight: 600; letter-spacing: 1px; color: #6a7a8a; text-transform: uppercase; margin-bottom: 2px;">📦 Avance total temporada</div>
          <div style="font-size: 13px; color: #666;">${rendimiento.codigosVerificados} de ${rendimiento.totalCodigos} items completados</div>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 36px; font-weight: 700; color: #4a5d6a;">${rendimiento.porcentaje.toFixed(0)}%</span>
        </div>
      </div>
      <div style="background: #e0e4e8; border-radius: 6px; height: 10px; overflow: hidden;">
        <div style="background: #6a8a9a; height: 100%; width: ${Math.min(rendimiento.porcentaje, 100)}%; border-radius: 6px;"></div>
      </div>
      <div style="margin-top: 10px; color: #888; font-size: 12px;">
        Restantes en la temporada: <strong>${rendimiento.totalCodigos - rendimiento.codigosVerificados}</strong> items
      </div>
    </div>
    ` : `
    <div style="display: flex; gap: 14px; margin: 0 0 20px;">
      <!-- Cumplimiento -->
      <div style="flex: 1; background: #f8f9fa; border-radius: 10px; padding: 18px 20px; border: 1px solid #e9ecef;">
        <div style="font-size: 11px; font-weight: 600; letter-spacing: 1px; color: #6a7a8a; text-transform: uppercase; margin-bottom: 10px;">📊 Cumplimiento</div>
        <div style="font-size: 34px; font-weight: 700; color: ${rendimiento.porcentaje >= 70 ? '#2d7a4f' : rendimiento.porcentaje >= 40 ? '#b36a00' : '#c0392b'};">${rendimiento.porcentaje.toFixed(0)}%</div>
        <div style="background: #e0e4e8; border-radius: 6px; height: 8px; overflow: hidden; margin-top: 10px;">
          <div style="background: ${rendimiento.porcentaje >= 70 ? '#28a745' : rendimiento.porcentaje >= 40 ? '#fd7e14' : '#dc3545'}; height: 100%; width: ${Math.min(rendimiento.porcentaje, 100)}%; border-radius: 6px;"></div>
        </div>
      </div>
      <!-- Sin Stock -->
      <div style="flex: 1; background: #fff8f0; border-radius: 10px; padding: 18px 20px; border: 1px solid #fde8c8;">
        <div style="font-size: 11px; font-weight: 600; letter-spacing: 1px; color: #8a6a3a; text-transform: uppercase; margin-bottom: 10px;">📦 Sin Stock</div>
        <div style="font-size: 34px; font-weight: 700; color: ${rendimiento.noStockPct >= 20 ? '#c0392b' : rendimiento.noStockPct >= 10 ? '#b36a00' : '#2d7a4f'};">${rendimiento.noStockPct.toFixed(1)}%</div>
        <div style="background: #fde8c8; border-radius: 6px; height: 8px; overflow: hidden; margin-top: 10px;">
          <div style="background: ${rendimiento.noStockPct >= 20 ? '#dc3545' : rendimiento.noStockPct >= 10 ? '#fd7e14' : '#28a745'}; height: 100%; width: ${Math.min(rendimiento.noStockPct, 100)}%; border-radius: 6px;"></div>
        </div>
      </div>
    </div>
    `}
    
    <div style="margin: 25px 0;">
      <h3 style="color: #444; font-size: 15px; font-weight: 500; border-bottom: 2px solid #6a8a9a; padding-bottom: 8px; margin-bottom: 12px;">🏆 Ranking de Sucursales</h3>
      <pre style="background: #f8f9fa; padding: 12px 15px; border-radius: 8px; font-family: 'Consolas', monospace; font-size: 12px; overflow-x: auto; border: 1px solid #e9ecef; color: #555;">${ranking}</pre>
    </div>
    
    <div style="text-align: center; margin: 25px 0;">
      <a href="https://seguimientodeinv.replit.app/" style="display: inline-block; background: #4a5d6a; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 15px;">
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
    const pctRecordatorio = r.totalCodigosMes > 0 ? r.porcentajeMes : r.porcentaje;
    if (debeRecibirRecordatorio(pctRecordatorio)) {
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
  console.log(`  Horario: Lunes a Sábado a las 07:00`);
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

async function enviarMailPrueba(destinatario: string, sucursalFiltro?: string): Promise<{ enviados: number; sucursales: string[] }> {
  console.log(`[Test] Enviando mail de prueba a ${destinatario}...`);
  const rendimientos = await obtenerRendimientoMensual();
  if (rendimientos.length === 0) throw new Error('No se obtuvieron datos de Firebase');

  const ranking = generarRanking(rendimientos);
  const lista = sucursalFiltro
    ? rendimientos.filter(r => r.sucursal.toLowerCase().includes(sucursalFiltro.toLowerCase()))
    : rendimientos.slice(0, 3); // Por defecto las primeras 3 sucursales

  const enviados: string[] = [];

  for (const rendimiento of lista) {
    const mesActual = new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    const semana = getSemanaDelMes();
    const pctParaUrgencia = rendimiento.totalCodigosMes > 0 ? rendimiento.porcentajeMes : rendimiento.porcentaje;
    const urgencia = getNivelUrgencia(pctParaUrgencia, semana);

    let emoji = '📊';
    let titulo = 'Recordatorio de Muestreo';
    switch (urgencia) {
      case 'critico': emoji = '🚨'; titulo = 'URGENTE: Muestreo Crítico'; break;
      case 'muy_urgente': emoji = '⚠️'; titulo = 'Atención: Muestreo Pendiente'; break;
      case 'urgente': emoji = '📈'; titulo = 'Recordatorio de Muestreo'; break;
    }

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
msg['Subject'] = "[PRUEBA] ${emoji} ${titulo} - ${rendimiento.sucursal} | ${mesActual}"
msg['From'] = SMTP_USER
msg['To'] = "${destinatario}"

html = """
<html>
<body style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; background: #f0f2f5;">
<div style="max-width: 600px; margin: 0 auto;">
  <div style="background: #ff9900; color: white; padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: bold; text-align: center; margin-bottom: 8px;">
    ✉️ MAIL DE PRUEBA - No es un envío real a la sucursal
  </div>
<div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
  <div style="background: #4a5d6a; color: white; padding: 20px; text-align: center;">
    <div style="margin-bottom: 12px;">
      <span style="font-size: 14px; letter-spacing: 8px; font-weight: 300; color: #c0c8ce;">G R U P O</span><br>
      <span style="font-size: 28px; letter-spacing: 4px; font-weight: 700; color: white;">C R I S A</span>
    </div>
    <div style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 12px; margin-top: 8px;">
      <p style="margin: 0; font-size: 14px; opacity: 0.9;">${emoji} ${titulo}</p>
      <p style="margin: 5px 0 0; opacity: 0.7; font-size: 12px;">${mesActual} - Sistema de Seguimiento de Inventarios</p>
    </div>
  </div>
  <div style="padding: 25px 30px;">
    <h2 style="color: #444; margin: 0 0 20px; font-weight: 500; font-size: 18px;">Sucursal: ${rendimiento.sucursal}</h2>

    ${rendimiento.totalCodigosMes > 0 ? `
    <div style="background: #f0f7f4; border-radius: 10px; padding: 20px 25px; margin: 0 0 14px; border: 1px solid #c3ddd2;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
        <div>
          <div style="font-size: 11px; font-weight: 600; letter-spacing: 1px; color: #5a7a6a; text-transform: uppercase; margin-bottom: 2px;">📅 ${rendimiento.nombreMes} (mes actual)</div>
          <div style="font-size: 13px; color: #666;">${rendimiento.codigosVerificadosMes} de ${rendimiento.totalCodigosMes} items completados</div>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 36px; font-weight: 700; color: ${rendimiento.porcentajeMes >= 70 ? '#2d7a4f' : rendimiento.porcentajeMes >= 40 ? '#b36a00' : '#c0392b'};">${rendimiento.porcentajeMes.toFixed(0)}%</span>
        </div>
      </div>
      <div style="background: #d4e8de; border-radius: 6px; height: 10px; overflow: hidden;">
        <div style="background: ${rendimiento.porcentajeMes >= 70 ? '#28a745' : rendimiento.porcentajeMes >= 40 ? '#fd7e14' : '#dc3545'}; height: 100%; width: ${Math.min(rendimiento.porcentajeMes, 100)}%; border-radius: 6px;"></div>
      </div>
      <div style="margin-top: 10px; color: #666; font-size: 12px;">
        ⏳ Pendientes este mes: <strong>${rendimiento.totalCodigosMes - rendimiento.codigosVerificadosMes}</strong> items
        ${rendimiento.diasRestantes > 0 ? ` · Ritmo necesario: <strong>${rendimiento.codigosPorDia} items/día</strong>` : ''}
      </div>
    </div>
    ` : ''}

    ${rendimiento.tieneCalendario ? `
    <div style="background: #f8f9fa; border-radius: 10px; padding: 20px 25px; margin: 0 0 20px; border: 1px solid #e9ecef;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
        <div>
          <div style="font-size: 11px; font-weight: 600; letter-spacing: 1px; color: #6a7a8a; text-transform: uppercase; margin-bottom: 2px;">📦 Avance total temporada</div>
          <div style="font-size: 13px; color: #666;">${rendimiento.codigosVerificados} de ${rendimiento.totalCodigos} items completados</div>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 36px; font-weight: 700; color: #4a5d6a;">${rendimiento.porcentaje.toFixed(0)}%</span>
        </div>
      </div>
      <div style="background: #e0e4e8; border-radius: 6px; height: 10px; overflow: hidden;">
        <div style="background: #6a8a9a; height: 100%; width: ${Math.min(rendimiento.porcentaje, 100)}%; border-radius: 6px;"></div>
      </div>
      <div style="margin-top: 10px; color: #888; font-size: 12px;">
        Restantes en la temporada: <strong>${rendimiento.totalCodigos - rendimiento.codigosVerificados}</strong> items
      </div>
    </div>
    ` : `
    <div style="display: flex; gap: 14px; margin: 0 0 20px;">
      <div style="flex: 1; background: #f8f9fa; border-radius: 10px; padding: 18px 20px; border: 1px solid #e9ecef;">
        <div style="font-size: 11px; font-weight: 600; letter-spacing: 1px; color: #6a7a8a; text-transform: uppercase; margin-bottom: 10px;">📊 Cumplimiento</div>
        <div style="font-size: 34px; font-weight: 700; color: ${rendimiento.porcentaje >= 70 ? '#2d7a4f' : rendimiento.porcentaje >= 40 ? '#b36a00' : '#c0392b'};">${rendimiento.porcentaje.toFixed(0)}%</div>
        <div style="background: #e0e4e8; border-radius: 6px; height: 8px; overflow: hidden; margin-top: 10px;">
          <div style="background: ${rendimiento.porcentaje >= 70 ? '#28a745' : rendimiento.porcentaje >= 40 ? '#fd7e14' : '#dc3545'}; height: 100%; width: ${Math.min(rendimiento.porcentaje, 100)}%; border-radius: 6px;"></div>
        </div>
      </div>
      <div style="flex: 1; background: #fff8f0; border-radius: 10px; padding: 18px 20px; border: 1px solid #fde8c8;">
        <div style="font-size: 11px; font-weight: 600; letter-spacing: 1px; color: #8a6a3a; text-transform: uppercase; margin-bottom: 10px;">📦 Sin Stock</div>
        <div style="font-size: 34px; font-weight: 700; color: ${rendimiento.noStockPct >= 20 ? '#c0392b' : rendimiento.noStockPct >= 10 ? '#b36a00' : '#2d7a4f'};">${rendimiento.noStockPct.toFixed(1)}%</div>
        <div style="background: #fde8c8; border-radius: 6px; height: 8px; overflow: hidden; margin-top: 10px;">
          <div style="background: ${rendimiento.noStockPct >= 20 ? '#dc3545' : rendimiento.noStockPct >= 10 ? '#fd7e14' : '#28a745'}; height: 100%; width: ${Math.min(rendimiento.noStockPct, 100)}%; border-radius: 6px;"></div>
        </div>
      </div>
    </div>
    `}

    <div style="margin: 25px 0;">
      <h3 style="color: #444; font-size: 15px; font-weight: 500; border-bottom: 2px solid #6a8a9a; padding-bottom: 8px; margin-bottom: 12px;">🏆 Ranking de Sucursales</h3>
      <pre style="background: #f8f9fa; padding: 12px 15px; border-radius: 8px; font-family: 'Consolas', monospace; font-size: 12px; overflow-x: auto; border: 1px solid #e9ecef; color: #555;">${ranking}</pre>
    </div>

    <div style="text-align: center; margin: 25px 0;">
      <a href="https://seguimientodeinv.replit.app/" style="display: inline-block; background: #4a5d6a; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 15px;">
        📋 Ir al Sistema de Muestreo
      </a>
    </div>
    <p style="color: #888; font-size: 11px; text-align: center; margin-top: 25px;">
      Recordatorios automáticos: Lunes (todas), Miércoles (&lt;70%), Viernes (&lt;40%)<br>
      Sistema de Seguimiento de Inventarios - Grupo Crisa
    </p>
  </div>
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
        server.sendmail(SMTP_USER, ["${destinatario}"], msg.as_string())
        server.quit()
        print("OK: ${rendimiento.sucursal}")
    else:
        print("ERROR: SMTP_PASSWORD no configurada")
except Exception as e:
    print(f"ERROR: {e}")
`;

    const resultado = await ejecutarPython(pythonCode);
    if (resultado.salida.includes('OK:')) {
      enviados.push(rendimiento.sucursal);
    } else {
      console.error(`[Test] Error enviando para ${rendimiento.sucursal}:`, resultado.salida);
    }
  }

  return { enviados: enviados.length, sucursales: enviados };
}

export { enviarRecordatoriosMuestreo, enviarReporteSemanal, enviarMailPrueba };
