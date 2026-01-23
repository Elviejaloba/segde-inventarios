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
      // Obtener ajustes con precio promedio de ventas
      let query = `
        WITH ajustes_con_precio AS (
          SELECT 
            a."Sucursal",
            a."Codigo",
            a."Articulo",
            a."FechaMovimiento",
            a."TipoMovimiento",
            a."Diferencia",
            COALESCE(v.precio_promedio, 0) as precio_unitario,
            ABS(a."Diferencia") * COALESCE(v.precio_promedio, 0) as valor_ajuste
          FROM ajustes_sucursales a
          LEFT JOIN (
            SELECT "Sucursal", "Codigo", AVG("PrecioConIVA") as precio_promedio
            FROM ventas_sucursales
            GROUP BY "Sucursal", "Codigo"
          ) v ON a."Sucursal" = v."Sucursal" AND a."Codigo" = v."Codigo"
          WHERE a."FechaMovimiento" IS NOT NULL
          ${sucursal ? 'AND a."Sucursal" = $1' : ''}
        ),
        resumen_por_codigo AS (
          SELECT 
            "Sucursal",
            "Codigo",
            "Articulo",
            COUNT(*) as total_ajustes,
            SUM(ABS("Diferencia")) as total_unidades,
            SUM(valor_ajuste) as total_valorizado,
            MIN("FechaMovimiento") as primer_ajuste,
            MAX("FechaMovimiento") as ultimo_ajuste,
            precio_unitario
          FROM ajustes_con_precio
          GROUP BY "Sucursal", "Codigo", "Articulo", precio_unitario
        ),
        ventas_totales AS (
          SELECT 
            "Sucursal",
            "Codigo",
            SUM("CantidadVenta") as total_vendido,
            SUM("ImporteConIVA") as total_venta_valorizada
          FROM ventas_sucursales
          ${sucursal ? 'WHERE "Sucursal" = $1' : ''}
          GROUP BY "Sucursal", "Codigo"
        )
        SELECT 
          r.*,
          COALESCE(vt.total_vendido, 0) as total_vendido,
          COALESCE(vt.total_venta_valorizada, 0) as total_venta_valorizada,
          CASE 
            WHEN COALESCE(vt.total_venta_valorizada, 0) > 0 
            THEN ROUND((r.total_valorizado / vt.total_venta_valorizada * 100)::numeric, 2)
            ELSE 0 
          END as porcentaje_perdida,
          CASE 
            WHEN r.ultimo_ajuste < CURRENT_DATE - INTERVAL '1 year' THEN true
            ELSE false
          END as sin_ajuste_anual
        FROM resumen_por_codigo r
        LEFT JOIN ventas_totales vt ON r."Sucursal" = vt."Sucursal" AND r."Codigo" = vt."Codigo"
        ORDER BY total_valorizado DESC
        LIMIT 500
      `;
      
      const params = sucursal ? [sucursal] : [];
      const result = await sql(query, params);
      
      // Resumen general - con ventas pre-agregadas para evitar duplicados
      const resumenQuery = `
        WITH ventas_agregadas AS (
          SELECT "Sucursal", "Codigo", 
            AVG("PrecioConIVA") as precio_promedio,
            SUM("ImporteConIVA") as total_importe
          FROM ventas_sucursales
          GROUP BY "Sucursal", "Codigo"
        ),
        ajustes_por_sucursal AS (
          SELECT 
            a."Sucursal",
            COUNT(DISTINCT a."Codigo") as articulos_con_ajuste,
            SUM(ABS(a."Diferencia")) as total_unidades_ajustadas,
            SUM(ABS(a."Diferencia") * COALESCE(v.precio_promedio, 0)) as total_valorizado
          FROM ajustes_sucursales a
          LEFT JOIN ventas_agregadas v ON a."Sucursal" = v."Sucursal" AND a."Codigo" = v."Codigo"
          WHERE a."FechaMovimiento" IS NOT NULL
          ${sucursal ? 'AND a."Sucursal" = $1' : ''}
          GROUP BY a."Sucursal"
        ),
        ventas_por_sucursal AS (
          SELECT "Sucursal", SUM(total_importe) as total_ventas
          FROM ventas_agregadas
          WHERE "Codigo" IN (SELECT DISTINCT "Codigo" FROM ajustes_sucursales WHERE "FechaMovimiento" IS NOT NULL)
          ${sucursal ? 'AND "Sucursal" = $1' : ''}
          GROUP BY "Sucursal"
        )
        SELECT 
          a.*, 
          COALESCE(v.total_ventas, 0) as total_ventas
        FROM ajustes_por_sucursal a
        LEFT JOIN ventas_por_sucursal v ON a."Sucursal" = v."Sucursal"
        ORDER BY total_valorizado DESC
      `;
      
      const resumen = await sql(resumenQuery, params);
      
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
          sinAjusteAnual: row.sin_ajuste_anual === true || row.sin_ajuste_anual === 't'
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
        }))
      };
    } catch (error) {
      console.error('Error getting análisis valorizado:', error);
      return { detalle: [], resumen: [] };
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