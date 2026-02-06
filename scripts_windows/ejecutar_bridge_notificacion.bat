@echo off
REM =============================================
REM NOTIFICACIÓN DE BRIDGE - Grupo Crisa
REM Agregar al final del .bat del bridge existente
REM =============================================
cd /d "%~dp0"
echo [%date% %time%] Enviando notificacion de bridge...
python notificacion_bridge.py exito "Sincronización completada" >> logs_bridge.txt 2>&1
echo [%date% %time%] Finalizado >> logs_bridge.txt
echo Listo.
