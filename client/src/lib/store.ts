import { create } from 'zustand';

export type Branch = 
  | 'T.Mendoza' 
  | 'T.SJuan' 
  | 'T.SLuis' 
  | 'Crisa2' 
  | 'T.SMartin' 
  | 'T.Tunuyan' 
  | 'T.Lujan' 
  | 'T.Maipu' 
  | 'T.SRafael';

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
export const AVAILABLE_BRANCHES: Branch[] = [
  'T.Mendoza',
  'T.SJuan',
  'T.SLuis',
  'Crisa2',
  'T.SMartin',
  'T.Tunuyan',
  'T.Lujan',
  'T.Maipu',
  'T.SRafael'
];