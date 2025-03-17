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
      const snapshot = await get(this.dbRef);
      const allData = snapshot.val() || [];
      const index = allData.findIndex((b: BranchData) => b.id === branchId);

      if (index !== -1) {
        allData[index] = { ...allData[index], ...data };
      } else {
        allData.push({ 
          id: branchId,
          totalCompleted: 0,
          noStock: 0,
          items: {},
          ...data
        });
      }

      await set(this.dbRef, allData);
      return allData;
    } catch (error) {
      console.error('Error updating branch:', error);
      throw new Error('No se pudieron guardar los cambios');
    }
  }
}

export const storage = new FirebaseStorage();