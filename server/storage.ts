import { users, type User, type InsertUser, type Ajuste, type InsertAjuste } from "@shared/schema";

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private ajustes: Map<number, Ajuste>;
  private currentUserId: number;
  private currentAjusteId: number;

  constructor() {
    this.users = new Map();
    this.ajustes = new Map();
    this.currentUserId = 1;
    this.currentAjusteId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAjustes(sucursal?: string): Promise<Ajuste[]> {
    const allAjustes = Array.from(this.ajustes.values());
    if (sucursal) {
      return allAjustes.filter(ajuste => ajuste.Sucursal === sucursal);
    }
    return allAjustes;
  }

  async getAjustesBySucursal(sucursal: string): Promise<Ajuste[]> {
    return Array.from(this.ajustes.values()).filter(
      ajuste => ajuste.Sucursal === sucursal
    );
  }

  async createAjuste(insertAjuste: InsertAjuste): Promise<Ajuste> {
    const id = this.currentAjusteId++;
    const ajuste: Ajuste = { ...insertAjuste, id };
    this.ajustes.set(id, ajuste);
    return ajuste;
  }

  async getAjustesStats(): Promise<{
    totalAjustes: number;
    totalUnidades: number;
    sucursales: string[];
    porSucursal: Array<{ sucursal: string; count: number; total: number; }>;
  }> {
    const allAjustes = Array.from(this.ajustes.values());
    const totalAjustes = allAjustes.length;
    const totalUnidades = allAjustes.reduce((sum, ajuste) => sum + ajuste.Diferencia, 0);
    
    const sucursalesSet = new Set(allAjustes.map(ajuste => ajuste.Sucursal));
    const sucursales = Array.from(sucursalesSet);
    
    const porSucursal = sucursales.map(sucursal => {
      const ajustesSucursal = allAjustes.filter(ajuste => ajuste.Sucursal === sucursal);
      return {
        sucursal,
        count: ajustesSucursal.length,
        total: ajustesSucursal.reduce((sum, ajuste) => sum + ajuste.Diferencia, 0)
      };
    });

    return {
      totalAjustes,
      totalUnidades,
      sucursales,
      porSucursal
    };
  }
}

export const storage = new MemStorage();
