# Flujo de Actualizacion Segura

## Objetivo

Estandarizar como se actualiza el sistema sin romper servicios locales, sin duplicar datos y con rollback claro.

## Flujo funcional de datos

```text
SQL Server local
  -> bridge_servicio.py (lotes + retries + outbox)
  -> POST /sync (X-Idempotency-Key)
  -> API backend (idempotencia en /sync)
  -> Base de datos app
  -> Frontend (home/reportes/muestreos)
```

## Flujo de cambios de codigo

1. Desarrollar y probar en `dev`.
2. Levantar local en puerto no conflictivo (ejemplo: `5001`).
3. Ejecutar `npm run build`.
4. Validar vistas desktop y mobile (home/reportes/muestreos).
5. Confirmar que no hay secretos en cambios (`.env`, keys, tokens).
6. Push a `origin/dev`.
7. Abrir/actualizar PR `dev -> main` con checklist completo.
8. Esperar CI en verde + 1 aprobacion.
9. Merge a `main` (sin force push).
10. Railway despliega desde `main`.

## Reglas para no romper nada

1. No tocar `main` directo.
2. No usar operaciones destructivas en datos productivos.
3. No remover validaciones de idempotencia del bridge ni de `/sync`.
4. Mantener outbox habilitado para tolerancia a fallas de red/API.
5. Si un endpoint externo falla en local, usar fallback controlado para no romper UI.
6. Cualquier cambio de comportamiento debe incluir rollback documentado.

## Manejo de fallas

1. Si falla `POST /sync`, el bridge reintenta.
2. Si agota retries, guarda lote en `outbox`.
3. En la proxima corrida, reprocesa outbox antes de enviar lotes nuevos.
4. Si hay incidente, seguir `RUNBOOK_INCIDENTES.md`.

## Checklist rapido pre-merge

1. Build OK.
2. Mobile responsive OK.
3. Sin conflictos de puerto local.
4. PR checklist completo.
5. Plan de rollback escrito.
