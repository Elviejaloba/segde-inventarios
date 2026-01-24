import { users, type User, type InsertUser, type Ajuste, type InsertAjuste } from "@shared/schema";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const sql = neon(databaseUrl);

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
  getAnalisisValorizado(sucursal?: string): Promise<any>;
  getHistorialAjustesCodigo(codigo: string, sucursal?: string): Promise<any>;
}

export class PostgreSQLStorage implements IStorage {
  private users: Map<number, User>;
  private currentUserId: number;

  constructor() {
    this.users = new Map();
    this.currentUserId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => (user as any).username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

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

  async getAnalisisValorizado(sucursal?: string): Promise<any> {
    try {
      // Análisis valorizado agrupando por código base (sin sufijo de color 01-32)
      // Lógica: TI400I 01 al TI400I 32 son el mismo producto, se consolidan
      let query = `
        WITH codigo_base AS (
          -- Extraer código base removiendo el sufijo de color (últimos 2 dígitos)
          SELECT 
            a."Sucursal",
            a."Codigo" as codigo_original,
            TRIM(REGEXP_REPLACE(a."Codigo", '\\s+\\d{2}$', '')) as codigo_base,
            a."Articulo",
            a."FechaMovimiento",
            a."TipoMovimiento",
            a."Diferencia",
            EXTRACT(YEAR FROM a."FechaMovimiento") as anio
          FROM ajustes_sucursales a
          WHERE a."FechaMovimiento" IS NOT NULL
          ${sucursal ? 'AND a."Sucursal" = $1' : ''}
        ),
        ventas_base AS (
          -- Ventas agrupadas por código base
          SELECT 
            "Sucursal",
            TRIM(REGEXP_REPLACE("Codigo", '\\s+\\d{2}$', '')) as codigo_base,
            SUM("CantidadVenta") as total_vendido,
            SUM("ImporteConIVA") as total_venta_valorizada,
            AVG("PrecioConIVA") as precio_promedio
          FROM ventas_sucursales
          ${sucursal ? 'WHERE "Sucursal" = $1' : ''}
          GROUP BY "Sucursal", TRIM(REGEXP_REPLACE("Codigo", '\\s+\\d{2}$', ''))
        ),
        ajustes_2025 AS (
          -- Último ajuste de 2025 por código base
          SELECT DISTINCT ON ("Sucursal", codigo_base)
            "Sucursal",
            codigo_base,
            "FechaMovimiento" as fecha_ajuste_2025,
            SUM("Diferencia") OVER (PARTITION BY "Sucursal", codigo_base) as diferencia_2025
          FROM codigo_base
          WHERE anio = 2025
          ORDER BY "Sucursal", codigo_base, "FechaMovimiento" DESC
        ),
        ajustes_2026 AS (
          -- Ajustes de 2026 (vigente) por código base
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
          -- Consolidar ajustes históricos + vigentes
          SELECT 
            COALESCE(a25."Sucursal", a26."Sucursal") as "Sucursal",
            COALESCE(a25.codigo_base, a26.codigo_base) as codigo_base,
            a25.fecha_ajuste_2025,
            COALESCE(a25.diferencia_2025, 0) as diferencia_2025,
            a26.fecha_ajuste_2026,
            COALESCE(a26.diferencia_2026, 0) as diferencia_2026,
            COALESCE(a26.cant_ajustes_2026, 0) as total_ajustes,
            ABS(COALESCE(a25.diferencia_2025, 0)) + ABS(COALESCE(a26.diferencia_2026, 0)) as diferencia_consolidada
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
        )
        SELECT 
          c."Sucursal",
          c.codigo_base as "Codigo",
          COALESCE(ad."Articulo", c.codigo_base) as "Articulo",
          c.total_ajustes,
          c.diferencia_consolidada as total_unidades,
          COALESCE(v.precio_promedio, 0) as precio_unitario,
          c.diferencia_consolidada * COALESCE(v.precio_promedio, 0) as total_valorizado,
          c.fecha_ajuste_2025 as primer_ajuste,
          COALESCE(c.fecha_ajuste_2026, c.fecha_ajuste_2025) as ultimo_ajuste,
          COALESCE(v.total_vendido, 0) as total_vendido,
          COALESCE(v.total_venta_valorizada, 0) as total_venta_valorizada,
          CASE 
            WHEN COALESCE(v.total_venta_valorizada, 0) > 0 
            THEN ROUND((c.diferencia_consolidada * COALESCE(v.precio_promedio, 0) / v.total_venta_valorizada * 100)::numeric, 2)
            ELSE 0 
          END as porcentaje_perdida,
          CASE 
            WHEN c.fecha_ajuste_2026 IS NULL THEN true
            ELSE false
          END as sin_ajuste_anual,
          c.diferencia_2025,
          c.diferencia_2026
        FROM consolidado c
        LEFT JOIN ventas_base v ON c."Sucursal" = v."Sucursal" AND c.codigo_base = v.codigo_base
        LEFT JOIN articulo_desc ad ON c."Sucursal" = ad."Sucursal" AND c.codigo_base = ad.codigo_base
        WHERE c.diferencia_consolidada > 0
        ORDER BY total_valorizado DESC
        LIMIT 500
      `;
      
      const params = sucursal ? [sucursal] : [];
      const result = await sql(query, params);
      
      // Resumen general - agrupando por código base
      const resumenQuery = `
        WITH ventas_base AS (
          SELECT 
            "Sucursal",
            TRIM(REGEXP_REPLACE("Codigo", '\\s+\\d{2}$', '')) as codigo_base,
            AVG("PrecioConIVA") as precio_promedio,
            SUM("ImporteConIVA") as total_importe
          FROM ventas_sucursales
          GROUP BY "Sucursal", TRIM(REGEXP_REPLACE("Codigo", '\\s+\\d{2}$', ''))
        ),
        ajustes_base AS (
          SELECT 
            a."Sucursal",
            TRIM(REGEXP_REPLACE(a."Codigo", '\\s+\\d{2}$', '')) as codigo_base,
            SUM(ABS(a."Diferencia")) as total_diferencia
          FROM ajustes_sucursales a
          WHERE a."FechaMovimiento" IS NOT NULL
          ${sucursal ? 'AND a."Sucursal" = $1' : ''}
          GROUP BY a."Sucursal", TRIM(REGEXP_REPLACE(a."Codigo", '\\s+\\d{2}$', ''))
        ),
        ajustes_por_sucursal AS (
          SELECT 
            ab."Sucursal",
            COUNT(DISTINCT ab.codigo_base) as articulos_con_ajuste,
            SUM(ab.total_diferencia) as total_unidades_ajustadas,
            SUM(ab.total_diferencia * COALESCE(vb.precio_promedio, 0)) as total_valorizado
          FROM ajustes_base ab
          LEFT JOIN ventas_base vb ON ab."Sucursal" = vb."Sucursal" AND ab.codigo_base = vb.codigo_base
          GROUP BY ab."Sucursal"
        ),
        codigos_con_ajuste AS (
          SELECT DISTINCT "Sucursal", TRIM(REGEXP_REPLACE("Codigo", '\\s+\\d{2}$', '')) as codigo_base
          FROM ajustes_sucursales WHERE "FechaMovimiento" IS NOT NULL
        ),
        ventas_por_sucursal AS (
          SELECT vb."Sucursal", SUM(vb.total_importe) as total_ventas
          FROM ventas_base vb
          INNER JOIN codigos_con_ajuste ca ON vb."Sucursal" = ca."Sucursal" AND vb.codigo_base = ca.codigo_base
          ${sucursal ? 'WHERE vb."Sucursal" = $1' : ''}
          GROUP BY vb."Sucursal"
        )
        SELECT 
          a.*, 
          COALESCE(v.total_ventas, 0) as total_ventas
        FROM ajustes_por_sucursal a
        LEFT JOIN ventas_por_sucursal v ON a."Sucursal" = v."Sucursal"
        ORDER BY total_valorizado DESC
      `;
      
      const resumen = await sql(resumenQuery, params);
      
      // Totales globales (sin límite de 500) - agrupando por código base
      const totalesQuery = `
        WITH ventas_base AS (
          SELECT 
            "Sucursal",
            TRIM(REGEXP_REPLACE("Codigo", '\\s+\\d{2}$', '')) as codigo_base,
            AVG("PrecioConIVA") as precio_promedio,
            SUM("ImporteConIVA") as total_importe
          FROM ventas_sucursales
          GROUP BY "Sucursal", TRIM(REGEXP_REPLACE("Codigo", '\\s+\\d{2}$', ''))
        ),
        ajustes_base AS (
          SELECT 
            a."Sucursal",
            TRIM(REGEXP_REPLACE(a."Codigo", '\\s+\\d{2}$', '')) as codigo_base,
            SUM(ABS(a."Diferencia")) as total_diferencia
          FROM ajustes_sucursales a
          WHERE a."FechaMovimiento" IS NOT NULL
          ${sucursal ? 'AND a."Sucursal" = $1' : ''}
          GROUP BY a."Sucursal", TRIM(REGEXP_REPLACE(a."Codigo", '\\s+\\d{2}$', ''))
        ),
        con_porcentaje AS (
          SELECT 
            ab."Sucursal",
            ab.codigo_base,
            ab.total_diferencia * COALESCE(vb.precio_promedio, 0) as total_valorizado,
            COALESCE(vb.total_importe, 0) as total_venta_valorizada,
            CASE 
              WHEN COALESCE(vb.total_importe, 0) > 0 
              THEN (ab.total_diferencia * COALESCE(vb.precio_promedio, 0) / vb.total_importe * 100)
              ELSE 0 
            END as porcentaje_perdida
          FROM ajustes_base ab
          LEFT JOIN ventas_base vb ON ab."Sucursal" = vb."Sucursal" AND ab.codigo_base = vb.codigo_base
        )
        SELECT 
          COUNT(*) as total_articulos,
          COUNT(*) FILTER (WHERE porcentaje_perdida > 3) as total_alertas
        FROM con_porcentaje
      `;
      const totales = await sql(totalesQuery, params);
      
      return {
        detalle: result.map((row: any) => ({
          sucursal: row.Sucursal,
          codigo: row.Codigo,
          articulo: row.Articulo,
          totalAjustes: parseInt(row.total_ajustes),
          totalUnidades: parseFloat(row.total_unidades),
          precioUnitario: parseFloat(row.precio_unitario),
          totalValorizado: parseFloat(row.total_valorizado),
          primerAjuste: row.primer_ajuste,
          ultimoAjuste: row.ultimo_ajuste,
          totalVendido: parseFloat(row.total_vendido),
          totalVentaValorizada: parseFloat(row.total_venta_valorizada),
          porcentajePerdida: parseFloat(row.porcentaje_perdida),
          alertaPerdida: parseFloat(row.porcentaje_perdida) > 3,
          sinAjusteAnual: row.sin_ajuste_anual === true || row.sin_ajuste_anual === 't',
          diferencia2025: parseFloat(row.diferencia_2025 || 0),
          diferencia2026: parseFloat(row.diferencia_2026 || 0)
        })),
        resumen: resumen.map((row: any) => ({
          sucursal: row.Sucursal,
          articulosConAjuste: parseInt(row.articulos_con_ajuste),
          totalUnidadesAjustadas: parseFloat(row.total_unidades_ajustadas),
          totalValorizado: parseFloat(row.total_valorizado),
          totalVentas: parseFloat(row.total_ventas),
          porcentajePerdida: parseFloat(row.total_ventas) > 0 
            ? parseFloat((parseFloat(row.total_valorizado) / parseFloat(row.total_ventas) * 100).toFixed(2))
            : 0
        })),
        totales: {
          totalArticulos: parseInt(totales[0]?.total_articulos || '0'),
          totalAlertas: parseInt(totales[0]?.total_alertas || '0')
        }
      };
    } catch (error) {
      console.error('Error getting análisis valorizado:', error);
      return { detalle: [], resumen: [], totales: { totalArticulos: 0, totalAlertas: 0 } };
    }
  }

  async getHistorialAjustesCodigo(codigo: string, sucursal?: string): Promise<any> {
    try {
      // Historial de ajustes para un código específico
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
          WHERE a."Codigo" = $1
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
}

// Create storage instance
export const storage = new PostgreSQLStorage();