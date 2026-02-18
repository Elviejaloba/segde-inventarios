@echo off
REM =============================================
REM EJECUTAR BRIDGE - Grupo Crisa
REM =============================================
cd /d "%~dp0"
echo [%date% %time%] Iniciando sincronización manual...
C:\Users\lreyes\AppData\Local\Programs\Python\Python311\python.exe bridge_servicio.py --ahora
echo [%date% %time%] Sincronización finalizada.
pause
