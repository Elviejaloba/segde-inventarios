# Runbook de Incidentes (Borrado/Error)

Procedimiento rapido ante incidentes en produccion.

## 1) Contencion inmediata

1. Pausar cambios y deploys nuevos.
2. Confirmar impacto: datos, API, bridge o todo.
3. Preservar evidencia: logs, hora, endpoint, commit.

## 2) Diagnostico rapido

1. Verificar estado de Railway (`/api/health`).
2. Revisar ultimo deploy y ultimo commit mergeado.
3. Revisar logs del bridge local y respuesta de `/sync-info`.
4. Determinar si hay perdida de datos o solo degradacion.

## 3) Recuperacion

### Caso A: fallo de codigo/deploy

1. Revertir commit en `main`.
2. Deploy automatico tras revert.
3. Confirmar salud del servicio y endpoints criticos.

### Caso B: fallo de sincronizacion bridge

1. Verificar `TARGET_BASE_URL` y `BRIDGE_API_KEY`.
2. Ejecutar sync manual controlada.
3. Confirmar conteos en `/sync-info`.

### Caso C: borrado/corrupcion de datos

1. Detener operaciones que escriben.
2. Restaurar desde backup/snapshot.
3. Validar consistencia por tablas criticas.
4. Rehabilitar bridge y validar incremental.

## 4) Comunicacion minima

1. Reportar inicio de incidente (hora y alcance).
2. Reportar mitigacion aplicada.
3. Reportar cierre y estado final.

## 5) Postmortem (obligatorio)

1. Causa raiz.
2. Que fallo en controles.
3. Acciones preventivas concretas.
4. Fecha objetivo y responsable por accion.

## Matriz de severidad

- Sev 1: caida total o perdida de datos.
- Sev 2: funcionalidad critica degradada.
- Sev 3: error parcial con workaround.
