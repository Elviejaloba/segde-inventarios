import { create } from 'zustand';

export type Branch = 
  | 'T.S.Martin' 
  | 'T.Lujan' 
  | 'T.Maipu' 
  | 'T.Tunuyan' 
  | 'T.Sjuan' 
  | 'T.Mendoza' 
  | 'T.Luis' 
  | 'Crisa2' 
  | 'T.Srafael';

// Mapeo de nombres de sucursales del Excel a Firebase
export const SUCURSAL_MAPPING: Record<string, Branch> = {
  'LA TIJERA SMARTIN': 'T.S.Martin',
  'LA TIJERA LUJAN': 'T.Lujan',
  'LA TIJERA MAIPU': 'T.Maipu',
  'LA TIJERA TUNUYAN': 'T.Tunuyan',
  'LA TIJERA SAN JUAN': 'T.Sjuan',
  'LA TIJERA MENDOZA': 'T.Mendoza',
  'LA TIJERA SAN LUIS': 'T.Luis',
  'CRISA 2': 'Crisa2',
  'LA TIJERA SAN RAFAEL': 'T.Srafael'
};

interface ViewState {
  currentView: 'ranking' | 'details';
  setView: (view: 'ranking' | 'details') => void;
}

export const useViewStore = create<ViewState>((set) => ({
  currentView: 'ranking',
  setView: (view) => set({ currentView: view }),
}));

// Lista de sucursales disponibles para el ranking
export const AVAILABLE_BRANCHES: Branch[] = [
  'T.Mendoza',
  'T.Sjuan',
  'T.Luis',
  'Crisa2',
  'T.S.Martin',
  'T.Tunuyan',
  'T.Lujan',
  'T.Maipu',
  'T.Srafael'
];