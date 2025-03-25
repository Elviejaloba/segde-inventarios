import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';

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
    cantidad: number;
    sucursal: string;
    fecha: string;
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

export function useAjustesData(sucursal?: string) {
  const [metrics, setMetrics] = useState<AjustesMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    console.log('useAjustesData - Iniciando con sucursal:', sucursal);

    const loadData = async () => {
      try {
        setLoading(true);

        const unsubscribe = storage.subscribeToAjustes((data) => {
          if (!mounted || !data) {
            console.log('No hay datos o componente desmontado');
            return;
          }

          let filteredData = data;
          if (sucursal && sucursal !== 'Todas las Sucursales') {
            filteredData = data.filter(d => d.sucursal === sucursal);
          }

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
  }, [sucursal]);

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
        cantidad: 0,
        sucursal: ajuste.sucursal,
        fecha: ajuste.fechaMovimiento
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

  // Encontrar la sucursal con mayor impacto en cantidad
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