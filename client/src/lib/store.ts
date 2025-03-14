import { create } from 'zustand';

export type Branch = 'SUC001' | 'SUC002' | 'SUC003' | 'SUC004' | 'SUC005';

interface ViewState {
  currentView: 'ranking' | 'details';
  setView: (view: 'ranking' | 'details') => void;
}

export const useViewStore = create<ViewState>((set) => ({
  currentView: 'ranking',
  setView: (view) => set({ currentView: view }),
}));

// Helper para obtener la colección de datos
export const getDataCollection = () => 'data';

// Lista de sucursales disponibles para el ranking
export const AVAILABLE_BRANCHES: Branch[] = ['SUC001', 'SUC002', 'SUC003', 'SUC004', 'SUC005'];