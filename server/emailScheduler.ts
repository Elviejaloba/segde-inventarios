import { spawn } from 'child_process';
import path from 'path';

const DESTINATARIOS = [
  "adolfotripodi@textilcrisa.com",
  "carotripodi@textilcrisa.com",
  "florenciatripodi@textilcrisa.com",
  "gerencia@textilcrisa.com",
  "cristinatripodi@textilcrisa.com",
  "lreyes@textilcrisa.com",
  "vaninaprospero@textilcrisa.com",
  "gustavoferrari@textilcrisa.com"
];

let schedulerInterval: NodeJS.Timeout | null = null;

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

function enviarReportePython(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[EmailScheduler] Ejecutando envío de reporte a ${DESTINATARIOS.length} destinatarios...`);
    
    const pythonScript = path.join(process.cwd(), 'email_ajustes_report.py');
    const destinatariosStr = DESTINATARIOS.join(',');
    
    const pythonCode = `
import sys
sys.path.insert(0, '.')
from email_ajustes_report import enviar_reporte

destinatarios = "${destinatariosStr}".split(',')
exito, mensaje = enviar_reporte(destinatarios, dias=30)
print(f"Resultado: {'Exitoso' if exito else 'Error'} - {mensaje}")
`;
    
    const proc = spawn('python', ['-c', pythonCode], {
      cwd: process.cwd(),
      env: process.env
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`[EmailScheduler] Reporte enviado exitosamente: ${stdout}`);
        resolve();
      } else {
        console.error(`[EmailScheduler] Error al enviar reporte: ${stderr}`);
        reject(new Error(stderr));
      }
    });
  });
}

function scheduleNext() {
  const nextRun = getNextMondayAt9AM();
  const msUntilNext = nextRun.getTime() - Date.now();
  
  console.log(`[EmailScheduler] Próximo envío programado: ${nextRun.toLocaleString('es-AR')}`);
  console.log(`[EmailScheduler] Tiempo hasta próximo envío: ${Math.round(msUntilNext / 1000 / 60 / 60)} horas`);
  
  schedulerInterval = setTimeout(async () => {
    try {
      await enviarReportePython();
    } catch (error) {
      console.error('[EmailScheduler] Error en envío programado:', error);
    }
    scheduleNext();
  }, msUntilNext);
}

export function iniciarScheduler() {
  console.log('[EmailScheduler] Iniciando scheduler de emails semanales...');
  console.log(`[EmailScheduler] Destinatarios configurados: ${DESTINATARIOS.length}`);
  DESTINATARIOS.forEach(d => console.log(`  - ${d}`));
  
  scheduleNext();
  
  console.log('[EmailScheduler] Scheduler activo - emails cada lunes a las 9:00 AM');
}

export function detenerScheduler() {
  if (schedulerInterval) {
    clearTimeout(schedulerInterval);
    schedulerInterval = null;
    console.log('[EmailScheduler] Scheduler detenido');
  }
}
