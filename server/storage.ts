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
}

// Create storage instance
export const storage = new PostgreSQLStorage();