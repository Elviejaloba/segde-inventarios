import { Branch, AVAILABLE_BRANCHES } from './store';

interface BranchData {
  id: string;
  totalCompleted: number;
  noStock: number;
  items: Record<string, { completed: boolean; hasStock: boolean }>;
}

class LocalStorage {
  private storageKey = 'branch_data';

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    if (!localStorage.getItem(this.storageKey)) {
      const initialData = AVAILABLE_BRANCHES.map(branch => ({
        id: branch,
        totalCompleted: 0,
        noStock: 0,
        items: {}
      }));
      localStorage.setItem(this.storageKey, JSON.stringify(initialData));
    }
  }

  getData(): BranchData[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  updateBranch(branchId: Branch, data: Partial<BranchData>) {
    const allData = this.getData();
    const index = allData.findIndex(b => b.id === branchId);

    if (index !== -1) {
      allData[index] = { ...allData[index], ...data };
    } else {
      allData.push({ id: branchId, totalCompleted: 0, noStock: 0, items: {}, ...data });
    }

    localStorage.setItem(this.storageKey, JSON.stringify(allData));
    return allData;
  }
}

export const storage = new LocalStorage();