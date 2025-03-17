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
  }

  subscribeToData(callback: (data: BranchData[]) => void) {
    onValue(this.dbRef, (snapshot) => {
      const data = snapshot.val() || [];
      callback(data);
    });
  }

  async getData(): Promise<BranchData[]> {
    const snapshot = await get(this.dbRef);
    return snapshot.val() || [];
  }

  async updateBranch(branchId: Branch, data: Partial<BranchData>) {
    const allData = await this.getData();
    const index = allData.findIndex(b => b.id === branchId);

    if (index !== -1) {
      allData[index] = { ...allData[index], ...data };
    } else {
      allData.push({ id: branchId, totalCompleted: 0, noStock: 0, items: {}, ...data });
    }

    await set(this.dbRef, allData);
    return allData;
  }
}

export const storage = new FirebaseStorage();