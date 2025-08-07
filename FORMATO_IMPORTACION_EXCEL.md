# 📊 Formato de Importación de Ajustes - Excel

## Estructura de Base de Datos Actualizada

La tabla `ajustes_sucursales` ahora incluye las siguientes columnas:

| Columna | Tipo | Descripción | Requerida |
|---------|------|-------------|-----------|
| `id` | INTEGER | ID automático (no incluir en Excel) | - |
| `Sucursal` | TEXT | Nombre de la sucursal | ✅ |
| `Comprobante` | TEXT | Número de comprobante | ✅ |
| `FechaMovimiento` | DATE | Fecha del movimiento | ⚪ |
| `TipoMovimiento` | TEXT | Tipo de movimiento (ej: "Ajuste", "E") | ⚪ |
| `Codigo` | TEXT | Código del artículo (Cód. Artículo) | ✅ |
| `Articulo` | TEXT | Descripción del artículo | ⚪ |
| `Diferencia` | NUMERIC | Cantidad/diferencia | ✅ |

## Formato de Excel Requerido

### Columnas del Excel (en este orden exacto):

```
Comprobante | Sucursal | Nro. comprobante | Fecha movimiento | Tipo de Movimiento | Cód. Artículo | Artículo | Cantidad
```

### Ejemplo de Datos:

| Comprobante | Sucursal | Nro. comprobante | Fecha movimiento | Tipo de Movimiento | Cód. Artículo | Artículo | Cantidad |
|-------------|----------|------------------|------------------|-------------------|---------------|----------|----------|
| AJU | CRISA 2 | 000000000003 | 26/2/2025 | E | TF34RL 29 | CREPPE SATEN LIVIANO | 82.00 |
| AJU | LA TIJERA SAN LUIS | 000033334611 | 17/3/2025 | E | TI505 32 | POLAR ANTIPIL COMUN 1.50 BORDE | 0.96 |
| AJU | LA TIJERA LUJAN | 000140000002 | 7/4/2025 | E | TV18P 05 | BRODERIE DE PUNTO | 0.23 |

## Nombres de Sucursales Válidos

El sistema mapea automáticamente los siguientes nombres:

| Nombre en Excel | Nombre en Sistema |
|-----------------|-------------------|
| CRISA 2, CRISA2 | Crisa2 |
| LA TIJERA SAN LUIS, T.LUIS | T.Luis |
| LA TIJERA LUJAN, T.LUJAN | T.Lujan |
| LA TIJERA SAN MARTIN, T.S.MARTIN | T.S.Martin |
| LA TIJERA MAIPU, T.MAIPU | T.Maipu |
| LA TIJERA TUNUYAN, T.TUNUYAN | T.Tunuyan |
| LA TIJERA SAN RAFAEL, T.SRAFAEL | T.Srafael |
| T.MENDOZA, LA TIJERA MENDOZA | T.Mendoza |
| T.SJUAN, LA TIJERA SAN JUAN | T.Sjuan |

## Formato de Fechas

- **Excel**: Puede usar fechas de Excel (números seriales) o texto en formato DD/MM/YYYY
- **Ejemplos válidos**: `26/2/2025`, `17/03/2025`, `7/4/2025`

## Uso del Script de Importación

### 1. Preparar el archivo Excel:
- Asegúrate de que tiene todas las columnas requeridas
- Guarda el archivo en formato `.xlsx` o `.xls`
- Coloca el archivo en la carpeta raíz del proyecto

### 2. Ejecutar la importación:
```bash
python import_ajustes_completo.py
```

### 3. El script automáticamente:
- ✅ Detecta archivos Excel en el directorio
- ✅ Mapea nombres de sucursales automáticamente  
- ✅ Convierte fechas de Excel a formato DD/MM/YYYY
- ✅ Verifica duplicados antes de insertar
- ✅ Muestra estadísticas de la importación

## Verificación de Datos

### Después de la importación:
1. **Streamlit Reports**: Visita `http://localhost:8501` para ver reportes actualizados
2. **Base de datos**: Los datos se guardan en PostgreSQL para consultas complejas
3. **Verificación**: El script muestra un resumen completo de la importación

### Validaciones automáticas:
- ❌ **Duplicados**: No inserta registros que ya existen
- ✅ **Formatos**: Convierte automáticamente formatos de fecha y números
- ✅ **Mapeo**: Normaliza nombres de sucursales automáticamente
- ⚠️ **Errores**: Muestra errores detallados si algún registro falla

## Visualización en Reportes

Una vez importados, los datos aparecerán en:

### Reportes de Streamlit:
- **Detalle completo**: Tabla con todas las columnas
- **Análisis por tipo**: Gráficos por tipo de movimiento
- **Top códigos**: Ranking de códigos con mayor movimiento
- **Movimientos significativos**: Alertas sobre valores atípicos
- **Exportación**: Descarga en Excel y CSV

### Frontend React:
- Los datos se sincronizarán automáticamente
- Métricas actualizadas en tiempo real
- Filtros por sucursal y temporada

## Notas Importantes

- 📝 **Columna "Comprobante"**: Se usa tanto la columna "Comprobante" como "Nro. comprobante" para máxima compatibilidad
- 📅 **Fechas opcionales**: Si no hay fecha, el registro se guarda sin fecha
- 🔄 **Sin duplicados**: El sistema previene automáticamente la inserción de duplicados
- 💾 **Backup**: Los datos se guardan permanentemente en PostgreSQL