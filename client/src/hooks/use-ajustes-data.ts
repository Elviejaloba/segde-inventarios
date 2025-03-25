import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';

interface AjustesMetrics {
  ajustesPorSucursal: Array<{
    sucursal: string;
    cantidad: number;
  }>;
  distribucionMovimientos: Array<{
    tipo: string;
    cantidad: number;
    porcentaje: number;
  }>;
  cantidadesAjustadas: Array<{
    sucursal: string;
    cantidadTotal: number;
  }>;
  evolucionStock: Array<{
    articulo: string;
    stockAntes: number;
    stockDespues: number;
  }>;
  articulosMasAjustados: Array<{
    codigo: string;
    articulo: string;
    cantidadAjustes: number;
  }>;
  distribucionTemporal: Array<{
    fecha: string;
    cantidad: number;
  }>;
  comparativaDevoluciones: Array<{
    sucursal: string;
    cantidadAjustada: number;
    cantidadDevuelta: number;
  }>;
  impactoEconomico: Array<{
    cantidad: number;
    precioVenta: number;
    impacto: number;
  }>;
}

export function useAjustesData(sucursal?: string) {
  const [metrics, setMetrics] = useState<AjustesMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const unsubscribe = storage.subscribeToAjustes((data) => {
          if (!mounted || !data) return;

          // Filtrar datos por sucursal si es necesario
          const filteredData = sucursal ? data.filter(d => d.sucursal === sucursal) : data;

          const metrics: AjustesMetrics = {
            ajustesPorSucursal: procesarAjustesPorSucursal(filteredData),
            distribucionMovimientos: calcularDistribucionMovimientos(filteredData),
            cantidadesAjustadas: calcularCantidadesAjustadas(filteredData),
            evolucionStock: calcularEvolucionStock(filteredData),
            articulosMasAjustados: obtenerArticulosMasAjustados(filteredData),
            distribucionTemporal: calcularDistribucionTemporal(filteredData),
            comparativaDevoluciones: calcularComparativaDevoluciones(filteredData),
            impactoEconomico: calcularImpactoEconomico(filteredData),
          };

          if (mounted) {
            setMetrics(metrics);
            setError(null);
            setLoading(false);
          }
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error loading ajustes data:', error);
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

function procesarAjustesPorSucursal(data: any[]) {
  const sucursales = {};
  data.forEach(ajuste => {
    if (!sucursales[ajuste.sucursal]) {
      sucursales[ajuste.sucursal] = 0;
    }
    sucursales[ajuste.sucursal]++;
  });

  return Object.entries(sucursales).map(([sucursal, cantidad]) => ({
    sucursal,
    cantidad: cantidad as number
  }));
}

function calcularDistribucionMovimientos(data: any[]) {
  const movimientos = data.reduce((acc, ajuste) => {
    const tipo = ajuste.tipoMovimiento;
    if (!acc[tipo]) acc[tipo] = 0;
    acc[tipo]++;
    return acc;
  }, {});

  const total = Object.values(movimientos).reduce((a: number, b: number) => a + b, 0);

  return Object.entries(movimientos).map(([tipo, cantidad]) => ({
    tipo,
    cantidad: cantidad as number,
    porcentaje: ((cantidad as number) / total) * 100
  }));
}

function calcularCantidadesAjustadas(data: any[]) {
  const cantidades = data.reduce((acc, ajuste) => {
    if (!acc[ajuste.sucursal]) {
      acc[ajuste.sucursal] = 0;
    }
    acc[ajuste.sucursal] += Math.abs(ajuste.cantidad);
    return acc;
  }, {});

  return Object.entries(cantidades).map(([sucursal, cantidadTotal]) => ({
    sucursal,
    cantidadTotal: cantidadTotal as number
  }));
}

function calcularEvolucionStock(data: any[]) {
  return data.map(ajuste => ({
    articulo: ajuste.articulo,
    stockAntes: ajuste.stock1,
    stockDespues: ajuste.stock1 + ajuste.cantidad
  }));
}

function obtenerArticulosMasAjustados(data: any[]) {
  const articulos = data.reduce((acc, ajuste) => {
    const key = `${ajuste.codArticulo}-${ajuste.articulo}`;
    if (!acc[key]) {
      acc[key] = {
        codigo: ajuste.codArticulo,
        articulo: ajuste.articulo,
        cantidadAjustes: 0
      };
    }
    acc[key].cantidadAjustes++;
    return acc;
  }, {});

  return Object.values(articulos)
    .sort((a: any, b: any) => b.cantidadAjustes - a.cantidadAjustes)
    .slice(0, 10);
}

function calcularDistribucionTemporal(data: any[]) {
  const distribucion = data.reduce((acc, ajuste) => {
    const fecha = new Date(ajuste.fechaMovimiento).toLocaleDateString();
    if (!acc[fecha]) acc[fecha] = 0;
    acc[fecha]++;
    return acc;
  }, {});

  return Object.entries(distribucion)
    .map(([fecha, cantidad]) => ({
      fecha,
      cantidad: cantidad as number
    }))
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
}

function calcularComparativaDevoluciones(data: any[]) {
  return data.reduce((acc, ajuste) => {
    const idx = acc.findIndex(item => item.sucursal === ajuste.sucursal);
    if (idx === -1) {
      acc.push({
        sucursal: ajuste.sucursal,
        cantidadAjustada: Math.abs(ajuste.cantidad),
        cantidadDevuelta: ajuste.cantidadDevuelta || 0
      });
    } else {
      acc[idx].cantidadAjustada += Math.abs(ajuste.cantidad);
      acc[idx].cantidadDevuelta += ajuste.cantidadDevuelta || 0;
    }
    return acc;
  }, []);
}

function calcularImpactoEconomico(data: any[]) {
  return data.map(ajuste => ({
    cantidad: Math.abs(ajuste.cantidad),
    precioVenta: ajuste.precioVenta,
    impacto: Math.abs(ajuste.cantidad) * ajuste.precioVenta
  }));
}