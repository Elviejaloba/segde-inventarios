import { useQuery } from '@tanstack/react-query';


interface AjusteData {
  id: number;
  Sucursal: string;
  Comprobante: string;
  FechaMovimiento: string;
  TipoMovimiento: string;
  Codigo: string;
  Articulo: string;
  Diferencia: number;
}

interface StatsData {
  totalAjustes: number;
  totalUnidades: number;
  sucursales: string[];
  porSucursal: Array<{ sucursal: string; count: number; total: number; }>;
}

export function useAjustesStats() {
  return useQuery({
    queryKey: ['/api/ajustes/stats'],
    queryFn: async (): Promise<StatsData> => {
      const response = await fetch('/api/ajustes/stats', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse JSON:', text);
        throw new Error('Invalid JSON response');
      }
    },
    refetchInterval: 30000, // Refrescar cada 30 segundos
    staleTime: 10000, // 10 segundos
  });
}

export function useAjustesList(sucursal?: string) {
  return useQuery({
    queryKey: ['/api/ajustes', sucursal],
    queryFn: async (): Promise<AjusteData[]> => {
      const url = sucursal 
        ? `/api/ajustes?sucursal=${encodeURIComponent(sucursal)}` 
        : '/api/ajustes';
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse JSON:', text);
        throw new Error('Invalid JSON response');
      }
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });
}