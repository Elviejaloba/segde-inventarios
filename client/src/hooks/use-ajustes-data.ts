import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';

interface AjustesMetrics {
  ajustesPorMes: Array<{
    mes: string;
    cantidad: number;
  }>;
  distribucionTipos: Array<{
    tipo: string;
    cantidad: number;
    porcentaje: number;
  }>;
  topSucursales: Array<{
    sucursal: string;
    cantidad: number;
    variacion: number;
  }>;
  topArticulos: Array<{
    codigo: string;
    articulo: string;
    cantidad: number;
    precioTotal: number;
  }>;
  resumen: {
    totalAjustes: number;
    valorTotal: number;
    promedioAjustesDiarios: number;
    tendencia: number;
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

          console.log('Datos originales recibidos:', data.length, 'registros');

          // Filtrado simplificado
          let filteredData = data;
          if (sucursal && sucursal !== 'Todas las Sucursales') {
            filteredData = data.filter(d => {
              const match = d.sucursal === sucursal;
              if (match) {
                console.log('Coincidencia encontrada para sucursal:', sucursal);
              }
              return match;
            });
            console.log(`Datos filtrados para sucursal ${sucursal}:`, filteredData.length);
          }

          console.log('Datos después del filtrado:', {
            sucursal,
            totalRegistros: data.length,
            registrosFiltrados: filteredData.length,
            primerosRegistros: filteredData.slice(0, 3)
          });

          if (mounted) {
            const ajustesPorMes = calcularAjustesPorMes(filteredData);
            const distribucionTipos = calcularDistribucionTipos(filteredData);
            const topSucursales = obtenerTopSucursales(filteredData);
            const topArticulos = obtenerTopArticulos(filteredData);
            const resumen = calcularResumenGeneral(filteredData);

            setMetrics({
              ajustesPorMes,
              distribucionTipos,
              topSucursales,
              topArticulos,
              resumen
            });
            setError(null);
            setLoading(false);
          }
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

function calcularAjustesPorMes(data: any[]) {
  console.log('Calculando ajustes por mes...');
  const meses = data.reduce((acc, ajuste) => {
    try {
      const fecha = new Date(ajuste.fechaMovimiento);
      const mes = fecha.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
      if (!acc[mes]) acc[mes] = 0;
      acc[mes]++;
      return acc;
    } catch (error) {
      console.error('Error procesando ajuste:', ajuste);
      return acc;
    }
  }, {});

  const resultado = Object.entries(meses)
    .map(([mes, cantidad]) => ({
      mes,
      cantidad: cantidad as number
    }))
    .sort((a, b) => new Date(a.mes).getTime() - new Date(b.mes).getTime());

  console.log('Ajustes por mes calculados:', resultado);
  return resultado;
}

function calcularDistribucionTipos(data: any[]) {
  console.log('Calculando distribución de tipos...');
  const tipos = data.reduce((acc, ajuste) => {
    const tipo = ajuste.tipoMovimiento;
    if (!acc[tipo]) acc[tipo] = 0;
    acc[tipo]++;
    return acc;
  }, {});

  const total = Object.values(tipos).reduce((a: any, b: any) => a + b, 0);

  const resultado = Object.entries(tipos)
    .map(([tipo, cantidad]) => ({
      tipo,
      cantidad: cantidad as number,
      porcentaje: ((cantidad as number) / total) * 100
    }))
    .sort((a, b) => b.cantidad - a.cantidad);

  console.log('Distribución de tipos calculada:', resultado);
  return resultado;
}

function obtenerTopSucursales(data: any[]) {
  console.log('Obteniendo top sucursales...');
  const sucursales = data.reduce((acc, ajuste) => {
    if (!acc[ajuste.sucursal]) {
      acc[ajuste.sucursal] = {
        cantidad: 0,
        valorTotal: 0,
        historico: []
      };
    }
    acc[ajuste.sucursal].cantidad++;
    acc[ajuste.sucursal].historico.push({
      fecha: new Date(ajuste.fechaMovimiento),
      cantidad: ajuste.cantidad
    });
    return acc;
  }, {});

  const resultado = Object.entries(sucursales)
    .map(([sucursal, data]: [string, any]) => ({
      sucursal,
      cantidad: data.cantidad,
      variacion: calcularVariacion(data.historico)
    }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5);

  console.log('Top sucursales calculado:', resultado);
  return resultado;
}

function obtenerTopArticulos(data: any[]) {
  console.log('Obteniendo top artículos...');
  const articulos = data.reduce((acc, ajuste) => {
    const key = `${ajuste.codArticulo}-${ajuste.articulo}`;
    if (!acc[key]) {
      acc[key] = {
        codigo: ajuste.codArticulo,
        articulo: ajuste.articulo,
        cantidad: 0,
        precioTotal: 0
      };
    }
    acc[key].cantidad += Math.abs(ajuste.cantidad);
    return acc;
  }, {});

  const resultado = Object.values(articulos)
    .sort((a: any, b: any) => b.cantidad - a.cantidad)
    .slice(0, 10);

  console.log('Top artículos calculado:', resultado);
  return resultado;
}

function calcularResumenGeneral(data: any[]) {
  console.log('Calculando resumen general...');
  const totalAjustes = data.length;

  // Calcular promedio diario
  const fechas = data.map(d => new Date(d.fechaMovimiento).toLocaleDateString());
  const diasUnicos = new Set(fechas).size;
  const promedioAjustesDiarios = totalAjustes / (diasUnicos || 1);

  // Calcular tendencia
  const tendencia = calcularTendencia(data);

  // Calcular valor total (usando solo cantidad por ahora)
  const valorTotal = data.reduce((acc, ajuste) => acc + Math.abs(ajuste.cantidad), 0);

  const resultado = {
    totalAjustes,
    valorTotal,
    promedioAjustesDiarios,
    tendencia
  };

  console.log('Resumen general calculado:', resultado);
  return resultado;
}

function calcularVariacion(historico: any[]) {
  if (historico.length < 2) return 0;
  const ordenado = historico.sort((a, b) => b.fecha - a.fecha);
  const ultimo = ordenado.slice(0, Math.floor(ordenado.length / 2));
  const anterior = ordenado.slice(Math.floor(ordenado.length / 2));
  const promedioUltimo = ultimo.reduce((acc, val) => acc + val.cantidad, 0) / ultimo.length;
  const promedioAnterior = anterior.reduce((acc, val) => acc + val.cantidad, 0) / anterior.length;
  return ((promedioUltimo - promedioAnterior) / Math.abs(promedioAnterior)) * 100;
}

function calcularTendencia(data: any[]) {
  const hoy = new Date();
  const unMesAtras = new Date(hoy.getFullYear(), hoy.getMonth() - 1, hoy.getDate());
  const dosMesesAtras = new Date(hoy.getFullYear(), hoy.getMonth() - 2, hoy.getDate());

  const ajustesUltimoMes = data.filter(d => new Date(d.fechaMovimiento) >= unMesAtras).length;
  const ajustesMesAnterior = data.filter(d => {
    const fecha = new Date(d.fechaMovimiento);
    return fecha >= dosMesesAtras && fecha < unMesAtras;
  }).length;

  return ajustesMesAnterior === 0 ? 0 :
    ((ajustesUltimoMes - ajustesMesAnterior) / ajustesMesAnterior) * 100;
}