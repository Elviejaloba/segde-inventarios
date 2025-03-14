import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Branch = 'SUC001' | 'SUC002' | 'SUC003' | 'SUC004' | 'SUC005';

interface BranchState {
  selectedBranch: Branch | null;
  setSelectedBranch: (branch: Branch) => void;
  clearSelectedBranch: () => void;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      selectedBranch: null,
      setSelectedBranch: (branch) => set({ selectedBranch: branch }),
      clearSelectedBranch: () => set({ selectedBranch: null }),
    }),
    {
      name: 'branch-storage',
    }
  )
);

// Helper para obtener la colección específica de una sucursal
export const getBranchCollection = (branchCode: Branch) => `branches/${branchCode}/data`;

// Lista de sucursales disponibles
export const AVAILABLE_BRANCHES: Branch[] = ['SUC001', 'SUC002', 'SUC003', 'SUC004', 'SUC005'];