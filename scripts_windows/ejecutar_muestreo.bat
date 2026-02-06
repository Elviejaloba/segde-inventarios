@echo off
REM =============================================
REM RECORDATORIOS DE MUESTREO - Grupo Crisa
REM Programar en Task Scheduler: Lun/Mie/Vie 9:00 AM
REM =============================================
cd /d "%~dp0"
echo [%date% %time%] Ejecutando recordatorios de muestreo...
python notificacion_muestreo.py >> logs_muestreo.txt 2>&1
echo [%date% %time%] Finalizado >> logs_muestreo.txt
echo Listo.
