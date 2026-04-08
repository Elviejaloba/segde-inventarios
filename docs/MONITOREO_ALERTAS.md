# Monitoreo y Alertas

El monitoreo se ejecuta desde GitHub Actions (`.github/workflows/monitor.yml`) cada 30 minutos.

## Que valida

1. Salud de API en `GET /api/health`.
2. Frescura de sincronizacion en `GET /sync-info`.

## Secrets/Variables requeridas en GitHub

- `MONITOR_BASE_URL` (Secret): URL base publica de la app (Railway).
- `BRIDGE_API_KEY_MONITOR` (Secret): API key para consultar `/sync-info`.
- `MONITOR_MAX_SYNC_HOURS` (Variable, opcional): umbral maximo de atraso. Default: `36`.
- `MONITOR_CHECK_SYNC` (Variable, opcional): `true|false`. Default: `true`.

## Comportamiento de alertas

1. Si falla el monitoreo, se crea/actualiza un issue: `Monitor Alert: healthcheck failed`.
2. Si vuelve a estado sano, el issue se comenta y se cierra automaticamente.

## Script usado

- `scripts/monitor/healthcheck.mjs`
