import { ref, set, onValue, get } from 'firebase/database';
import { db } from './firebase';
import { Branch, AVAILABLE_BRANCHES, Season, SEASON_CODES_TEMPORADA_VERANO } from './store';

interface BranchData {
  id: string;
  totalCompleted: number;
  noStock: number;
  items: Record<string, { completed: boolean; hasStock: boolean; lastUpdated?: number }>;
  lastUpdated?: number;
}

interface AjusteData {
  nroComprobante: number;
  fechaMovimiento: string;
  tipoMovimiento: string;
  codArticulo: string;
  articulo: string;
  sucursal: string;
  cantidad: number;
}

class FirebaseStorage {
  private dbRef = ref(db, 'branches');
  private ajustesRef = ref(db, 'ajustes');
  
  // Referencias para temporadas
  private getSeasonRef(season: Season) {
    return ref(db, `seasons/${season}`);
  }

  async initializeData() {
    try {
      console.log('Checking Firebase data...');
      const snapshot = await get(this.dbRef);

      if (!snapshot.exists()) {
        console.log('Creating initial data structure with summer season codes...');
        const initialData = AVAILABLE_BRANCHES.map(branch => {
          const items: Record<string, { completed: boolean; hasStock: boolean; lastUpdated: number }> = {};
          
          // Inicializar todos los códigos de temporada de verano
          SEASON_CODES_TEMPORADA_VERANO.forEach(code => {
            items[code] = {
              completed: false,
              hasStock: true,
              lastUpdated: Date.now()
            };
          });

          return {
            id: branch,
            totalCompleted: 0,
            noStock: 0,
            items,
            lastUpdated: Date.now()
          };
        });
        await set(this.dbRef, initialData);
        console.log('Initial data created successfully with summer season codes');
      } else {
        console.log('Data structure already exists');
      }

      // Inicializar datos de ajustes si no existen
      const ajustesSnapshot = await get(this.ajustesRef);
      if (!ajustesSnapshot.exists()) {
        console.log('Initializing ajustes data structure...');
        await set(this.ajustesRef, []);
      }
    } catch (error: any) {
      console.error('Firebase Error:', error);
      throw new Error('Error al conectar con la base de datos');
    }
  }

  subscribeToData(callback: (data: BranchData[]) => void) {
    console.log('Estableciendo suscripción a Firebase...');

    const unsubscribe = onValue(this.dbRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          console.log('Datos recibidos de Firebase:', data);
          if (Array.isArray(data)) {
            callback(data);
          } else {
            console.error('Datos recibidos no son un array:', data);
            callback([]);
          }
        } else {
          console.log('No hay datos en Firebase');
          callback([]);
        }
      },
      (error) => {
        console.error('Error en suscripción Firebase:', error);
        callback([]);
      }
    );

    return unsubscribe;
  }

  subscribeToAjustes(callback: (data: AjusteData[]) => void) {
    console.log('Estableciendo suscripción a ajustes...');
    return onValue(this.ajustesRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          console.log('Datos de ajustes recibidos:', data);
          callback(data);
        } else {
          console.log('No hay datos de ajustes');
          callback([]);
        }
      },
      (error) => {
        console.error('Error al obtener ajustes:', error);
        callback([]);
      }
    );
  }

  async updateBranch(branchId: Branch, data: Partial<BranchData>): Promise<BranchData> {
    try {
      console.log(`Actualizando sucursal ${branchId}...`, data);
      const snapshot = await get(this.dbRef);

      if (!snapshot.exists()) {
        await this.initializeData();
        return this.updateBranch(branchId, data);
      }

      const currentData = snapshot.val() || [];
      const branchIndex = currentData.findIndex((b: BranchData) => b.id === branchId);
      const timestamp = Date.now();

      let updatedData;
      if (branchIndex !== -1) {
        updatedData = [...currentData];
        updatedData[branchIndex] = {
          ...updatedData[branchIndex],
          ...data,
          items: {
            ...updatedData[branchIndex].items,
            ...data.items
          },
          lastUpdated: timestamp
        };
      } else {
        updatedData = [
          ...currentData,
          {
            id: branchId,
            totalCompleted: 0,
            noStock: 0,
            items: {},
            ...data,
            lastUpdated: timestamp
          }
        ];
      }

      console.log('Guardando datos actualizados:', updatedData);
      await set(this.dbRef, updatedData);
      return updatedData[branchIndex >= 0 ? branchIndex : updatedData.length - 1] as BranchData;
    } catch (error: any) {
      console.error('Error al actualizar sucursal:', error);
      throw new Error('No se pudieron guardar los cambios. Por favor, intente nuevamente.');
    }
  }

  async updateAjustes(ajustes: AjusteData[]) {
    try {
      console.log('Actualizando datos de ajustes...', ajustes);
      await set(this.ajustesRef, ajustes);
      console.log('Datos de ajustes actualizados exitosamente');
      return ajustes;
    } catch (error: any) {
      console.error('Error al actualizar ajustes:', error);
      throw new Error('Error al actualizar datos de ajustes');
    }
  }

  async resetAllData() {
    try {
      // Inicializar con códigos de temporada de verano
      const initialData = AVAILABLE_BRANCHES.map(branch => {
        const items: Record<string, { completed: boolean; hasStock: boolean; lastUpdated: number }> = {};
        
        // Inicializar todos los códigos de temporada de verano
        SEASON_CODES_TEMPORADA_VERANO.forEach(code => {
          items[code] = {
            completed: false,
            hasStock: true,
            lastUpdated: Date.now()
          };
        });

        return {
          id: branch,
          totalCompleted: 0,
          noStock: 0,
          items,
          lastUpdated: Date.now()
        };
      });
      
      await set(this.dbRef, initialData);
      await set(this.ajustesRef, []);
      console.log('Base de datos reinicializada exitosamente con códigos de temporada de verano');
      return initialData;
    } catch (error: any) {
      console.error('Error al reiniciar datos:', error);
      throw new Error('No se pudo reiniciar la base de datos');
    }
  }

  // Función especial para migrar datos existentes a códigos de temporada de verano
  async migrateToSeasonCodes() {
    try {
      console.log('Migrando datos existentes a códigos de temporada de verano...');
      await this.resetAllData();
      console.log('Migración completada exitosamente');
      return true;
    } catch (error: any) {
      console.error('Error durante la migración:', error);
      throw new Error('No se pudo completar la migración');
    }
  }

  // Funciones para manejo de temporadas
  async initializeSeasonData(season: Season, codes: string[]) {
    try {
      console.log(`Inicializando temporada ${season}...`);
      const seasonRef = this.getSeasonRef(season);
      
      if (codes.length === 0) {
        throw new Error(`No hay códigos definidos para la temporada ${season}`);
      }

      const seasonData = AVAILABLE_BRANCHES.map(branch => {
        const items: Record<string, { completed: boolean; hasStock: boolean; lastUpdated: number }> = {};
        
        // Inicializar todos los códigos de la temporada
        codes.forEach(code => {
          items[code] = {
            completed: false,
            hasStock: true,
            lastUpdated: Date.now()
          };
        });

        return {
          id: branch,
          totalCompleted: 0,
          noStock: 0,
          items,
          lastUpdated: Date.now()
        };
      });

      await set(seasonRef, seasonData);
      console.log(`Temporada ${season} inicializada con ${codes.length} códigos`);
      return seasonData;
    } catch (error: any) {
      console.error(`Error al inicializar temporada ${season}:`, error);
      throw new Error(`No se pudo inicializar la temporada ${season}`);
    }
  }

  async resetSeasonData(season: Season, codes: string[]) {
    try {
      console.log(`Reiniciando temporada ${season}...`);
      const seasonRef = this.getSeasonRef(season);
      
      const seasonData = AVAILABLE_BRANCHES.map(branch => {
        const items: Record<string, { completed: boolean; hasStock: boolean; lastUpdated: number }> = {};
        
        // Reinicializar todos los códigos de la temporada
        codes.forEach(code => {
          items[code] = {
            completed: false,
            hasStock: true,
            lastUpdated: Date.now()
          };
        });

        return {
          id: branch,
          totalCompleted: 0,
          noStock: 0,
          items,
          lastUpdated: Date.now()
        };
      });

      await set(seasonRef, seasonData);
      console.log(`Temporada ${season} reiniciada`);
      return seasonData;
    } catch (error: any) {
      console.error(`Error al reiniciar temporada ${season}:`, error);
      throw new Error(`No se pudo reiniciar la temporada ${season}`);
    }
  }

  subscribeToSeasonData(season: Season, callback: (data: BranchData[]) => void) {
    console.log(`Estableciendo suscripción a temporada ${season}...`);
    const seasonRef = this.getSeasonRef(season);

    const unsubscribe = onValue(seasonRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          console.log(`Datos de temporada ${season} recibidos:`, data);
          if (Array.isArray(data)) {
            callback(data);
          } else {
            console.error('Datos de temporada no son un array:', data);
            callback([]);
          }
        } else {
          console.log(`No hay datos para la temporada ${season}`);
          callback([]);
        }
      },
      (error) => {
        console.error(`Error en suscripción a temporada ${season}:`, error);
        callback([]);
      }
    );

    return unsubscribe;
  }

  async updateSeasonBranch(season: Season, branchId: Branch, data: Partial<BranchData>): Promise<BranchData> {
    try {
      console.log(`Actualizando sucursal ${branchId} en temporada ${season}...`, data);
      const seasonRef = this.getSeasonRef(season);
      const snapshot = await get(seasonRef);

      if (!snapshot.exists()) {
        // Si la temporada no existe, inicializarla primero
        const codes = season === 'temporada-verano' ? SEASON_CODES_TEMPORADA_VERANO : [];
        await this.initializeSeasonData(season, codes);
        return this.updateSeasonBranch(season, branchId, data);
      }

      const currentData = snapshot.val() || [];
      const branchIndex = currentData.findIndex((b: BranchData) => b.id === branchId);
      const timestamp = Date.now();

      let updatedData;
      if (branchIndex !== -1) {
        updatedData = [...currentData];
        updatedData[branchIndex] = {
          ...updatedData[branchIndex],
          ...data,
          lastUpdated: timestamp
        };
      } else {
        // Crear nueva sucursal si no existe
        const newBranchData = {
          id: branchId,
          totalCompleted: 0,
          noStock: 0,
          items: {},
          ...data,
          lastUpdated: timestamp
        };
        updatedData = [...currentData, newBranchData];
      }

      await set(seasonRef, updatedData);
      console.log(`Sucursal ${branchId} actualizada exitosamente en temporada ${season}`);
      return updatedData[branchIndex];
    } catch (error: any) {
      console.error(`Error al actualizar sucursal en temporada ${season}:`, error);
      throw new Error('No se pudieron guardar los cambios. Por favor, intente nuevamente.');
    }
  }
}

export const storage = new FirebaseStorage();