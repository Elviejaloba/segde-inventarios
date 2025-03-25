import { ref, set, onValue, get } from 'firebase/database';
import { db } from './firebase';
import { Branch, AVAILABLE_BRANCHES } from './store';

interface BranchData {
  id: string;
  totalCompleted: number;
  noStock: number;
  items: Record<string, { completed: boolean; hasStock: boolean; lastUpdated?: number }>;
  lastUpdated?: number;
}

interface AjusteData {
  tipo: string;
  comprobante: string;
  nroComprobante: number;
  fechaMovimiento: string;
  tipoMovimiento: string;
  codArticulo: string;
  articulo: string;
  sucursal: string;
  codClasificacion?: number;
  cantidad: number;
  cantidadDevuelta: number;
  precioVenta: number;
  stock1: number;
  cantidad2: number;
  cantidad2Devuelta: number;
}

class FirebaseStorage {
  private dbRef = ref(db, 'branches');
  private ajustesRef = ref(db, 'ajustes');

  async initializeData() {
    try {
      console.log('Checking Firebase data...');
      const snapshot = await get(this.dbRef);

      if (!snapshot.exists()) {
        console.log('Creating initial data structure...');
        const initialData = AVAILABLE_BRANCHES.map(branch => ({
          id: branch,
          totalCompleted: 0,
          noStock: 0,
          items: {},
          lastUpdated: Date.now()
        }));
        await set(this.dbRef, initialData);
        console.log('Initial data created successfully');
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

  async updateBranch(branchId: Branch, data: Partial<BranchData>) {
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
      return updatedData;
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
      const initialData = AVAILABLE_BRANCHES.map(branch => ({
        id: branch,
        totalCompleted: 0,
        noStock: 0,
        items: {},
        lastUpdated: Date.now()
      }));
      await set(this.dbRef, initialData);
      await set(this.ajustesRef, []);
      console.log('Base de datos reinicializada exitosamente');
      return initialData;
    } catch (error: any) {
      console.error('Error al reiniciar datos:', error);
      throw new Error('No se pudo reiniciar la base de datos');
    }
  }
}

export const storage = new FirebaseStorage();