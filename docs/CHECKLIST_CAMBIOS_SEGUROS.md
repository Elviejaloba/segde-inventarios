# Checklist de Cambios Seguros

Usar este checklist antes de mergear y antes de desplegar.

## A. Antes de codificar

- [ ] Cambio definido (que se toca y que no se toca).
- [ ] Riesgo clasificado: bajo / medio / alto.
- [ ] Plan de rollback definido.
- [ ] Variables/secretos identificados.

## B. Durante implementacion

- [ ] Trabajo en rama `dev` (no en `main`).
- [ ] Sin hardcode de secretos.
- [ ] Sin comandos destructivos.
- [ ] Logs utiles para diagnostico.

## C. Antes de Pull Request

- [ ] Prueba local minima realizada.
- [ ] Build del proyecto OK.
- [ ] Documentacion actualizada si cambia operacion.
- [ ] Archivos sensibles fuera de commit (`.env`, credenciales, logs).

## D. Antes de merge a `main`

- [ ] CI en verde.
- [ ] Cambios de base de datos revisados.
- [ ] Bridge compatible con backend (API key, endpoints, payload).
- [ ] Aprobacion de al menos un revisor.

## E. Post deploy (Railway)

- [ ] `/api/health` responde OK.
- [ ] Endpoints criticos responden.
- [ ] `sync-info` consistente (conteos y fechas esperadas).
- [ ] Sin errores nuevos en logs.

## F. Si algo sale mal

- [ ] Ejecutar rollback del ultimo cambio.
- [ ] Notificar incidente y alcance.
- [ ] Congelar nuevos deploys.
- [ ] Registrar causa raiz y accion preventiva.
