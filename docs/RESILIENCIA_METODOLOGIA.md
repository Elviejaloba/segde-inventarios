# Metodologia de Resiliencia (Operacion y Cambios)

Este documento define como operar y evolucionar el sistema minimizando borrados accidentales, caidas y errores evitables.

## Objetivos

1. Evitar perdida de datos.
2. Evitar cambios riesgosos sin control.
3. Garantizar recuperacion rapida ante incidentes.
4. Mantener continuidad del bridge local + app cloud.

## Alcance

- Backend/API en Railway.
- Base de datos PostgreSQL (Railway).
- Bridge local Windows (conexion a SQL Server Tango).
- Integraciones de email y Dropbox.

## Principios

1. `main` es solo produccion.
2. Todo cambio pasa por PR desde `dev`.
3. Sin secretos en git.
4. Sin operaciones destructivas sin backup y aprobacion.
5. Siempre con plan de rollback antes de desplegar.

## Politica Anti-Borrado

No ejecutar en produccion sin aprobacion explicita:

- `TRUNCATE TABLE`
- `DELETE` sin `WHERE`
- `DROP TABLE`, `DROP COLUMN`
- `git push --force` sobre `main`
- `git reset --hard` en ramas compartidas

Si una tarea requiere alguna de estas acciones:

1. Crear backup/snapshot previo.
2. Documentar motivo y alcance.
3. Ejecutar en ventana de mantenimiento.
4. Validar resultado y registrar evidencia.

## Flujo Seguro de Cambios

1. Desarrollar en `dev`.
2. Abrir PR `dev -> main`.
3. Completar checklist de PR (ver `.github/PULL_REQUEST_TEMPLATE.md`).
4. CI verde.
5. Merge.
6. Deploy automatico en Railway.
7. Verificacion post-deploy.

## Resiliencia de Datos (Bridge + Sync)

1. `BRIDGE_API_KEY` debe ser igual en bridge y backend.
2. El bridge siempre apunta a `TARGET_BASE_URL` configurable.
3. Ejecutar sincronizacion manual controlada antes de cambios grandes.
4. Confirmar conteos en `/sync-info` luego de cada ejecucion critica.
5. Si falla sync, no reintentar a ciegas: revisar logs y causa.

## Backups y Recuperacion

1. Mantener backups de PostgreSQL (automaticos en Railway + export periodico).
2. Guardar configuraciones operativas del bridge fuera del repo.
3. Verificar periodicamente que un restore sea posible.

## Definiciones Operativas

- RPO objetivo: hasta 24h.
- RTO objetivo: hasta 2h para restablecer servicio web.
- Severidad alta: perdida/corrupcion de datos o caida total.

## Referencias

- `GIT_FLOW.md`
- `RAILWAY_DEPLOY.md`
- `docs/CHECKLIST_CAMBIOS_SEGUROS.md`
- `docs/RUNBOOK_INCIDENTES.md`
