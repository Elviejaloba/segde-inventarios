## Resumen

Describe brevemente que cambia y por que.

## Tipo de cambio

- [ ] Feature
- [ ] Fix
- [ ] Refactor
- [ ] Documentacion
- [ ] Operacion/Infra

## Validaciones

- [ ] Build local ejecutado.
- [ ] Prueba funcional minima realizada.
- [ ] No se incluyeron secretos ni archivos sensibles.
- [ ] No hay operaciones destructivas.

## Resiliencia y seguridad

- [ ] Si hubo cambio de datos, existe backup/rollback documentado.
- [ ] Si hubo cambio de bridge, se valido compatibilidad con `/sync`.
- [ ] Se actualizaron `.md` operativos si aplica.

## Checklist anti-borrado

- [ ] No use `DELETE` sin `WHERE`.
- [ ] No use `TRUNCATE`/`DROP` en produccion.
- [ ] No requiere `push --force` a `main`.

## Rollback

Describe en 1-3 pasos como volver atras este cambio.
