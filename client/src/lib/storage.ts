import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from './firebase';
import { Branch, AVAILABLE_BRANCHES } from './store';

interface BranchData {
  id: string;
  totalCompleted: number;
  noStock: number;
  items: Record<string, { completed: boolean; hasStock: boolean }>;
}

class LocalStorage {
  private storageKey = 'branch_data';
  private localData: BranchData[] = [];

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    const storedData = localStorage.getItem(this.storageKey);
    if (!storedData) {
      this.localData = AVAILABLE_BRANCHES.map(branch => ({
        id: branch,
        totalCompleted: 0,
        noStock: 0,
        items: {}
      }));
      this.saveToLocalStorage();
    } else {
      this.localData = JSON.parse(storedData);
    }
  }

  private saveToLocalStorage() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.localData));
  }

  getData(): BranchData[] {
    return this.localData;
  }

  async updateBranch(branchId: Branch, data: Partial<BranchData>) {
    // Actualizar datos locales
    const index = this.localData.findIndex(b => b.id === branchId);
    if (index !== -1) {
      this.localData[index] = { ...this.localData[index], ...data };
    } else {
      this.localData.push({ id: branchId, totalCompleted: 0, noStock: 0, items: {}, ...data });
    }
    this.saveToLocalStorage();

    // Sincronizar con Firestore
    try {
      const branchRef = doc(collection(db, 'branches'), branchId);
      await setDoc(branchRef, data, { merge: true });
    } catch (error) {
      console.error('Error al sincronizar con Firestore:', error);
      throw new Error('Error al guardar los datos en la nube');
    }

    return this.localData;
  }
}

export const storage = new LocalStorage();