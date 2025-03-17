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
  private dbRef = ref(db, 'test'); // Primero probamos con una referencia simple

  async testConnection() {
    try {
      console.log('Testing Firebase connection...');
      const testRef = ref(db, 'connection-test');
      await set(testRef, { timestamp: Date.now() });
      const snapshot = await get(testRef);
      console.log('Connection test successful:', snapshot.exists());
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  async initializeData() {
    try {
      // Primero verificamos la conexión
      const isConnected = await this.testConnection();
      if (!isConnected) {
        throw new Error('No se pudo establecer conexión con Firebase');
      }

      this.dbRef = ref(db, 'branches');
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
    } catch (error) {
      console.error('Error initializing data:', error);
      throw error;
    }
  }

  subscribeToData(callback: (data: BranchData[]) => void) {
    onValue(this.dbRef, 
      (snapshot) => {
        const data = snapshot.val() || [];
        callback(data);
      }, 
      (error) => {
        console.error('Subscription error:', error);
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
      throw error;
    }
  }
}

export const storage = new FirebaseStorage();