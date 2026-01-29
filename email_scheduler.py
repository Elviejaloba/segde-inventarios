"""
Scheduler de Reportes Semanales - GRUPO CRISA
Envía reportes automáticos todos los lunes a las 9:00 AM
"""

import schedule
import time
import logging
from datetime import datetime
from email_ajustes_report import enviar_reporte

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

DESTINATARIOS = [
    "adolfotripodi@textilcrisa.com",
    "carotripodi@textilcrisa.com",
    "florenciatripodi@textilcrisa.com",
    "gerencia@textilcrisa.com",
    "cristinatripodi@textilcrisa.com",
    "lreyes@textilcrisa.com",
    "vaninaprospero@textilcrisa.com",
    "gustavoferrari@textilcrisa.com"
]

def enviar_reporte_semanal():
    """Envía el reporte semanal a todos los destinatarios"""
    logger.info(f"Iniciando envío de reporte semanal - {datetime.now()}")
    
    try:
        exito, mensaje = enviar_reporte(
            destinatarios=DESTINATARIOS,
            dias=30
        )
        
        if exito:
            logger.info(f"Reporte enviado exitosamente a {len(DESTINATARIOS)} destinatarios")
        else:
            logger.error(f"Error al enviar reporte: {mensaje}")
            
    except Exception as e:
        logger.error(f"Excepción al enviar reporte: {str(e)}")

def main():
    """Configura y ejecuta el scheduler"""
    logger.info("Iniciando scheduler de reportes semanales...")
    logger.info(f"Destinatarios configurados: {len(DESTINATARIOS)}")
    
    schedule.every().monday.at("09:00").do(enviar_reporte_semanal)
    
    logger.info("Scheduler configurado: Lunes a las 9:00 AM")
    logger.info("Próxima ejecución: " + str(schedule.next_run()))
    
    while True:
        schedule.run_pending()
        time.sleep(60)

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--ahora":
        logger.info("Ejecutando envío inmediato...")
        enviar_reporte_semanal()
    else:
        main()
