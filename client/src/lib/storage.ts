import { ref, set, onValue, get } from 'firebase/database';
import { db } from './firebase';
import { Branch, AVAILABLE_BRANCHES } from './store';
import { retryOperation } from './firebase';

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
      await retryOperation(async () => {
        const snapshot = await get(this.dbRef);
        if (!snapshot.exists()) {
          const initialData = AVAILABLE_BRANCHES.map(branch => ({
            id: branch,
            totalCompleted: 0,
            noStock: 0,
            items: {}
          }));
          await set(this.dbRef, initialData);
        }
      });
    } catch (error) {
      console.error('Error initializing Firebase data:', error);
      throw new Error('No se pudo inicializar la conexión con Firebase');
    }
  }

  subscribeToData(callback: (data: BranchData[]) => void) {
    onValue(this.dbRef, (snapshot) => {
      try {
        const data = snapshot.val() || [];
        callback(data);
      } catch (error) {
        console.error('Error reading Firebase data:', error);
        callback([]); // Retorna array vacío en caso de error
      }
    }, (error) => {
      console.error('Error subscribing to Firebase:', error);
      callback([]); // Retorna array vacío en caso de error de suscripción
    });
  }

  async getData(): Promise<BranchData[]> {
    try {
      const snapshot = await retryOperation(() => get(this.dbRef));
      return snapshot.val() || [];
    } catch (error) {
      console.error('Error getting Firebase data:', error);
      return [];
    }
  }

  async updateBranch(branchId: Branch, data: Partial<BranchData>) {
    try {
      const allData = await this.getData();
      const index = allData.findIndex(b => b.id === branchId);

      if (index !== -1) {
        allData[index] = { ...allData[index], ...data };
      } else {
        allData.push({ id: branchId, totalCompleted: 0, noStock: 0, items: {}, ...data });
      }

      await retryOperation(() => set(this.dbRef, allData));
      return allData;
    } catch (error) {
      console.error('Error updating Firebase data:', error);
      throw new Error('No se pudo actualizar los datos en Firebase');
    }
  }
}

export const storage = new FirebaseStorage();