import { ref, set, onValue, get } from 'firebase/database';
import { db } from './firebase';
import { Branch, AVAILABLE_BRANCHES } from './store';

interface BranchData {
  id: string;
  totalCompleted: number;
  noStock: number;
  items: Record<string, { completed: boolean; hasStock: boolean }>;
}

class FirebaseStorage {
  private dbRef = ref(db, 'branches');

  async initializeData() {
    try {
      console.log('Initializing Firebase data...');
      const snapshot = await get(this.dbRef);

      if (!snapshot.exists()) {
        console.log('Creating initial data structure...');
        // Asegurarnos de que todos los items comienzan con hasStock = true
        const initialData = AVAILABLE_BRANCHES.map(branch => ({
          id: branch,
          totalCompleted: 0,
          noStock: 0,
          items: {} // Los items se inicializarán cuando se interactúe con ellos
        }));
        await set(this.dbRef, initialData);
        console.log('Initial data created successfully');
      }
    } catch (error: any) {
      console.error('Firebase Error:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw new Error('Error al conectar con la base de datos. Por favor verifica tu conexión y los permisos de Firebase.');
    }
  }

  subscribeToData(callback: (data: BranchData[]) => void) {
    return onValue(this.dbRef, 
      (snapshot) => {
        const data = snapshot.val() || [];
        callback(data);
      },
      (error) => {
        console.error('Firebase subscription error:', error);
        callback([]);
      }
    );
  }

  async updateBranch(branchId: Branch, data: Partial<BranchData>) {
    try {
      console.log(`Intentando actualizar sucursal ${branchId}...`);

      // Primero verificamos que podemos leer los datos actuales
      const snapshot = await get(this.dbRef);
      if (!snapshot.exists()) {
        throw new Error('No se encontró la estructura de datos inicial');
      }

      const allData = snapshot.val() || [];
      const index = allData.findIndex((b: BranchData) => b.id === branchId);

      // Preparar los datos actualizados
      let updatedData;
      if (index !== -1) {
        updatedData = [...allData];
        updatedData[index] = { ...updatedData[index], ...data };
      } else {
        updatedData = [
          ...allData,
          {
            id: branchId,
            totalCompleted: 0,
            noStock: 0,
            items: {},
            ...data
          }
        ];
      }

      // Intentar guardar los datos
      console.log('Guardando datos actualizados...');
      await set(this.dbRef, updatedData);
      console.log('Datos guardados exitosamente');

      return updatedData;
    } catch (error: any) {
      console.error('Error al actualizar sucursal:', {
        error: error.message,
        code: error.code,
        branch: branchId
      });

      throw new Error('No se pudieron guardar los cambios');
    }
  }

  async resetAllData() {
    try {
      const initialData = AVAILABLE_BRANCHES.map(branch => ({
        id: branch,
        totalCompleted: 0,
        noStock: 0,
        items: {}
      }));
      await set(this.dbRef, initialData);
      console.log('Base de datos reinicializada exitosamente');
      return initialData;
    } catch (error: any) {
      console.error('Error al reiniciar datos:', error);
      throw new Error('No se pudo reiniciar la base de datos');
    }
  }
}

export const storage = new FirebaseStorage();