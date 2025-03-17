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
    }
  }

  subscribeToData(callback: (data: BranchData[]) => void) {
    onValue(this.dbRef, (snapshot) => {
      const data = snapshot.val() || [];
      callback(data);
    });
  }

  async updateBranch(branchId: Branch, data: Partial<BranchData>) {
    try {
      const allData = await get(this.dbRef).then(snap => snap.val() || []);
      const index = allData.findIndex(b => b.id === branchId);

      if (index !== -1) {
        allData[index] = { ...allData[index], ...data };
      } else {
        allData.push({ id: branchId, totalCompleted: 0, noStock: 0, items: {}, ...data });
      }

      await set(this.dbRef, allData);
      return allData;
    } catch (error) {
      console.error('Error updating data:', error);
      throw error;
    }
  }
}

export const storage = new FirebaseStorage();