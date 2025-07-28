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

export type Season = 'temporada-verano' | null;

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

// Códigos para la temporada de verano (81 códigos específicos)
export const SEASON_CODES_TEMPORADA_VERANO = [
  'TA001', 'TA002', 'TA003', 'TA004', 'TA005', 'TA006', 'TA007', 'TA008', 'TA009', 'TA010',
  'TA011', 'TA012', 'TA013', 'TA014', 'TA015', 'TA016', 'TA017', 'TA018', 'TA019', 'TA020',
  'TA021', 'TA022', 'TA023', 'TA024', 'TA025', 'TA026', 'TA027', 'TA028', 'TA029', 'TA030',
  'TA031', 'TA032', 'TA033', 'TA034', 'TA035', 'TA036', 'TA037', 'TA038', 'TA039', 'TA040',
  'TV001', 'TV002', 'TV003', 'TV004', 'TV005', 'TV006', 'TV007', 'TV008', 'TV009', 'TV010',
  'TV011', 'TV012', 'TV013', 'TV014', 'TV015', 'TV016', 'TV017', 'TV018', 'TV019', 'TV020',
  'TV021', 'TV022', 'TV023', 'TV024', 'TV025', 'TV026', 'TV027', 'TV028', 'TV029', 'TV030',
  'TV031', 'TV032', 'TV033', 'TV034', 'TV035', 'TV036', 'TV037', 'TV038', 'TV039', 'TV040', 'TV041'
];

interface ViewState {
  currentView: 'ranking' | 'details';
  setView: (view: 'ranking' | 'details') => void;
}

interface SeasonState {
  currentSeason: Season;
  setCurrentSeason: (season: Season) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  currentView: 'ranking',
  setView: (view) => set({ currentView: view }),
}));

export const useSeasonStore = create<SeasonState>((set) => ({
  currentSeason: null,
  setCurrentSeason: (season) => set({ currentSeason: season }),
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