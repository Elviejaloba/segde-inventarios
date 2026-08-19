import { type Ajuste, type InsertAjuste, type MuestreoFileStatus, type MuestreoFileStatusRecord } from "@shared/schema";
import { pool } from "./db";

const databaseUrl = process.env.DATABASE_URL;
const runningWithoutDb = !databaseUrl;

if (runningWithoutDb) {
  console.warn("[Storage] DATABASE_URL is not set. Running in no-DB mode with empty results.");
}

const buildTaggedQuery = (strings: TemplateStringsArray, values: any[]) => {
  let text = "";
  const params: any[] = [];

  strings.forEach((part, index) => {
    text += part;
    if (index < values.length) {
      params.push(values[index]);
      text += `$${params.length}`;
    }
  });

  return { text, params };
};

const sql: any = async (queryOrStrings: string | TemplateStringsArray, ...values: any[]) => {
  if (runningWithoutDb) return [];

  if (typeof queryOrStrings === "string") {
    const params = values.length === 1 && Array.isArray(values[0])
      ? values[0]
      : values
    ;
    const result = await (pool as any).query(queryOrStrings, params);
    return result.rows;
  }

  const { text, params } = buildTaggedQuery(queryOrStrings, values);
  const result = await (pool as any).query(text, params);
  return result.rows;
};

let telaRindesReferenceLabelSupport: boolean | null = null;

const hasTelaRindesReferenceLabel = async () => {
  if (runningWithoutDb) return false;
  if (telaRindesReferenceLabelSupport !== null) return telaRindesReferenceLabelSupport;

  try {
    const rows = await sql(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'tela_rindes'
        AND column_name = 'reference_label'
      LIMIT 1
    `);
    telaRindesReferenceLabelSupport = rows.length > 0;
  } catch (error) {
    console.error('Error checking tela_rindes.reference_label support:', error);
    telaRindesReferenceLabelSupport = false;
  }

  return telaRindesReferenceLabelSupport;
};

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // Ajustes methods
  getAjustes(sucursal?: string): Promise<Ajuste[]>;
  getAjustesBySucursal(sucursal: string): Promise<Ajuste[]>;
  createAjuste(ajuste: InsertAjuste): Promise<Ajuste>;
  getAjustesStats(): Promise<{
    totalAjustes: number;
    totalUnidades: number;
    sucursales: string[];
    porSucursal: Array<{ sucursal: string; count: number; total: number; }>;
  }>;
  
  // Análisis valorizado
  getAnalisisValorizado(sucursal?: string, periodo?: string, fechaDesde?: string, fechaHasta?: string): Promise<any>;
  getAnalisisValorizadoConCosto(sucursal?: string): Promise<any>;
  getHistorialAjustesCodigo(codigo: string, sucursal?: string): Promise<any>;
  getPuntoEquilibrio(sucursal?: string): Promise<any>;
  searchRindeArticles(query: string): Promise<any[]>;
  getActiveTelaRindes(options?: { includeInactive?: boolean }): Promise<any[]>;
  getTelaRinde(articleCode: string): Promise<any | null>;
  saveTelaRinde(payload: any): Promise<any>;
  getCodigosArticulos(): Promise<string[]>;
  getMuestreosFileStatuses(): Promise<MuestreoFileStatusRecord[]>;
  upsertMuestreoFileStatus(fileId: string, payload: { filePath?: string | null; status: MuestreoFileStatus; updatedBy?: string | null }): Promise<MuestreoFileStatusRecord>;
}

export class PostgreSQLStorage implements IStorage {
  async getAjustes(sucursal?: string): Promise<Ajuste[]> {
    try {
      let query = 'SELECT * FROM ajustes_sucursales';
      const params: any[] = [];
      
      if (sucursal) {
        query += ' WHERE "Sucursal" = $1';
        params.push(sucursal);
      }
      
      query += ' ORDER BY "FechaMovimiento" DESC NULLS LAST LIMIT 1000';
      
      const result = await sql(query, params);
      return result.map((row: any) => ({
        id: row.id,
        Sucursal: row.Sucursal,
        Comprobante: row.Comprobante,
        FechaMovimiento: row.FechaMovimiento,
        TipoMovimiento: row.TipoMovimiento,
        Codigo: row.Codigo,
        Articulo: row.Articulo,
        Diferencia: parseFloat(row.Diferencia)
      }));
    } catch (error) {
      console.error('Error getting ajustes:', error);
      return [];
    }
  }

  async getAjustesBySucursal(sucursal: string): Promise<Ajuste[]> {
    return this.getAjustes(sucursal);
  }

  async createAjuste(insertAjuste: InsertAjuste): Promise<Ajuste> {
    try {
      const result = await sql`
        INSERT INTO ajustes_sucursales ("Sucursal", "Comprobante", "FechaMovimiento", "TipoMovimiento", "Codigo", "Articulo", "Diferencia")
        VALUES (${insertAjuste.Sucursal}, ${insertAjuste.Comprobante}, ${insertAjuste.FechaMovimiento}, ${insertAjuste.TipoMovimiento}, ${insertAjuste.Codigo}, ${insertAjuste.Articulo}, ${insertAjuste.Diferencia})
        RETURNING *
      `;
      
      const row = result[0];
      return {
        id: row.id,
        Sucursal: row.Sucursal,
        Comprobante: row.Comprobante,
        FechaMovimiento: row.FechaMovimiento,
        TipoMovimiento: row.TipoMovimiento,
        Codigo: row.Codigo,
        Articulo: row.Articulo,
        Diferencia: parseFloat(row.Diferencia)
      };
    } catch (error) {
      console.error('Error creating ajuste:', error);
      throw error;
    }
  }

  async getAjustesStats(): Promise<{
    totalAjustes: number;
    totalUnidades: number;
    sucursales: string[];
    porSucursal: Array<{ sucursal: string; count: number; total: number; }>;
  }> {
    try {
      // Total de ajustes
      const totalResult = await sql`SELECT COUNT(*) as total FROM ajustes_sucursales`;
      const totalAjustes = parseInt(totalResult[0].total);

      // Total unidades
      const unidadesResult = await sql`SELECT SUM(ABS("Diferencia")) as total FROM ajustes_sucursales`;
      const totalUnidades = parseFloat(unidadesResult[0].total) || 0;

      // Sucursales únicas
      const sucursalesResult = await sql`SELECT DISTINCT "Sucursal" FROM ajustes_sucursales WHERE "Sucursal" IS NOT NULL`;
      const sucursales = sucursalesResult.map((row: any) => row.Sucursal);

      // Stats por sucursal
      const porSucursalResult = await sql`
        SELECT "Sucursal" as sucursal, 
               COUNT(*) as count, 
               SUM(ABS("Diferencia")) as total
        FROM ajustes_sucursales 
        WHERE "Sucursal" IS NOT NULL
        GROUP BY "Sucursal"
        ORDER BY count DESC
      `;
      
      const porSucursal = porSucursalResult.map((row: any) => ({
        sucursal: row.sucursal,
        count: parseInt(row.count),
        total: parseFloat(row.total) || 0
      }));

      return {
        totalAjustes,
        totalUnidades,
        sucursales,
        porSucursal
      };
    } catch (error) {
      console.error('Error getting ajustes stats:', error);
      return {
        totalAjustes: 0,
        totalUnidades: 0,
        sucursales: [],
        porSucursal: []
      };
    }
  }

  async getAjustesPorUnidadMedida(sucursal?: string, periodo?: string): Promise<any> {
    try {
      let fechaFilter = '';
      const now = new Date();
      
      switch (periodo) {
        case '2025':
          fechaFilter = `AND "FechaMovimiento" >= '2025-01-01' AND "FechaMovimiento" <= '2025-12-31'`;
          break;
        case '2026':
          fechaFilter = `AND "FechaMovimiento" >= '2026-01-01'`;
          break;
        case 'ultimo-trimestre':
          const trimestre = new Date(now);
          trimestre.setMonth(trimestre.getMonth() - 3);
          fechaFilter = `AND "FechaMovimiento" >= '${trimestre.toISOString().split('T')[0]}'`;
          break;
        case 'ultimo-semestre':
          const semestre = new Date(now);
          semestre.setMonth(semestre.getMonth() - 6);
          fechaFilter = `AND "FechaMovimiento" >= '${semestre.toISOString().split('T')[0]}'`;
          break;
      }

      const sucursalFilter = sucursal ? `AND "Sucursal" = '${sucursal}'` : '';

      const query = `
        SELECT 
          "UnidadMedida",
          COUNT(DISTINCT "Codigo") as articulos,
          COUNT(*) as registros,
          SUM(ABS("Diferencia")) as total_ajustado
        FROM ajustes_sucursales
        WHERE "FechaMovimiento" IS NOT NULL
        ${sucursalFilter}
        ${fechaFilter}
        GROUP BY "UnidadMedida"
        ORDER BY total_ajustado DESC
      `;

      // Query para datos de 2025 (baseline para comparación)
      const query2025 = `
        SELECT 
          "UnidadMedida",
          SUM(ABS("Diferencia")) as total_ajustado_2025
        FROM ajustes_sucursales
        WHERE "FechaMovimiento" IS NOT NULL
        AND "FechaMovimiento" >= '2025-01-01' AND "FechaMovimiento" <= '2025-12-31'
        ${sucursalFilter}
        GROUP BY "UnidadMedida"
      `;

      const [result, result2025] = await Promise.all([sql(query), sql(query2025)]);
      
      return result.map((row: any) => {
        const data2025 = result2025.find((r: any) => r.UnidadMedida === row.UnidadMedida);
        const totalActual = parseFloat(row.total_ajustado);
        const total2025 = data2025 ? parseFloat(data2025.total_ajustado_2025) : 0;
        const variacion = total2025 > 0 ? ((totalActual - total2025) / total2025) * 100 : 0;
        
        return {
          unidadMedida: row.UnidadMedida || 'UN',
          articulos: parseInt(row.articulos),
          registros: parseInt(row.registros),
          totalAjustado: totalActual,
          total2025: total2025,
          variacionPorcentaje: variacion
        };
      });
    } catch (error) {
      console.error('Error getting ajustes por unidad:', error);
      return [];
    }
  }

  async getAnalisisValorizado(sucursal?: string, periodo?: string, fechaDesde?: string, fechaHasta?: string): Promise<any> {
    try {
      let fechaInicio = '';
      let fechaFin = '';
      const now = new Date();
      
      if (fechaDesde && fechaHasta) {
        fechaInicio = fechaDesde;
        fechaFin = fechaHasta;
      } else {
        switch (periodo) {
          case '2025':
            fechaInicio = '2025-01-01';
            fechaFin = '2025-12-31';
            break;
          case '2026':
            fechaInicio = '2026-01-01';
            fechaFin = '2099-12-31';
            break;
          case 'ultimo-trimestre':
            const trimestre = new Date(now);
            trimestre.setMonth(trimestre.getMonth() - 3);
            fechaInicio = trimestre.toISOString().split('T')[0];
            fechaFin = now.toISOString().split('T')[0];
            break;
          case 'ultimo-semestre':
            const semestre = new Date(now);
            semestre.setMonth(semestre.getMonth() - 6);
            fechaInicio = semestre.toISOString().split('T')[0];
            fechaFin = now.toISOString().split('T')[0];
            break;
          default:
            break;
        }
      }

      const periodoFilter = fechaInicio && fechaFin 
        ? `AND a."FechaMovimiento" >= '${fechaInicio}' AND a."FechaMovimiento" <= '${fechaFin}'`
        : '';
      const periodoFilterNoAlias = fechaInicio && fechaFin
        ? `AND "FechaMovimiento" >= '${fechaInicio}' AND "FechaMovimiento" <= '${fechaFin}'`
        : '';

      // Análisis valorizado agrupando por código base (sin sufijo de color 01-32)
      // Lógica: TI400I 01 al TI400I 32 son el mismo producto, se consolidan
      // % Pérdida = Valorizado Pérdida / Total Vendido en el período desde último ajuste
      let query = `
        WITH codigo_base AS (
          -- Extraer código base removiendo el sufijo de color (últimos 2 dígitos)
          SELECT 
            a."Sucursal",
            a."Codigo" as codigo_original,
            TRIM(REGEXP_REPLACE(a."Codigo", '\\s*\\d{2}$', '')) as codigo_base,
            a."Articulo",
            a."FechaMovimiento",
            a."TipoMovimiento",
            a."Diferencia",
            a."UnidadMedida",
            EXTRACT(YEAR FROM a."FechaMovimiento") as anio
          FROM ajustes_sucursales a
          WHERE a."FechaMovimiento" IS NOT NULL
          AND a."Sucursal" != 'CRISA 3'
          ${sucursal ? 'AND a."Sucursal" = $1' : ''}
          ${periodoFilter}
        ),
        unidades_por_codigo AS (
          SELECT 
            "Sucursal",
            codigo_base,
            SUM(CASE WHEN COALESCE("UnidadMedida", 'UN') = 'UN' THEN "Diferencia" ELSE 0 END) as total_un,
            SUM(CASE WHEN COALESCE("UnidadMedida", 'UN') = 'MTS' THEN "Diferencia" ELSE 0 END) as total_mts,
            SUM(CASE WHEN COALESCE("UnidadMedida", 'UN') = 'KG' THEN "Diferencia" ELSE 0 END) as total_kg
          FROM codigo_base
          GROUP BY "Sucursal", codigo_base
        ),
        ajustes_2025 AS (
          SELECT 
            "Sucursal",
            codigo_base,
            MAX("FechaMovimiento") as fecha_ajuste_2025,
            SUM("Diferencia") as diferencia_2025,
            COUNT(*) as cant_ajustes_2025
          FROM codigo_base
          WHERE anio = 2025
          GROUP BY "Sucursal", codigo_base
        ),
        ajustes_2026 AS (
          SELECT 
            "Sucursal",
            codigo_base,
            MAX("FechaMovimiento") as fecha_ajuste_2026,
            SUM("Diferencia") as diferencia_2026,
            COUNT(*) as cant_ajustes_2026
          FROM codigo_base
          WHERE anio = 2026
          GROUP BY "Sucursal", codigo_base
        ),
        consolidado AS (
          SELECT 
            COALESCE(a25."Sucursal", a26."Sucursal") as "Sucursal",
            COALESCE(a25.codigo_base, a26.codigo_base) as codigo_base,
            a25.fecha_ajuste_2025,
            COALESCE(a25.diferencia_2025, 0) as diferencia_2025,
            a26.fecha_ajuste_2026,
            COALESCE(a26.diferencia_2026, 0) as diferencia_2026,
            COALESCE(a25.cant_ajustes_2025, 0) + COALESCE(a26.cant_ajustes_2026, 0) as total_ajustes,
            COALESCE(a25.diferencia_2025, 0) + COALESCE(a26.diferencia_2026, 0) as diferencia_consolidada,
            COALESCE(a26.fecha_ajuste_2026, a25.fecha_ajuste_2025) as fecha_ultimo_ajuste
          FROM ajustes_2025 a25
          FULL OUTER JOIN ajustes_2026 a26 
            ON a25."Sucursal" = a26."Sucursal" AND a25.codigo_base = a26.codigo_base
        ),
        articulo_desc AS (
          -- Obtener descripción del artículo
          SELECT DISTINCT ON ("Sucursal", codigo_base)
            "Sucursal",
            codigo_base,
            "Articulo"
          FROM codigo_base
          ORDER BY "Sucursal", codigo_base, "FechaMovimiento" DESC
        ),
        ventas_periodo AS (
          -- Ventas desde el último ajuste hasta hoy, agrupadas por código base
          SELECT 
            v."Sucursal",
            TRIM(REGEXP_REPLACE(v."Codigo", '\\s*\\d{2}$', '')) as codigo_base,
            SUM(v."CantidadVenta") as total_vendido,
            SUM(v."ImporteConIVA") as total_venta_valorizada,
            AVG(v."PrecioConIVA") as precio_promedio
          FROM ventas_sucursales v
          INNER JOIN consolidado c 
            ON v."Sucursal" = c."Sucursal" 
            AND TRIM(REGEXP_REPLACE(v."Codigo", '\\s*\\d{2}$', '')) = c.codigo_base
          WHERE v."Fecha" >= c.fecha_ultimo_ajuste
          ${sucursal ? 'AND v."Sucursal" = $1' : ''}
          GROUP BY v."Sucursal", TRIM(REGEXP_REPLACE(v."Codigo", '\\s*\\d{2}$', ''))
        )
        ,
        precios_historicos AS (
          SELECT 
            v."Sucursal",
            TRIM(REGEXP_REPLACE(v."Codigo", '\\s*\\d{2}$', '')) as codigo_base,
            AVG(v."PrecioConIVA") as precio_promedio
          FROM ventas_sucursales v
          ${sucursal ? 'WHERE v."Sucursal" = $1' : ''}
          GROUP BY v."Sucursal", TRIM(REGEXP_REPLACE(v."Codigo", '\\s*\\d{2}$', ''))
        ),
        costos_base AS (
          SELECT "Codigo", AVG("Costo") as costo_promedio
          FROM costos_articulos
          WHERE "Costo" > 0
          GROUP BY "Codigo"
        )
        SELECT 
          c."Sucursal",
          c.codigo_base as "Codigo",
          COALESCE(ad."Articulo", c.codigo_base) as "Articulo",
          c.total_ajustes,
          ABS(c.diferencia_consolidada) as total_unidades,
          COALESCE(vp.precio_promedio, ph.precio_promedio, cb.costo_promedio, 0) as precio_unitario,
          ABS(c.diferencia_consolidada) * COALESCE(vp.precio_promedio, ph.precio_promedio, cb.costo_promedio, 0) as total_valorizado,
          ABS(c.diferencia_consolidada) * COALESCE(cb.costo_promedio, 0) as total_costo_reposicion,
          c.fecha_ajuste_2025 as primer_ajuste,
          c.fecha_ultimo_ajuste as ultimo_ajuste,
          COALESCE(vp.total_vendido, 0) as total_vendido,
          COALESCE(vp.total_venta_valorizada, 0) as total_venta_valorizada,
          CASE 
            WHEN COALESCE(vp.total_venta_valorizada, 0) > 0 
            THEN LEAST(ROUND((ABS(c.diferencia_consolidada) * COALESCE(vp.precio_promedio, 0) / vp.total_venta_valorizada * 100)::numeric, 2), 100)
            ELSE 0 
          END as porcentaje_perdida,
          CASE 
            WHEN c.fecha_ajuste_2026 IS NULL THEN true
            ELSE false
          END as sin_ajuste_anual,
          c.diferencia_2025,
          c.diferencia_2026,
          COALESCE(uc.total_un, 0) as total_un,
          COALESCE(uc.total_mts, 0) as total_mts,
          COALESCE(uc.total_kg, 0) as total_kg
        FROM consolidado c
        LEFT JOIN ventas_periodo vp ON c."Sucursal" = vp."Sucursal" AND c.codigo_base = vp.codigo_base
        LEFT JOIN precios_historicos ph ON c."Sucursal" = ph."Sucursal" AND c.codigo_base = ph.codigo_base
        LEFT JOIN articulo_desc ad ON c."Sucursal" = ad."Sucursal" AND c.codigo_base = ad.codigo_base
        LEFT JOIN costos_base cb ON c.codigo_base = cb."Codigo"
        LEFT JOIN unidades_por_codigo uc ON c."Sucursal" = uc."Sucursal" AND c.codigo_base = uc.codigo_base
        WHERE c.diferencia_consolidada < 0
        ORDER BY total_valorizado DESC
        LIMIT 500
      `;
      
      const params = sucursal ? [sucursal] : [];
      const resultPromise = sql(query, params);
      
      // Resumen general - agrupando por código base
      const resumenQuery = `
        WITH ventas_base AS (
          SELECT 
            "Sucursal",
            TRIM(REGEXP_REPLACE("Codigo", '\\s*\\d{2}$', '')) as codigo_base,
            AVG("PrecioConIVA") as precio_promedio,
            SUM("ImporteConIVA") as total_importe
          FROM ventas_sucursales
          GROUP BY "Sucursal", TRIM(REGEXP_REPLACE("Codigo", '\\s*\\d{2}$', ''))
        ),
        ajustes_base AS (
          SELECT 
            a."Sucursal",
            TRIM(REGEXP_REPLACE(a."Codigo", '\\s*\\d{2}$', '')) as codigo_base,
            SUM(a."Diferencia") as total_diferencia
          FROM ajustes_sucursales a
          WHERE a."FechaMovimiento" IS NOT NULL
          AND a."Sucursal" != 'CRISA 3'
          ${sucursal ? 'AND a."Sucursal" = $1' : ''}
          ${periodoFilter}
          GROUP BY a."Sucursal", TRIM(REGEXP_REPLACE(a."Codigo", '\\s*\\d{2}$', ''))
        ),
        costos_base_r AS (
          SELECT "Codigo", AVG("Costo") as costo_promedio
          FROM costos_articulos
          WHERE "Costo" > 0
          GROUP BY "Codigo"
        ),
        unidades_por_sucursal AS (
          SELECT 
            sub."Sucursal",
            SUM(CASE WHEN sub.unidad = 'UN' THEN ABS(sub.net_diff) ELSE 0 END) as total_un,
            SUM(CASE WHEN sub.unidad = 'MTS' THEN ABS(sub.net_diff) ELSE 0 END) as total_mts,
            SUM(CASE WHEN sub.unidad = 'KG' THEN ABS(sub.net_diff) ELSE 0 END) as total_kg
          FROM (
            SELECT 
              a."Sucursal",
              TRIM(REGEXP_REPLACE(a."Codigo", '\\s*\\d{2}$', '')) as codigo_base,
              COALESCE(a."UnidadMedida", 'UN') as unidad,
              SUM(a."Diferencia") as net_diff
            FROM ajustes_sucursales a
            WHERE a."FechaMovimiento" IS NOT NULL
            AND a."Sucursal" != 'CRISA 3'
            ${sucursal ? 'AND a."Sucursal" = $1' : ''}
            ${periodoFilter}
            GROUP BY a."Sucursal", TRIM(REGEXP_REPLACE(a."Codigo", '\\s*\\d{2}$', '')), COALESCE(a."UnidadMedida", 'UN')
          ) sub
          GROUP BY sub."Sucursal"
        ),
        ajustes_por_sucursal AS (
          SELECT 
            ab."Sucursal",
            COUNT(DISTINCT ab.codigo_base) as articulos_con_ajuste,
            SUM(ABS(ab.total_diferencia)) as total_unidades_ajustadas,
            SUM(ABS(ab.total_diferencia) * COALESCE(vb.precio_promedio, cbr.costo_promedio, 0)) as total_valorizado
          FROM ajustes_base ab
          LEFT JOIN ventas_base vb ON ab."Sucursal" = vb."Sucursal" AND ab.codigo_base = vb.codigo_base
          LEFT JOIN costos_base_r cbr ON ab.codigo_base = cbr."Codigo"
          GROUP BY ab."Sucursal"
        ),
        codigos_con_ajuste AS (
          SELECT DISTINCT "Sucursal", TRIM(REGEXP_REPLACE("Codigo", '\\s*\\d{2}$', '')) as codigo_base
          FROM ajustes_sucursales WHERE "FechaMovimiento" IS NOT NULL AND "Sucursal" != 'CRISA 3'
          ${periodoFilterNoAlias}
        ),
        ventas_por_sucursal AS (
          SELECT vb."Sucursal", SUM(vb.total_importe) as total_ventas
          FROM ventas_base vb
          INNER JOIN codigos_con_ajuste ca ON vb."Sucursal" = ca."Sucursal" AND vb.codigo_base = ca.codigo_base
          ${sucursal ? 'WHERE vb."Sucursal" = $1' : ''}
          GROUP BY vb."Sucursal"
        )
        SELECT 
          a."Sucursal",
          a.articulos_con_ajuste,
          a.total_unidades_ajustadas,
          a.total_valorizado,
          COALESCE(u.total_un, 0) as total_un,
          COALESCE(u.total_mts, 0) as total_mts,
          COALESCE(u.total_kg, 0) as total_kg,
          COALESCE(v.total_ventas, 0) as total_ventas
        FROM ajustes_por_sucursal a
        LEFT JOIN unidades_por_sucursal u ON a."Sucursal" = u."Sucursal"
        LEFT JOIN ventas_por_sucursal v ON a."Sucursal" = v."Sucursal"
        ORDER BY total_valorizado DESC
      `;
      
      const resumenPromise = sql(resumenQuery, params);
      
      // Totales globales (sin límite de 500) - agrupando por código base
      const totalesQuery = `
        WITH ventas_base AS (
          SELECT 
            "Sucursal",
            TRIM(REGEXP_REPLACE("Codigo", '\\s*\\d{2}$', '')) as codigo_base,
            AVG("PrecioConIVA") as precio_promedio,
            SUM("ImporteConIVA") as total_importe
          FROM ventas_sucursales
          GROUP BY "Sucursal", TRIM(REGEXP_REPLACE("Codigo", '\\s*\\d{2}$', ''))
        ),
        ajustes_base AS (
          SELECT 
            a."Sucursal",
            TRIM(REGEXP_REPLACE(a."Codigo", '\\s*\\d{2}$', '')) as codigo_base,
            SUM(a."Diferencia") as total_diferencia
          FROM ajustes_sucursales a
          WHERE a."FechaMovimiento" IS NOT NULL
          AND a."Sucursal" != 'CRISA 3'
          ${sucursal ? 'AND a."Sucursal" = $1' : ''}
          ${periodoFilter}
          GROUP BY a."Sucursal", TRIM(REGEXP_REPLACE(a."Codigo", '\\s*\\d{2}$', ''))
        ),
        costos_base_t AS (
          SELECT "Codigo", AVG("Costo") as costo_promedio
          FROM costos_articulos WHERE "Costo" > 0
          GROUP BY "Codigo"
        ),
        con_porcentaje AS (
          SELECT 
            ab."Sucursal",
            ab.codigo_base,
            ABS(ab.total_diferencia) * COALESCE(vb.precio_promedio, cbt.costo_promedio, 0) as total_valorizado,
            COALESCE(vb.total_importe, 0) as total_venta_valorizada,
            CASE 
              WHEN COALESCE(vb.total_importe, 0) > 0 
              THEN (ABS(ab.total_diferencia) * COALESCE(vb.precio_promedio, 0) / vb.total_importe * 100)
              ELSE 0 
            END as porcentaje_perdida
          FROM ajustes_base ab
          LEFT JOIN ventas_base vb ON ab."Sucursal" = vb."Sucursal" AND ab.codigo_base = vb.codigo_base
          LEFT JOIN costos_base_t cbt ON ab.codigo_base = cbt."Codigo"
        )
        SELECT 
          COUNT(*) as total_articulos,
          COUNT(*) FILTER (WHERE porcentaje_perdida > 3) as total_alertas
        FROM con_porcentaje
      `;
      const articulosPorAnioQuery = `
        SELECT 
          COUNT(DISTINCT TRIM(REGEXP_REPLACE("Codigo", '\\s*\\d{2}$', ''))) FILTER (WHERE EXTRACT(YEAR FROM "FechaMovimiento") = 2025) as articulos_2025,
          COUNT(DISTINCT TRIM(REGEXP_REPLACE("Codigo", '\\s*\\d{2}$', ''))) FILTER (WHERE EXTRACT(YEAR FROM "FechaMovimiento") = 2026) as articulos_2026
        FROM ajustes_sucursales
        WHERE "FechaMovimiento" IS NOT NULL
        AND "Sucursal" != 'CRISA 3'
        ${sucursal ? 'AND "Sucursal" = $1' : ''}
        ${periodoFilterNoAlias}
      `;

      const perdidaPorAnioQuery = `
        WITH ajustes_anio AS (
          SELECT 
            EXTRACT(YEAR FROM a."FechaMovimiento") as anio,
            TRIM(REGEXP_REPLACE(a."Codigo", '\\s*\\d{2}$', '')) as codigo_base,
            a."Sucursal",
            SUM(a."Diferencia") as total_diferencia
          FROM ajustes_sucursales a
          WHERE a."FechaMovimiento" IS NOT NULL
          AND a."Sucursal" != 'CRISA 3'
          ${sucursal ? 'AND a."Sucursal" = $1' : ''}
          ${periodoFilter}
          GROUP BY EXTRACT(YEAR FROM a."FechaMovimiento"), TRIM(REGEXP_REPLACE(a."Codigo", '\\s*\\d{2}$', '')), a."Sucursal"
        ),
        ventas_base AS (
          SELECT 
            "Sucursal",
            TRIM(REGEXP_REPLACE("Codigo", '\\s*\\d{2}$', '')) as codigo_base,
            AVG("PrecioConIVA") as precio_promedio
          FROM ventas_sucursales
          GROUP BY "Sucursal", TRIM(REGEXP_REPLACE("Codigo", '\\s*\\d{2}$', ''))
        ),
        costos_base_p AS (
          SELECT "Codigo", AVG("Costo") as costo_promedio
          FROM costos_articulos WHERE "Costo" > 0
          GROUP BY "Codigo"
        )
        SELECT 
          SUM(CASE WHEN aa.anio = 2025 THEN ABS(aa.total_diferencia) * COALESCE(vb.precio_promedio, cbp.costo_promedio, 0) ELSE 0 END) as perdida_2025,
          SUM(CASE WHEN aa.anio = 2026 THEN ABS(aa.total_diferencia) * COALESCE(vb.precio_promedio, cbp.costo_promedio, 0) ELSE 0 END) as perdida_2026
        FROM ajustes_anio aa
        LEFT JOIN ventas_base vb ON aa."Sucursal" = vb."Sucursal" AND aa.codigo_base = vb.codigo_base
        LEFT JOIN costos_base_p cbp ON aa.codigo_base = cbp."Codigo"
      `;

      const ventasPorAnioQuery = `
        WITH codigos_ajustados AS (
          SELECT DISTINCT "Sucursal", TRIM(REGEXP_REPLACE("Codigo", '\\s*\\d{2}$', '')) as codigo_base
          FROM ajustes_sucursales
          WHERE "FechaMovimiento" IS NOT NULL
          AND "Sucursal" != 'CRISA 3'
          ${sucursal ? 'AND "Sucursal" = $1' : ''}
          ${periodoFilterNoAlias}
        )
        SELECT 
          SUM(CASE WHEN EXTRACT(YEAR FROM v."Fecha") = 2025 THEN v."ImporteConIVA" ELSE 0 END) as ventas_2025,
          SUM(CASE WHEN EXTRACT(YEAR FROM v."Fecha") = 2026 THEN v."ImporteConIVA" ELSE 0 END) as ventas_2026
        FROM ventas_sucursales v
        INNER JOIN codigos_ajustados ca ON v."Sucursal" = ca."Sucursal" AND TRIM(REGEXP_REPLACE(v."Codigo", '\\s*\\d{2}$', '')) = ca.codigo_base
        ${sucursal ? 'WHERE v."Sucursal" = $1' : ''}
      `;

      const [result, resumen, totales, articulosPorAnio, perdidaPorAnio, ventasPorAnio] = await Promise.all([
        resultPromise,
        resumenPromise,
        sql(totalesQuery, params),
        sql(articulosPorAnioQuery, params),
        sql(perdidaPorAnioQuery, params),
        sql(ventasPorAnioQuery, params)
      ]);
      
      return {
        detalle: result.map((row: any) => ({
          sucursal: row.Sucursal,
          codigo: row.Codigo,
          articulo: row.Articulo,
          totalAjustes: parseInt(row.total_ajustes),
          totalUnidades: parseFloat(row.total_unidades),
          precioUnitario: parseFloat(row.precio_unitario),
          totalValorizado: parseFloat(row.total_valorizado),
          totalCostoReposicion: parseFloat(row.total_costo_reposicion || 0),
          primerAjuste: row.primer_ajuste,
          ultimoAjuste: row.ultimo_ajuste,
          totalVendido: parseFloat(row.total_vendido),
          totalVentaValorizada: parseFloat(row.total_venta_valorizada),
          porcentajePerdida: parseFloat(row.porcentaje_perdida),
          alertaPerdida: parseFloat(row.porcentaje_perdida) > 3,
          sinAjusteAnual: row.sin_ajuste_anual === true || row.sin_ajuste_anual === 't',
          diferencia2025: parseFloat(row.diferencia_2025 || 0),
          diferencia2026: parseFloat(row.diferencia_2026 || 0),
          totalUn: parseFloat(row.total_un || 0),
          totalMts: parseFloat(row.total_mts || 0),
          totalKg: parseFloat(row.total_kg || 0)
        })),
        resumen: resumen.map((row: any) => ({
          sucursal: row.Sucursal,
          articulosConAjuste: parseInt(row.articulos_con_ajuste),
          totalUnidadesAjustadas: parseFloat(row.total_unidades_ajustadas),
          totalValorizado: parseFloat(row.total_valorizado),
          totalVentas: parseFloat(row.total_ventas),
          totalUn: parseFloat(row.total_un || 0),
          totalMts: parseFloat(row.total_mts || 0),
          totalKg: parseFloat(row.total_kg || 0),
          porcentajePerdida: parseFloat(row.total_ventas) > 0 
            ? Math.min(parseFloat((parseFloat(row.total_valorizado) / parseFloat(row.total_ventas) * 100).toFixed(2)), 100)
            : 0
        })),
        totales: {
          totalArticulos: parseInt(totales[0]?.total_articulos || '0'),
          totalAlertas: parseInt(totales[0]?.total_alertas || '0'),
          articulos2025: parseInt(articulosPorAnio[0]?.articulos_2025 || '0'),
          articulos2026: parseInt(articulosPorAnio[0]?.articulos_2026 || '0'),
          perdida2025: parseFloat(perdidaPorAnio[0]?.perdida_2025 || '0'),
          perdida2026: parseFloat(perdidaPorAnio[0]?.perdida_2026 || '0'),
          ventas2025: parseFloat(ventasPorAnio[0]?.ventas_2025 || '0'),
          ventas2026: parseFloat(ventasPorAnio[0]?.ventas_2026 || '0')
        }
      };
    } catch (error) {
      console.error('Error getting análisis valorizado:', error);
      return { detalle: [], resumen: [], totales: { totalArticulos: 0, totalAlertas: 0, articulos2025: 0, articulos2026: 0, perdida2025: 0, perdida2026: 0, ventas2025: 0, ventas2026: 0 } };
    }
  }

  async getAnalisisValorizadoConCosto(sucursal?: string): Promise<any> {
    try {
      const resumenQuery = `
        WITH ajustes_base AS (
          SELECT 
            a."Sucursal",
            TRIM(REGEXP_REPLACE(a."Codigo", '\\s*\\d{2}$', '')) as codigo_base,
            SUM(a."Diferencia") as total_diferencia
          FROM ajustes_sucursales a
          WHERE a."FechaMovimiento" IS NOT NULL
          ${sucursal ? 'AND a."Sucursal" = $1' : ''}
          GROUP BY a."Sucursal", TRIM(REGEXP_REPLACE(a."Codigo", '\\s*\\d{2}$', ''))
        ),
        costos_base AS (
          SELECT 
            "CodArticulo",
            AVG("Costo") as costo_promedio
          FROM costos_articulos
          WHERE "Costo" > 0
          GROUP BY "CodArticulo"
        ),
        ajustes_valorizado AS (
          SELECT 
            ab."Sucursal",
            SUM(ABS(ab.total_diferencia)) as total_unidades,
            SUM(ABS(ab.total_diferencia) * COALESCE(cb.costo_promedio, 0)) as total_costo_reposicion
          FROM ajustes_base ab
          LEFT JOIN costos_base cb ON ab.codigo_base = cb."CodArticulo"
          GROUP BY ab."Sucursal"
        )
        SELECT 
          "Sucursal",
          total_unidades as unidades_ajustadas,
          total_costo_reposicion as perdida_costo
        FROM ajustes_valorizado
        ORDER BY total_costo_reposicion DESC
      `;
      
      const params = sucursal ? [sucursal] : [];
      const resumen = await sql(resumenQuery, params);
      
      return {
        resumen: resumen.map((row: any) => ({
          sucursal: row.Sucursal,
          unidadesAjustadas: parseFloat(row.unidades_ajustadas || 0),
          perdidaCosto: parseFloat(row.perdida_costo || 0)
        }))
      };
    } catch (error) {
      console.error('Error getting análisis valorizado con costo:', error);
      return { resumen: [] };
    }
  }

  async getHistorialAjustesCodigo(codigo: string, sucursal?: string): Promise<any> {
    try {
      // Historial de ajustes para un código específico
      // Busca el código exacto O variantes con sufijo de color (01-32)
      let query = `
        WITH ajustes_ordenados AS (
          SELECT 
            a.*,
            COALESCE(v.precio_promedio, 0) as precio_unitario,
            ABS(a."Diferencia") * COALESCE(v.precio_promedio, 0) as valor_ajuste,
            LAG(a."FechaMovimiento") OVER (PARTITION BY a."Sucursal", a."Codigo" ORDER BY a."FechaMovimiento") as ajuste_anterior
          FROM ajustes_sucursales a
          LEFT JOIN (
            SELECT "Sucursal", "Codigo", AVG("PrecioConIVA") as precio_promedio
            FROM ventas_sucursales
            GROUP BY "Sucursal", "Codigo"
          ) v ON a."Sucursal" = v."Sucursal" AND a."Codigo" = v."Codigo"
          WHERE (a."Codigo" = $1 OR a."Codigo" LIKE $1 || '%')
          ${sucursal ? 'AND a."Sucursal" = $2' : ''}
        )
        SELECT 
          ao.*,
          (
            SELECT COALESCE(SUM("CantidadVenta"), 0)
            FROM ventas_sucursales
            WHERE "Codigo" = ao."Codigo"
            AND "Sucursal" = ao."Sucursal"
            AND "Fecha" BETWEEN COALESCE(ao.ajuste_anterior, ao."FechaMovimiento" - INTERVAL '1 year') AND ao."FechaMovimiento"
          ) as ventas_entre_ajustes,
          (
            SELECT COALESCE(SUM("ImporteConIVA"), 0)
            FROM ventas_sucursales
            WHERE "Codigo" = ao."Codigo"
            AND "Sucursal" = ao."Sucursal"
            AND "Fecha" BETWEEN COALESCE(ao.ajuste_anterior, ao."FechaMovimiento" - INTERVAL '1 year') AND ao."FechaMovimiento"
          ) as valor_ventas_entre_ajustes
        FROM ajustes_ordenados ao
        ORDER BY ao."FechaMovimiento" DESC
      `;
      
      const params = sucursal ? [codigo, sucursal] : [codigo];
      const result = await sql(query, params);
      
      return result.map((row: any) => ({
        id: row.id,
        sucursal: row.Sucursal,
        codigo: row.Codigo,
        articulo: row.Articulo,
        fechaMovimiento: row.FechaMovimiento,
        tipoMovimiento: row.TipoMovimiento,
        diferencia: parseFloat(row.Diferencia),
        precioUnitario: parseFloat(row.precio_unitario),
        valorAjuste: parseFloat(row.valor_ajuste),
        ajusteAnterior: row.ajuste_anterior,
        ventasEntreAjustes: parseFloat(row.ventas_entre_ajustes),
        valorVentasEntreAjustes: parseFloat(row.valor_ventas_entre_ajustes),
        porcentajePerdida: parseFloat(row.valor_ventas_entre_ajustes) > 0
          ? parseFloat((parseFloat(row.valor_ajuste) / parseFloat(row.valor_ventas_entre_ajustes) * 100).toFixed(2))
          : 0
      }));
    } catch (error) {
      console.error('Error getting historial ajustes código:', error);
      return [];
    }
  }

  // ========================================
  // BRIDGE SYNC METHODS
  // ========================================

  async getSyncInfo(): Promise<any> {
    try {
      const ajustesCount = await sql`SELECT COUNT(*) as total FROM ajustes_sucursales`;
      const costosCount = await sql`SELECT COUNT(*) as total FROM costos_articulos`;
      const ventasCount = await sql`SELECT COUNT(*) as total FROM ventas_sucursales`;
      const ultimaFechaAjustes = await sql`SELECT MAX("FechaMovimiento") as fecha FROM ajustes_sucursales WHERE "FechaMovimiento" <= CURRENT_DATE`;
      const ultimaFechaVentas = await sql`SELECT MAX("Fecha") as fecha FROM ventas_sucursales WHERE "Fecha" <= CURRENT_DATE`;
      const ultimaSyncCostos = await sql`SELECT MAX(updated_at) as fecha FROM costos_articulos`;
      
      return {
        total_ajustes: parseInt(ajustesCount[0]?.total || '0'),
        total_costos: parseInt(costosCount[0]?.total || '0'),
        total_ventas: parseInt(ventasCount[0]?.total || '0'),
        ultima_fecha_ajustes: ultimaFechaAjustes[0]?.fecha || null,
        ultima_fecha_ventas: ultimaFechaVentas[0]?.fecha || null,
        ultima_sync_costos: ultimaSyncCostos[0]?.fecha || null
      };
    } catch (error) {
      console.error('Error getting sync info:', error);
      return { total_ajustes: 0, total_costos: 0, total_ventas: 0 };
    }
  }

  async syncAjustes(ajustes: any[], incremental: boolean = true): Promise<number> {
    try {
      let synced = 0;
      
      for (const ajuste of ajustes) {
        const sucursal = ajuste['Sucursal'] || ajuste['sucursal'];
        const comprobante = ajuste['Comprobante'] || ajuste['comprobante'] || ajuste['T_COMP'];
        const nroComprobante = ajuste['Nro. comprobante'] || ajuste['NroComprobante'] || ajuste['N_COMP'] || '';
        const codigo = ajuste['Cód. Artículo'] || ajuste['Codigo'] || ajuste['codigo'];
        const articulo = ajuste['Artículo'] || ajuste['Articulo'] || ajuste['articulo'];
        const fechaMovimiento = ajuste['Fecha movimiento'] || ajuste['FechaMovimiento'] || ajuste['fecha_movimiento'];
        const tipoMovimiento = ajuste['Tipo de Movimiento'] || ajuste['TipoMovimiento'] || ajuste['tipo_movimiento'];
        const unidadMedida = ajuste['U.M. stock'] || ajuste['UnidadMedida'] || ajuste['unidad_medida'] || '';
        const diferencia = parseFloat(ajuste['Cantidad'] || ajuste['Diferencia'] || ajuste['diferencia'] || 0);
        
        if (!codigo || !sucursal || !nroComprobante) continue;
        
        // UPSERT basado en Sucursal + NroComprobante + Codigo (clave única por comprobante)
        const fechaVal = fechaMovimiento ? new Date(fechaMovimiento) : null;
        await sql`
          INSERT INTO ajustes_sucursales ("Sucursal", "Comprobante", "NroComprobante", "Codigo", "Articulo", "FechaMovimiento", "TipoMovimiento", "Diferencia", "UnidadMedida")
          VALUES (${sucursal}, ${comprobante}, ${nroComprobante}, ${codigo}, ${articulo}, ${fechaVal}, ${tipoMovimiento}, ${diferencia}, ${unidadMedida})
          ON CONFLICT DO NOTHING
        `;
        synced++;
      }
      
      return synced;
    } catch (error) {
      console.error('Error syncing ajustes:', error);
      throw error;
    }
  }

  async syncCostos(costos: any[], incremental: boolean = true): Promise<number> {
    try {
      let synced = 0;
      
      // If not incremental, clear the table first
      if (!incremental) {
        await sql`TRUNCATE TABLE costos_articulos RESTART IDENTITY`;
      }
      
      for (const costo of costos) {
        const codigo = costo['Cód. Artículo'] || costo['Codigo'] || costo['codigo'];
        const descripcion = costo['Descripción'] || costo['Descripcion'] || costo['descripcion'];
        const sinonimo = costo['Sinónimo'] || costo['Sinonimo'] || costo['sinonimo'];
        const codigoFamilia = costo['Cód. familia (Artículo)'] || costo['CodigoFamilia'];
        const codigoBase = costo['Cód. Base / Artículo'] || costo['CodigoBase'];
        const descripcionBase = costo['Desc. Base / Artículo'] || costo['DescripcionBase'];
        const saldo = parseFloat(costo['Saldo'] || costo['saldo'] || 0);
        const cotizacion = parseFloat(costo['gva16.cotiz'] || costo['Cotizacion'] || 0);
        const costoVal = parseFloat(costo['Costo'] || costo['costo'] || 0);
        const saldoValorizado = parseFloat(costo['Saldo Valorizado'] || costo['SaldoValorizado'] || 0);
        
        if (!codigo) continue;
        
        // UPSERT by codigo
        await sql`
          INSERT INTO costos_articulos ("Codigo", "Descripcion", "Sinonimo", "CodigoFamilia", "CodigoBase", "DescripcionBase", "Saldo", "Cotizacion", "Costo", "SaldoValorizado", "updated_at")
          VALUES (${codigo}, ${descripcion}, ${sinonimo}, ${codigoFamilia}, ${codigoBase}, ${descripcionBase}, ${saldo}, ${cotizacion}, ${costoVal}, ${saldoValorizado}, NOW())
          ON CONFLICT ("Codigo") DO UPDATE SET
            "Descripcion" = EXCLUDED."Descripcion",
            "Sinonimo" = EXCLUDED."Sinonimo",
            "CodigoFamilia" = EXCLUDED."CodigoFamilia",
            "CodigoBase" = EXCLUDED."CodigoBase",
            "DescripcionBase" = EXCLUDED."DescripcionBase",
            "Saldo" = EXCLUDED."Saldo",
            "Cotizacion" = EXCLUDED."Cotizacion",
            "Costo" = EXCLUDED."Costo",
            "SaldoValorizado" = EXCLUDED."SaldoValorizado",
            "updated_at" = NOW()
        `;
        synced++;
      }
      
      return synced;
    } catch (error) {
      console.error('Error syncing costos:', error);
      throw error;
    }
  }

  async syncVentas(ventas: any[], incremental: boolean = true): Promise<number> {
    try {
      let synced = 0;
      
      for (const venta of ventas) {
        const fecha = venta['Fecha'] || venta['fecha'];
        const sucursal = venta['Desc. sucursal'] || venta['Sucursal'] || venta['sucursal'];
        const codigoFamilia = venta['Cod. Familia (Articulo)'] || venta['CodigoFamilia'] || '';
        const descripcionFamilia = venta['Descripcion Familia (Articulo)'] || venta['DescripcionFamilia'] || '';
        const codigo = venta['Cod. Articulo'] || venta['Codigo'] || venta['codigo'];
        const sinonimo = venta['Sinonimo'] || venta['sinonimo'] || '';
        const descripcion = venta['Descripcion'] || venta['descripcion'] || '';
        const cantidadVenta = parseFloat(venta['Cantidad venta'] || venta['CantidadVenta'] || 0);
        const importeConIVA = parseFloat(venta['Imp. prop. c/IVA'] || venta['ImporteConIVA'] || 0);
        const unidadMedida = venta['U.M. stock'] || venta['UnidadMedida'] || '';
        
        if (!codigo || !sucursal || !fecha) continue;
        
        const fechaVal = new Date(fecha);
        const precioConIVA = cantidadVenta !== 0 ? importeConIVA / cantidadVenta : 0;
        
        // UPSERT by Fecha + Sucursal + Codigo
        await sql`
          INSERT INTO ventas_sucursales ("Fecha", "Sucursal", "CodigoFamilia", "DescripcionFamilia", "Codigo", "Sinonimo", "Descripcion", "CantidadVenta", "PrecioConIVA", "ImporteConIVA")
          VALUES (${fechaVal}, ${sucursal}, ${codigoFamilia}, ${descripcionFamilia}, ${codigo}, ${sinonimo}, ${descripcion}, ${cantidadVenta}, ${precioConIVA}, ${importeConIVA})
          ON CONFLICT ("Fecha", "Sucursal", "Codigo") DO UPDATE SET
            "CodigoFamilia" = EXCLUDED."CodigoFamilia",
            "DescripcionFamilia" = EXCLUDED."DescripcionFamilia",
            "Sinonimo" = EXCLUDED."Sinonimo",
            "Descripcion" = EXCLUDED."Descripcion",
            "CantidadVenta" = EXCLUDED."CantidadVenta",
            "PrecioConIVA" = EXCLUDED."PrecioConIVA",
            "ImporteConIVA" = EXCLUDED."ImporteConIVA"
        `;
        synced++;
      }
      
      return synced;
    } catch (error) {
      console.error('Error syncing ventas:', error);
      throw error;
    }
  }

  async getMuestreosFileStatuses(): Promise<MuestreoFileStatusRecord[]> {
    try {
      const rows = await sql(`
        SELECT
          id,
          file_id as "fileId",
          file_path as "filePath",
          status,
          updated_at as "updatedAt",
          updated_by as "updatedBy"
        FROM muestreos_file_status
        ORDER BY updated_at DESC
      `);

      return rows.map((row: any) => ({
        id: Number(row.id),
        fileId: String(row.fileId),
        filePath: row.filePath ?? null,
        status: row.status as MuestreoFileStatus,
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
        updatedBy: row.updatedBy ?? null,
      }));
    } catch (error) {
      console.error('Error getting muestreos file statuses:', error);
      return [];
    }
  }

  async upsertMuestreoFileStatus(fileId: string, payload: { filePath?: string | null; status: MuestreoFileStatus; updatedBy?: string | null }): Promise<MuestreoFileStatusRecord> {
    const normalizedFileId = String(fileId ?? '').trim();
    if (!normalizedFileId) {
      throw new Error('fileId is required');
    }

    const normalizedPath = payload.filePath ? String(payload.filePath).trim() : null;
    const updatedBy = payload.updatedBy ? String(payload.updatedBy).trim() : null;

    const result = await sql(`
      INSERT INTO muestreos_file_status (
        file_id,
        file_path,
        status,
        updated_at,
        updated_by
      )
      VALUES ($1, $2, $3, NOW(), $4)
      ON CONFLICT (file_id)
      DO UPDATE SET
        file_path = COALESCE(EXCLUDED.file_path, muestreos_file_status.file_path),
        status = EXCLUDED.status,
        updated_at = NOW(),
        updated_by = EXCLUDED.updated_by
      RETURNING
        id,
        file_id as "fileId",
        file_path as "filePath",
        status,
        updated_at as "updatedAt",
        updated_by as "updatedBy"
    `, [normalizedFileId, normalizedPath, payload.status, updatedBy]);

    const row = result[0];
    return {
      id: Number(row.id),
      fileId: String(row.fileId),
      filePath: row.filePath ?? null,
      status: row.status as MuestreoFileStatus,
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
      updatedBy: row.updatedBy ?? null,
    };
  }

  async getPuntoEquilibrio(sucursal?: string): Promise<any> {
    try {
      const sucursalFilter = sucursal ? `AND a."Sucursal" = $1` : '';
      const ventasSucursalFilter = sucursal ? `AND v."Sucursal" = $1` : '';
      const params = sucursal ? [sucursal] : [];

      const query = `
        WITH ajustes_base AS (
          SELECT 
            a."Sucursal",
            TRIM(REGEXP_REPLACE(a."Codigo", '\\s*\\d{2}$', '')) as codigo_base,
            MAX(a."Articulo") as articulo,
            ABS(SUM(a."Diferencia")) as unidades_perdidas,
            MAX(a."FechaMovimiento") as ultimo_ajuste
          FROM ajustes_sucursales a
          WHERE a."FechaMovimiento" IS NOT NULL
          AND a."Sucursal" IN ('LA TIJERA TUNUYAN', 'LA TIJERA SAN RAFAEL', 'LA TIJERA SAN MARTIN', 'LA TIJERA SMARTIN', 'LA TIJERA MAIPU', 'LA TIJERA LUJAN', 'LA TIJERA MENDOZA', 'LA TIJERA SAN LUIS', 'LA TIJERA SAN JUAN', 'CRISA 2')
          ${sucursalFilter}
          GROUP BY a."Sucursal", TRIM(REGEXP_REPLACE(a."Codigo", '\\s*\\d{2}$', ''))
          HAVING SUM(a."Diferencia") < 0
        ),
        precios_venta AS (
          SELECT 
            v."Sucursal",
            TRIM(REGEXP_REPLACE(v."Codigo", '\\s*\\d{2}$', '')) as codigo_base,
            AVG(v."PrecioConIVA") as precio_venta,
            SUM(v."ImporteConIVA") as total_vendido
          FROM ventas_sucursales v
          WHERE 1=1 ${ventasSucursalFilter}
          GROUP BY v."Sucursal", TRIM(REGEXP_REPLACE(v."Codigo", '\\s*\\d{2}$', ''))
        ),
        costos AS (
          SELECT "Codigo", "Costo" FROM costos_articulos WHERE "Costo" > 0
        ),
        detalle AS (
          SELECT 
            a."Sucursal",
            a.codigo_base,
            a.articulo,
            a.unidades_perdidas,
            COALESCE(p.precio_venta, 0) as precio_venta,
            COALESCE(c."Costo", 0) as costo,
            a.unidades_perdidas * COALESCE(p.precio_venta, c."Costo", 0) as perdida_valorizada,
            a.unidades_perdidas * COALESCE(c."Costo", 0) as perdida_costo,
            CASE WHEN p.precio_venta > 0 AND c."Costo" > 0 
              THEN ROUND(((p.precio_venta - c."Costo") / p.precio_venta * 100)::numeric, 1)
              ELSE 0 
            END as margen_porcentual,
            CASE WHEN p.precio_venta > 0 AND c."Costo" > 0 AND (p.precio_venta - c."Costo") > 0
              THEN ROUND((a.unidades_perdidas * COALESCE(p.precio_venta, c."Costo", 0) / ((p.precio_venta - c."Costo") / p.precio_venta))::numeric, 2)
              ELSE 0 
            END as punto_equilibrio,
            COALESCE(p.total_vendido, 0) as ventas_acumuladas
          FROM ajustes_base a
          LEFT JOIN precios_venta p ON a."Sucursal" = p."Sucursal" AND a.codigo_base = p.codigo_base
          LEFT JOIN costos c ON a.codigo_base = c."Codigo"
          WHERE a.unidades_perdidas > 0
        )
        SELECT 
          "Sucursal" as sucursal,
          codigo_base as codigo,
          articulo,
          ROUND(unidades_perdidas::numeric, 2) as unidades_perdidas,
          ROUND(precio_venta::numeric, 2) as precio_venta,
          ROUND(costo::numeric, 2) as costo,
          ROUND(perdida_valorizada::numeric, 2) as perdida_valorizada,
          ROUND(perdida_costo::numeric, 2) as perdida_costo,
          margen_porcentual,
          ROUND(punto_equilibrio::numeric, 2) as punto_equilibrio,
          ROUND(ventas_acumuladas::numeric, 2) as ventas_acumuladas,
          CASE WHEN punto_equilibrio > 0 
            THEN LEAST(ROUND((ventas_acumuladas / punto_equilibrio * 100)::numeric, 1), 100)
            ELSE 0 
          END as porcentaje_alcanzado
        FROM detalle
        ORDER BY perdida_valorizada DESC
        LIMIT 500
      `;

      const resumenQuery = `
        WITH ajustes_base AS (
          SELECT 
            a."Sucursal",
            TRIM(REGEXP_REPLACE(a."Codigo", '\\s*\\d{2}$', '')) as codigo_base,
            ABS(SUM(a."Diferencia")) as unidades_perdidas
          FROM ajustes_sucursales a
          WHERE a."FechaMovimiento" IS NOT NULL
          AND a."Sucursal" IN ('LA TIJERA TUNUYAN', 'LA TIJERA SAN RAFAEL', 'LA TIJERA SAN MARTIN', 'LA TIJERA SMARTIN', 'LA TIJERA MAIPU', 'LA TIJERA LUJAN', 'LA TIJERA MENDOZA', 'LA TIJERA SAN LUIS', 'LA TIJERA SAN JUAN', 'CRISA 2')
          ${sucursalFilter}
          GROUP BY a."Sucursal", TRIM(REGEXP_REPLACE(a."Codigo", '\\s*\\d{2}$', ''))
          HAVING SUM(a."Diferencia") < 0
        ),
        precios_venta AS (
          SELECT 
            v."Sucursal",
            TRIM(REGEXP_REPLACE(v."Codigo", '\\s*\\d{2}$', '')) as codigo_base,
            AVG(v."PrecioConIVA") as precio_venta,
            SUM(v."ImporteConIVA") as total_vendido
          FROM ventas_sucursales v
          WHERE 1=1 ${ventasSucursalFilter}
          GROUP BY v."Sucursal", TRIM(REGEXP_REPLACE(v."Codigo", '\\s*\\d{2}$', ''))
        ),
        costos AS (
          SELECT "Codigo", "Costo" FROM costos_articulos WHERE "Costo" > 0
        ),
        por_sucursal AS (
          SELECT 
            a."Sucursal",
            COUNT(DISTINCT a.codigo_base) as total_articulos,
            SUM(a.unidades_perdidas) as total_unidades,
            SUM(a.unidades_perdidas * COALESCE(p.precio_venta, c."Costo", 0)) as perdida_valorizada,
            SUM(a.unidades_perdidas * COALESCE(c."Costo", 0)) as perdida_costo,
            AVG(CASE WHEN p.precio_venta > 0 AND c."Costo" > 0 
              THEN ((p.precio_venta - c."Costo") / p.precio_venta * 100) END) as margen_promedio,
            SUM(COALESCE(p.total_vendido, 0)) as ventas_totales
          FROM ajustes_base a
          LEFT JOIN precios_venta p ON a."Sucursal" = p."Sucursal" AND a.codigo_base = p.codigo_base
          LEFT JOIN costos c ON a.codigo_base = c."Codigo"
          WHERE a.unidades_perdidas > 0
          GROUP BY a."Sucursal"
        )
        SELECT 
          "Sucursal" as sucursal,
          total_articulos,
          ROUND(total_unidades::numeric, 0) as total_unidades,
          ROUND(perdida_valorizada::numeric, 2) as perdida_valorizada,
          ROUND(perdida_costo::numeric, 2) as perdida_costo,
          ROUND(COALESCE(margen_promedio, 0)::numeric, 1) as margen_promedio,
          ROUND(ventas_totales::numeric, 2) as ventas_totales,
          CASE WHEN COALESCE(margen_promedio, 0) > 0 
            THEN ROUND((perdida_valorizada / (margen_promedio / 100))::numeric, 2) 
            ELSE 0 
          END as punto_equilibrio,
          CASE WHEN COALESCE(margen_promedio, 0) > 0 AND perdida_valorizada > 0
            THEN LEAST(ROUND((ventas_totales / (perdida_valorizada / (margen_promedio / 100)) * 100)::numeric, 1), 100)
            ELSE 0 
          END as porcentaje_alcanzado
        FROM por_sucursal
        ORDER BY perdida_valorizada DESC
      `;

      const [detalle, resumen] = await Promise.all([
        sql(query, params),
        sql(resumenQuery, params)
      ]);

      return { detalle, resumen };
    } catch (error) {
      console.error('Error getting punto equilibrio:', error);
      return { detalle: [], resumen: [] };
    }
  }

  async searchRindeArticles(query: string): Promise<any[]> {
    try {
      const search = query.trim();
      if (!search) return [];

      const normalized = search.toUpperCase();
      const baseRows = await sql(`
        SELECT
          TRIM("Codigo") as code,
          COALESCE(MAX(COALESCE("Articulo", '')), '') as description
        FROM ajustes_sucursales
        WHERE "Codigo" IS NOT NULL AND TRIM("Codigo") != ''
        GROUP BY TRIM("Codigo")
      `);

      const ranked = baseRows
        .map((row: any) => {
          const code = String(row.code || '').trim();
          const description = String(row.description || '').trim();
          const haystack = `${code} ${description}`.toUpperCase();
          if (!haystack.includes(normalized)) return null;

          let rank = 5;
          if (code.toUpperCase() == normalized) rank = 0;
          else if (description.toUpperCase() == normalized) rank = 1;
          else if (code.toUpperCase().startsWith(normalized)) rank = 2;
          else if (description.toUpperCase().startsWith(normalized)) rank = 3;
          else if (code.toUpperCase().includes(normalized)) rank = 4;

          return { code, description, rank };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.rank - b.rank || a.description.localeCompare(b.description) || a.code.localeCompare(b.code))
        .slice(0, 12);

      if (!ranked.length) {
        return [];
      }

      const codes = ranked.map((item: any) => item.code);
      const costRows = await sql(`
        SELECT
          TRIM("Codigo") as code,
          COALESCE("Descripcion", '') as description,
          COALESCE(TRIM("Sinonimo"), '') as synonym,
          COALESCE("CodigoBase", '') as "codigoBase",
          COALESCE("DescripcionBase", '') as "descripcionBase"
        FROM costos_articulos
        WHERE TRIM("Codigo") = ANY($1)
      `, [codes]);
      const rindeRows = await sql(`
        SELECT
          article_code as code,
          activo,
          ancho_cm as "anchoCm",
          metros_referencia as "metrosReferencia",
          kg_por_metro as "kgPorMetro",
          reference_label as "referenceLabel"
        FROM tela_rindes
        WHERE article_code = ANY($1)
      `, [codes]);

      const costsByCode = new Map(costRows.map((row: any) => [String(row.code || '').trim(), row]));
      const rindesByCode = new Map(rindeRows.map((row: any) => [String(row.code || '').trim(), row]));

      return ranked.map((item: any) => {
        const cost = costsByCode.get(item.code);
        const rinde = rindesByCode.get(item.code);
        return {
          code: item.code,
          description: cost?.description || item.description || '',
          synonym: cost?.synonym || '',
          codigoBase: cost?.codigoBase || '',
          descripcionBase: cost?.descripcionBase || '',
          hasRinde: Boolean(rinde?.activo),
          active: Boolean(rinde?.activo),
          anchoCm: rinde?.anchoCm == null ? null : Number(rinde.anchoCm),
          metrosReferencia: rinde?.metrosReferencia == null ? null : Number(rinde.metrosReferencia),
          kgPorMetro: rinde?.kgPorMetro == null ? null : Number(rinde.kgPorMetro),
          referenceLabel: rinde?.referenceLabel ?? null,
        };
      });
    } catch (error) {
      console.error('Error searching rinde articles:', error);
      return [];
    }
  }

  async getActiveTelaRindes(options?: { includeInactive?: boolean }): Promise<any[]> {
    try {
      const includeInactive = options?.includeInactive === true;
      const supportsReferenceLabel = await hasTelaRindesReferenceLabel();
      const rows = await sql(`
        SELECT
          tr.id,
          tr.article_code as "articleCode",
          ${supportsReferenceLabel ? 'tr.reference_label' : 'NULL'} as "referenceLabel",
          tr.ancho_cm as "anchoCm",
          tr.peso_referencia_kg as "pesoReferenciaKg",
          tr.metros_referencia as "metrosReferencia",
          tr.kg_por_metro as "kgPorMetro",
          tr.activo,
          tr.updated_at as "updatedAt",
          tr.updated_by as "updatedBy"
        FROM tela_rindes tr
        WHERE ($1::boolean = TRUE OR tr.activo = TRUE)
        ORDER BY COALESCE(NULLIF(${supportsReferenceLabel ? 'tr.reference_label' : 'NULL'}, ''), tr.article_code) ASC
      `, [includeInactive]);

      return rows.map((row: any) => ({
        id: Number(row.id),
        articleCode: row.articleCode,
        referenceLabel: row.referenceLabel ?? row.articleCode ?? null,
        description: '',
        synonym: '',
        codigoBase: '',
        descripcionBase: '',
        anchoCm: row.anchoCm == null ? null : Number(row.anchoCm),
        pesoReferenciaKg: row.pesoReferenciaKg == null ? null : Number(row.pesoReferenciaKg),
        metrosReferencia: row.metrosReferencia == null ? null : Number(row.metrosReferencia),
        kgPorMetro: row.kgPorMetro == null ? null : Number(row.kgPorMetro),
        activo: Boolean(row.activo),
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
        updatedBy: row.updatedBy ?? null,
        code: row.articleCode,
      }));
    } catch (error) {
      console.error('Error listing active tela rindes:', error);
      return [];
    }
  }

  async getTelaRinde(articleCode: string): Promise<any | null> {
    try {
      const code = articleCode.trim();
      if (!code) return null;
      const supportsReferenceLabel = await hasTelaRindesReferenceLabel();

      const rows = await sql(`
        SELECT
          tr.id,
          tr.article_code as "articleCode",
          tr.ancho_cm as "anchoCm",
          tr.peso_referencia_kg as "pesoReferenciaKg",
          tr.metros_referencia as "metrosReferencia",
          tr.kg_por_metro as "kgPorMetro",
          ${supportsReferenceLabel ? 'tr.reference_label' : 'NULL'} as "referenceLabel",
          tr.activo,
          tr.updated_at as "updatedAt",
          tr.updated_by as "updatedBy"
        FROM tela_rindes tr
        WHERE UPPER(TRIM(tr.article_code)) = UPPER(TRIM($1))
           OR (${supportsReferenceLabel ? "UPPER(TRIM(COALESCE(tr.reference_label, ''))) = UPPER(TRIM($1))" : 'FALSE'})
        LIMIT 1
      `, [code]);

      const row = rows[0];
      return {
        article: {
          code: row?.articleCode ?? code,
          description: '',
          synonym: '',
          codigoBase: '',
          descripcionBase: '',
          hasRinde: row != null && Boolean(row.activo),
          active: row != null ? Boolean(row.activo) : undefined,
          anchoCm: row?.anchoCm == null ? null : Number(row.anchoCm),
          metrosReferencia: row?.metrosReferencia == null ? null : Number(row.metrosReferencia),
          kgPorMetro: row?.kgPorMetro == null ? null : Number(row.kgPorMetro),
          referenceLabel: row?.referenceLabel ?? row?.articleCode ?? code,
        },
        rinde: row == null ? null : {
          id: Number(row.id),
          articleCode: row.articleCode,
          anchoCm: Number(row.anchoCm),
          pesoReferenciaKg: Number(row.pesoReferenciaKg),
          metrosReferencia: Number(row.metrosReferencia),
          kgPorMetro: Number(row.kgPorMetro),
          referenceLabel: row.referenceLabel ?? row.articleCode ?? null,
          activo: Boolean(row.activo),
          updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
          updatedBy: row.updatedBy ?? null,
        }
      };
    } catch (error) {
      console.error('Error getting tela rinde:', error);
      return null;
    }
  }

  async saveTelaRinde(payload: any): Promise<any> {
    const articleCode = String(payload.articleCode ?? '').trim();
    const anchoCm = Number(payload.anchoCm);
    const pesoReferenciaKg = Number(payload.pesoReferenciaKg);
    const metrosReferencia = Number(payload.metrosReferencia);
    const kgPorMetro = Number(payload.kgPorMetro);
    const referenceLabel = payload.referenceLabel ? String(payload.referenceLabel).trim() : null;
    const activo = payload.activo !== false;
    const updatedBy = payload.updatedBy ? String(payload.updatedBy).trim() : null;
    const supportsReferenceLabel = await hasTelaRindesReferenceLabel();

    const result = supportsReferenceLabel
      ? await sql(`
          INSERT INTO tela_rindes (
            article_code,
            ancho_cm,
            peso_referencia_kg,
            metros_referencia,
            kg_por_metro,
            reference_label,
            activo,
            updated_at,
            updated_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
          ON CONFLICT (article_code)
          DO UPDATE SET
            ancho_cm = EXCLUDED.ancho_cm,
            peso_referencia_kg = EXCLUDED.peso_referencia_kg,
            metros_referencia = EXCLUDED.metros_referencia,
            kg_por_metro = EXCLUDED.kg_por_metro,
            reference_label = EXCLUDED.reference_label,
            activo = EXCLUDED.activo,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
          RETURNING
            id,
            article_code as "articleCode",
            ancho_cm as "anchoCm",
            peso_referencia_kg as "pesoReferenciaKg",
            metros_referencia as "metrosReferencia",
            kg_por_metro as "kgPorMetro",
            reference_label as "referenceLabel",
            activo,
            updated_at as "updatedAt",
            updated_by as "updatedBy"
        `, [articleCode, anchoCm, pesoReferenciaKg, metrosReferencia, kgPorMetro, referenceLabel, activo, updatedBy])
      : await sql(`
          INSERT INTO tela_rindes (
            article_code,
            ancho_cm,
            peso_referencia_kg,
            metros_referencia,
            kg_por_metro,
            activo,
            updated_at,
            updated_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
          ON CONFLICT (article_code)
          DO UPDATE SET
            ancho_cm = EXCLUDED.ancho_cm,
            peso_referencia_kg = EXCLUDED.peso_referencia_kg,
            metros_referencia = EXCLUDED.metros_referencia,
            kg_por_metro = EXCLUDED.kg_por_metro,
            activo = EXCLUDED.activo,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
          RETURNING
            id,
            article_code as "articleCode",
            ancho_cm as "anchoCm",
            peso_referencia_kg as "pesoReferenciaKg",
            metros_referencia as "metrosReferencia",
            kg_por_metro as "kgPorMetro",
            NULL as "referenceLabel",
            activo,
            updated_at as "updatedAt",
            updated_by as "updatedBy"
        `, [articleCode, anchoCm, pesoReferenciaKg, metrosReferencia, kgPorMetro, activo, updatedBy]);

    const row = result[0];
    return {
      id: Number(row.id),
      articleCode: row.articleCode,
      anchoCm: Number(row.anchoCm),
      pesoReferenciaKg: Number(row.pesoReferenciaKg),
      metrosReferencia: Number(row.metrosReferencia),
      kgPorMetro: Number(row.kgPorMetro),
      referenceLabel: row.referenceLabel ?? row.articleCode ?? null,
      activo: Boolean(row.activo),
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
      updatedBy: row.updatedBy ?? null,
    };
  }

  async getCodigosArticulos(): Promise<string[]> {
    try {
      const rows = await sql`
        SELECT DISTINCT TRIM("Codigo") as codigo
        FROM ajustes_sucursales 
        WHERE "Codigo" IS NOT NULL AND TRIM("Codigo") != ''
        ORDER BY codigo
      `;
      return rows.map((r: any) => r.codigo);
    } catch (error) {
      console.error('Error getting codigos articulos:', error);
      return [];
    }
  }
}

// Create storage instance
export const storage = new PostgreSQLStorage();
