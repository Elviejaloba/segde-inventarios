import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';

export type Temporada = 'todas' | 'invierno' | 'verano';

function estaEnTemporada(fechaStr: string | number, temporada: Temporada): boolean {
  if (temporada === 'todas') return true;

  try {
    // Si es un string, verificar si ya está en formato DD/MM/YYYY
    if (typeof fechaStr === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fechaStr)) {
      const [dia, mes] = fechaStr.split('/').map(Number);

      if (temporada === 'invierno') {
        // 1/3 al 31/8
        return mes >= 3 && mes <= 8;
      } else if (temporada === 'verano') {
        // 1/9 al 28/2
        return mes >= 9 || mes <= 2;
      }
    }

    // Si es un número serial de Excel, convertirlo a fecha
    const EXCEL_START_DATE = new Date(1899, 11, 30);
    const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
    const fecha = typeof fechaStr === 'number' 
      ? new Date(EXCEL_START_DATE.getTime() + fechaStr * MILLISECONDS_PER_DAY)
      : new Date(fechaStr);

    const mes = fecha.getMonth() + 1; // getMonth() devuelve 0-11

    if (temporada === 'invierno') {
      return mes >= 3 && mes <= 8;
    } else if (temporada === 'verano') {
      return mes >= 9 || mes <= 2;
    }

    return true;
  } catch (error) {
    console.error('Error procesando fecha:', fechaStr, error);
    return true; // En caso de error, incluir el registro
  }
}

interface AjustesMetrics {
  topSucursales: Array<{
    sucursal: string;
    cantidad: number;
    unidades: number;
  }>;
  topArticulos: Array<{
    codigo: string;
    articulo: string;
    cantidad: number;
    sucursal: string;
    nroComprobante: number;
  }>;
  ajustesPorComprobante: Array<{
    nroComprobante: number;
    fecha: string;
    sucursal: string;
    cantidad: number;
    articulo: string;
    codArticulo: string;
  }>;
  resumen: {
    totalAjustes: number;
    totalUnidades: number;
    sucursalMasImpacto: {
      nombre: string;
      cantidad: number;
    };
  };
}

export function useAjustesData(sucursal?: string, temporada: Temporada = 'todas') {
  const [metrics, setMetrics] = useState<AjustesMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);

        const unsubscribe = storage.subscribeToAjustes((data) => {
          if (!mounted || !data) {
            return;
          }

          // Filtrar por sucursal y temporada
          let filteredData = data;
          if (sucursal && sucursal !== 'Todas las Sucursales') {
            filteredData = filteredData.filter(d => d.sucursal === sucursal);
          }

          // Aplicar filtro de temporada
          filteredData = filteredData.filter(d => estaEnTemporada(d.fechaMovimiento, temporada));

          // Calcular métricas
          const topSucursales = calcularTopSucursales(filteredData);
          const topArticulos = calcularTopArticulos(filteredData);
          const ajustesPorComprobante = calcularAjustesPorComprobante(filteredData);
          const resumen = calcularResumen(filteredData);

          setMetrics({
            topSucursales,
            topArticulos,
            ajustesPorComprobante,
            resumen
          });
          setError(null);
          setLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error cargando datos:', error);
        if (mounted) {
          setError('Error al cargar los datos');
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [sucursal, temporada]);

  return { metrics, loading, error };
}

function calcularTopSucursales(data: any[]) {
  const sucursales = data.reduce((acc, ajuste) => {
    if (!acc[ajuste.sucursal]) {
      acc[ajuste.sucursal] = {
        cantidad: 0,
        unidades: 0
      };
    }
    acc[ajuste.sucursal].cantidad++;
    acc[ajuste.sucursal].unidades += Math.abs(Number(ajuste.cantidad));
    return acc;
  }, {});

  return Object.entries(sucursales)
    .map(([sucursal, data]: [string, any]) => ({
      sucursal,
      cantidad: data.cantidad,
      unidades: data.unidades
    }))
    .sort((a, b) => Math.abs(b.unidades) - Math.abs(a.unidades))
    .slice(0, 5);
}

function calcularTopArticulos(data: any[]) {
  const articulos = data.reduce((acc, ajuste) => {
    const key = `${ajuste.codArticulo}-${ajuste.sucursal}`;
    if (!acc[key]) {
      acc[key] = {
        codigo: ajuste.codArticulo,
        articulo: ajuste.articulo,
        cantidad: 0,
        sucursal: ajuste.sucursal,
        nroComprobante: ajuste.nroComprobante
      };
    }
    acc[key].cantidad += Math.abs(Number(ajuste.cantidad));
    return acc;
  }, {});

  return Object.values(articulos)
    .sort((a: any, b: any) => Math.abs(b.cantidad) - Math.abs(a.cantidad))
    .slice(0, 10);
}

function calcularAjustesPorComprobante(data: any[]) {
  const comprobantes = data.reduce((acc, ajuste) => {
    const key = ajuste.nroComprobante;
    if (!acc[key]) {
      acc[key] = {
        nroComprobante: ajuste.nroComprobante,
        fecha: ajuste.fechaMovimiento,
        sucursal: ajuste.sucursal,
        cantidad: 0,
        articulo: ajuste.articulo,
        codArticulo: ajuste.codArticulo
      };
    }
    acc[key].cantidad += Math.abs(Number(ajuste.cantidad));
    return acc;
  }, {});

  return Object.values(comprobantes)
    .sort((a: any, b: any) => b.nroComprobante - a.nroComprobante);
}

function calcularResumen(data: any[]) {
  const totalAjustes = data.length;
  const totalUnidades = data.reduce((acc, ajuste) => acc + Math.abs(Number(ajuste.cantidad)), 0);

  const impactoPorSucursal = data.reduce((acc, ajuste) => {
    if (!acc[ajuste.sucursal]) {
      acc[ajuste.sucursal] = 0;
    }
    acc[ajuste.sucursal] += Math.abs(Number(ajuste.cantidad));
    return acc;
  }, {});

  const sucursalMasImpacto = Object.entries(impactoPorSucursal)
    .reduce((max, [sucursal, cantidad]) => 
      (cantidad as number) > max.cantidad ? { nombre: sucursal, cantidad: cantidad as number } : max,
      { nombre: '', cantidad: 0 }
    );

  return {
    totalAjustes,
    totalUnidades,
    sucursalMasImpacto
  };
}