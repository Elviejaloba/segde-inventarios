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
        const initialData = AVAILABLE_BRANCHES.map(branch => ({
          id: branch,
          totalCompleted: 0,
          noStock: 0,
          items: {}
        }));
        await set(this.dbRef, initialData);
        console.log('Initial data created successfully');
      }
    } catch (error: any) {
      console.error('Firebase Error:', error);
      throw new Error('Error al conectar con la base de datos');
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
      const snapshot = await get(this.dbRef);
      if (!snapshot.exists()) {
        await this.initializeData();
      }

      const currentData = snapshot.val() || [];
      const branchIndex = currentData.findIndex((b: BranchData) => b.id === branchId);

      let updatedData;
      if (branchIndex !== -1) {
        updatedData = [...currentData];
        updatedData[branchIndex] = {
          ...updatedData[branchIndex],
          ...data,
          items: {
            ...updatedData[branchIndex].items,
            ...data.items
          }
        };
      } else {
        updatedData = [
          ...currentData,
          {
            id: branchId,
            totalCompleted: 0,
            noStock: 0,
            items: {},
            ...data
          }
        ];
      }

      // Intenta guardar los datos
      await set(this.dbRef, updatedData);
      return updatedData;
    } catch (error: any) {
      console.error('Error al actualizar sucursal:', error);
      throw new Error('No se pudieron guardar los cambios. Por favor, intente nuevamente.');
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