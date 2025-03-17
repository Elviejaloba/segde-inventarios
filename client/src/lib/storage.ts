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
      console.log('Initializing Firebase connection...');
      const snapshot = await get(this.dbRef);
      console.log('Connection successful, checking data existence...');

      if (!snapshot.exists()) {
        console.log('No existing data found, initializing with default data...');
        const initialData = AVAILABLE_BRANCHES.map(branch => ({
          id: branch,
          totalCompleted: 0,
          noStock: 0,
          items: {}
        }));
        await set(this.dbRef, initialData);
        console.log('Default data initialized successfully');
      } else {
        console.log('Existing data found');
      }
    } catch (error) {
      console.error('Firebase initialization error:', error);
      throw new Error('No se pudo establecer conexión con la base de datos');
    }
  }

  subscribeToData(callback: (data: BranchData[]) => void) {
    console.log('Setting up real-time data subscription...');
    onValue(this.dbRef, 
      (snapshot) => {
        console.log('Received real-time update');
        const data = snapshot.val() || [];
        callback(data);
      }, 
      (error) => {
        console.error('Real-time subscription error:', error);
        callback([]); // Return empty array on error
      }
    );
  }

  async updateBranch(branchId: Branch, data: Partial<BranchData>) {
    try {
      console.log(`Updating branch ${branchId}...`);
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
      console.log(`Branch ${branchId} updated successfully`);
      return allData;
    } catch (error) {
      console.error('Error updating branch:', error);
      throw new Error('No se pudieron actualizar los datos');
    }
  }
}

export const storage = new FirebaseStorage();