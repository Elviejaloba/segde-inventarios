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

export type Season = 'Verano' | 'Otoño' | 'Invierno' | 'Primavera';

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

// Códigos para cada temporada
export const SEASON_CODES: Record<Season, string[]> = {
  'Verano': [
    'TA02B', 'TA139S00', 'TA139V00', 'TA139X00', 'TA166AS', 'TA166G', 'TA166K', 'TA166P',
    'TA170', 'TA170C', 'TA170L', 'TA170S', 'TA170S00', 'TA170T', 'TA194M00', 'TA23P',
    'TA36A', 'TA36Z', 'TA424R', 'TA424S', 'TA450T', 'TA451L', 'TA451S', 'TA451S00',
    'TA454T', 'TA56L', 'TA57L', 'TA57LC', 'TA60', 'TA605D', 'TA67L', 'TA75P', 'TA76F',
    'TA76S', 'TA82B', 'TA82D', 'TA82G', 'TA82P', 'TA82PL', 'TA82PT', 'TA86C',
    'TV02', 'TV02E', 'TV02M', 'TV02R', 'TV02S', 'TV02X', 'TV04M', 'TV06M', 'TV06S',
    'TV09I', 'TV136D', 'TV18M', 'TV18P', 'TV18S', 'TV215', 'TV400L', 'TV400R', 'TV400TL',
    'TV400TR', 'TV425L', 'TV444', 'TV450L', 'TV450M', 'TV451F', 'TV456M00', 'TV51P',
    'TV51S', 'TV51S00', 'TV51X', 'TV52S', 'TV52S00', 'TV56LV', 'TV605TR', 'TV74L',
    'TV76L', 'TV82', 'TV82A', 'TV82M', 'TV82S', 'TV82SM', 'TV82T', 'TV82UV', 'TV83P',
    'TV83UV', 'TV84C', 'TV84L', 'TV84M', 'TV84S', 'TV85', 'TV85M'
  ],
  'Otoño': [],
  'Invierno': [],
  'Primavera': []
};

interface ViewState {
  currentView: 'ranking' | 'details';
  setView: (view: 'ranking' | 'details') => void;
}

interface SeasonState {
  currentSeason: Season;
  setSeason: (season: Season) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  currentView: 'ranking',
  setView: (view) => set({ currentView: view }),
}));

export const useSeasonStore = create<SeasonState>((set) => ({
  currentSeason: 'Verano',
  setSeason: (season) => set({ currentSeason: season }),
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