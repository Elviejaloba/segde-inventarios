@echo off
REM =============================================
REM REPORTE EJECUTIVO SEMANAL - Grupo Crisa
REM Programar en Task Scheduler: Lunes 9:00 AM
REM =============================================
cd /d "%~dp0"
echo [%date% %time%] Ejecutando reporte ejecutivo...
python reporte_ejecutivo.py >> logs_reporte.txt 2>&1
echo [%date% %time%] Finalizado >> logs_reporte.txt
echo Listo.
