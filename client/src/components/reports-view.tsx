import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Package,
  FileText,
  TrendingUp,
  ArrowUpDown,
  BarChart2,
  Activity,
  AlertCircle,
  Calendar,
  Filter,
  Trophy,
  CheckCircle2,
  Clock,
  XCircle,
  Lock,
  Mail
} from "lucide-react";
import { getCalendarioSucursal } from "@/lib/calendario-semanal";
import { useFirebaseData } from "@/hooks/use-firebase-data";
import { useAjustesData, Temporada } from "@/hooks/use-ajustes-data";
import { AjustesDashboard } from "@/components/ajustes-dashboard";
import { motion, AnimatePresence } from "framer-motion";
import { BranchSelectorNew } from "@/components/branch-selector-new";
import { SeasonSelector } from "@/components/season-selector";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const COLORS = {
  blue: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
  green: 'from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20',
  purple: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20',
  amber: 'from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20'
};

const CHART_COLORS = ['#0ea5e9', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];

const containerAnimation = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemAnimation = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const hoverScale = {
  hover: { 
    scale: 1.02,
    transition: { duration: 0.2 }
  },
  tap: { 
    scale: 0.98,
    transition: { duration: 0.1 }
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3
    }
  }
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(Math.round(num));
};

function formatDate(serialDate: string | number, shortFormat: boolean = false): string {
  try {
    if (!isNaN(Number(serialDate))) {
      const EXCEL_START_DATE = new Date(1899, 11, 30);
      const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
      const date = new Date(EXCEL_START_DATE.getTime() + Number(serialDate) * MILLISECONDS_PER_DAY);

      if (shortFormat) {
        return date.toLocaleDateString('es-AR', {
          month: 'short',
          year: 'numeric'
        }).replace('/', ' ');
      }

      return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }

    if (typeof serialDate === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(serialDate)) {
      if (shortFormat) {
        const [dia, mes, año] = serialDate.split('/');
        const fecha = new Date(Number(año), Number(mes) - 1, Number(dia));
        return fecha.toLocaleDateString('es-AR', {
          month: 'short',
          year: 'numeric'
        }).replace('/', ' ');
      }
      return serialDate;
    }

    const date = new Date(serialDate);
    if (shortFormat) {
      return date.toLocaleDateString('es-AR', {
        month: 'short',
        year: 'numeric'
      }).replace('/', ' ');
    }
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formateando fecha:', serialDate, error);
    return String(serialDate);
  }
}

// Helper para sanitizar códigos
const sanitizeCode = (code: string): string => {
  return code.replace(/[.#$[\]]/g, '_');
};

// Sucursales con calendario
const SUCURSALES_CALENDARIO = ['T.Mendoza', 'T.Sjuan', 'T.SLuis', 'Crisa2'];

const SUCURSALES_PREMIUM: string[] = ['T.Srafael'];

// Mapa de meses
const MESES_MAP: { [key: string]: string } = {
  'DICIEMBRE': 'Dic',
  'ENERO': 'Ene',
  'FEBRERO': 'Feb',
  'MARZO': 'Mar',
  'ABRIL': 'Abr',
  'MAYO': 'May'
};

export function ReportsView() {
  const [selectedBranch, setSelectedBranch] = useState<string>("Todas las Sucursales");
  const [selectedSeason, setSelectedSeason] = useState<Temporada>("todas");
  const [visibleArticulos, setVisibleArticulos] = useState(5);
  const [visibleComprobantes, setVisibleComprobantes] = useState(5);
  const { metrics, loading } = useAjustesData(
    selectedBranch === "Todas las Sucursales" ? undefined : selectedBranch,
    selectedSeason
  );
  
  // Obtener datos de Firebase para los calendarios
  const { data: branchesData } = useFirebaseData();

  // Handlers memoizados para evitar re-renders
  const handleBranchChange = useCallback((value: string) => {
    setSelectedBranch(value);
  }, []);

  const handleSeasonChange = useCallback((value: string) => {
    setSelectedSeason(value as Temporada);
  }, []);

  const handleShowMoreArticulos = useCallback(() => {
    setVisibleArticulos(prev => prev + 5);
  }, []);

  const handleShowMoreComprobantes = useCallback(() => {
    setVisibleComprobantes(prev => prev + 5);
  }, []);

  // Memoizar cálculo del rango de fechas
  const { fechaMin, fechaMax } = useMemo(() => {
    const min = metrics?.ajustesPorComprobante?.reduce((minVal, item) => {
      try {
        if (!minVal || new Date(formatDate(item.fecha)) < new Date(formatDate(minVal))) {
          return item.fecha;
        }
      } catch (e) {}
      return minVal;
    }, '');
    
    const max = metrics?.ajustesPorComprobante?.reduce((maxVal, item) => {
      try {
        if (!maxVal || new Date(formatDate(item.fecha)) > new Date(formatDate(maxVal))) {
          return item.fecha;
        }
      } catch (e) {}
      return maxVal;
    }, '');

    return { fechaMin: min, fechaMax: max };
  }, [metrics?.ajustesPorComprobante]);

  // Memoizar KPIs globales de calendarios
  const calendarioKPIs = useMemo(() => {
    let totalItems = 0;
    let totalCompletados = 0;
    let sucursalesCompletas = 0;
    
    SUCURSALES_CALENDARIO.forEach(sucId => {
      const calendario = getCalendarioSucursal(sucId);
      if (calendario) {
        const branchData = branchesData?.find(b => b.id === sucId);
        const codigos = calendario.semanas.flatMap(s => s.items);
        totalItems += codigos.length;
        const completados = codigos.filter(code => branchData?.items?.[sanitizeCode(code)]?.completed).length;
        totalCompletados += completados;
        if (completados >= codigos.length) sucursalesCompletas++;
      }
    });
    
    const porcentajeGlobal = totalItems > 0 ? Math.round((totalCompletados / totalItems) * 100) : 0;
    
    return { totalItems, totalCompletados, sucursalesCompletas, porcentajeGlobal };
  }, [branchesData]);

  // Memoizar datos de sucursales para tarjetas
  const sucursalesData = useMemo(() => {
    return SUCURSALES_CALENDARIO.map(sucursalId => {
      const calendario = getCalendarioSucursal(sucursalId);
      if (!calendario) return null;
      
      const branchData = branchesData?.find(b => b.id === sucursalId);
      const todosLosCodigos = calendario.semanas.flatMap(s => s.items);
      const completados = todosLosCodigos.filter(code => branchData?.items?.[sanitizeCode(code)]?.completed).length;
      const porcentaje = Math.round((completados / todosLosCodigos.length) * 100);
      
      const mesesMap: { [key: string]: number } = {};
      calendario.semanas.forEach(s => {
        mesesMap[s.mes] = (mesesMap[s.mes] || 0) + s.items.length;
      });
      
      let acumulado = 0;
      const objetivosMes = Object.entries(mesesMap).map(([mes, obj]) => {
        acumulado += obj;
        const acumAnterior = acumulado - obj;
        const completadosMes = Math.min(Math.max(completados - acumAnterior, 0), obj);
        const cumplido = completadosMes >= obj;
        return { mes: MESES_MAP[mes] || mes.slice(0,3), obj, completadosMes, cumplido };
      });
      
      return { sucursalId, completados, total: todosLosCodigos.length, porcentaje, objetivosMes };
    }).filter(Boolean);
  }, [branchesData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <motion.div 
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
          />
          <p className="text-muted-foreground animate-pulse">Cargando datos...</p>
        </motion.div>
      </div>
    );
  }
  
  return (
    <motion.div 
      className="space-y-8"
      variants={containerAnimation}
      initial="hidden"
      animate="show"
    >
      {/* Filtros fijos en la parte superior - solo visible en reportes */}
      <div className="sticky top-16 z-20 bg-background/98 backdrop-blur-md py-2 sm:py-3 -mx-2 px-2 sm:-mx-4 sm:px-4 border-b shadow-sm">
        <div className="flex flex-col gap-2 sm:gap-3 bg-muted/40 p-2 sm:p-3 rounded-lg border">
          {/* Fila de filtros */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 text-sm font-medium shrink-0">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros:</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="w-full sm:w-auto">
                <BranchSelectorNew 
                  value={selectedBranch}
                  onChange={handleBranchChange}
                  showPlaceholder={true}
                />
              </div>
              <div className="w-full sm:w-auto">
                <SeasonSelector
                  value={selectedSeason}
                  onChange={handleSeasonChange}
                />
              </div>
            </div>
          </div>
          {/* Info del filtro actual - solo en desktop */}
          <div className="hidden md:flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              <span>
                {selectedBranch === "Todas las Sucursales" 
                  ? "Vista consolidada de todas las sucursales"
                  : `Filtrando: ${selectedBranch}`}
                {selectedSeason !== 'todas' && ` | Temporada: ${selectedSeason}`}
              </span>
            </div>
            {fechaMin && fechaMax && (
              <span>Datos: {formatDate(fechaMin)} - {formatDate(fechaMax)}</span>
            )}
          </div>
        </div>
      </div>

      {SUCURSALES_PREMIUM.includes(selectedBranch) && (
        <div className="fixed inset-0 z-40 pointer-events-none" style={{ top: '180px' }}>
          <div className="absolute inset-0 backdrop-blur-md bg-white/30 dark:bg-black/30" />
          <div className="absolute inset-0 flex items-start justify-center pt-[15vh] pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8 sm:p-10 max-w-md mx-4 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                <Lock className="h-8 w-8 text-gray-500 dark:text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                Información Premium
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                Para llegar a este nivel de información te pedimos que te comuniques a la administración para llegar a un acuerdo para mostrar la información.
              </p>
              <a
                href="https://wa.me/542615195614?text=Hola%2C%20me%20gustar%C3%ADa%20consultar%20sobre%20el%20acceso%20premium%20a%20los%20reportes%20de%20inventario."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white px-6 py-3 rounded-lg font-medium text-sm transition-colors duration-200"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Contactar Administración
              </a>
            </motion.div>
          </div>
        </div>
      )}

      {/* Resumen de Muestreos por Sucursal */}
      <motion.div variants={fadeInUp}>
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Calendario de Muestreos - Progreso por Sucursal
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Estado actual de los items sin rotación y sobrestock
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {SUCURSALES_CALENDARIO.length} sucursales con calendario
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* KPIs Globales - Usando datos memoizados */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-background p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Package className="h-4 w-4" />
                  Items Totales
                </div>
                <div className="text-2xl font-bold">{calendarioKPIs.totalItems}</div>
              </div>
              <div className="bg-white dark:bg-background p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Completados
                </div>
                <div className="text-2xl font-bold text-green-600">{calendarioKPIs.totalCompletados}</div>
              </div>
              <div className="bg-white dark:bg-background p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Pendientes
                </div>
                <div className="text-2xl font-bold text-amber-600">{calendarioKPIs.totalItems - calendarioKPIs.totalCompletados}</div>
              </div>
              <div className="bg-white dark:bg-background p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Avance Global
                </div>
                <div className="text-2xl font-bold text-primary">{calendarioKPIs.porcentajeGlobal}%</div>
              </div>
            </div>

            {/* Tarjetas por Sucursal - Usando datos memoizados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sucursalesData.map((data: any) => {
                if (!data) return null;
                const { sucursalId, completados, total, porcentaje, objetivosMes } = data;
                
                return (
                  <motion.div 
                    key={sucursalId}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      porcentaje === 100 
                        ? 'bg-green-50 border-green-400 dark:bg-green-900/20' 
                        : 'bg-white dark:bg-background border-gray-200'
                    }`}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        <span className="font-bold text-lg">{sucursalId}</span>
                        {porcentaje === 100 && <Trophy className="h-5 w-5 text-yellow-500" />}
                      </div>
                      <Badge 
                        variant={porcentaje === 100 ? "default" : porcentaje > 0 ? "secondary" : "outline"}
                        className={porcentaje === 100 ? "bg-green-500" : ""}
                      >
                        {porcentaje === 100 ? "Completo" : `${porcentaje}%`}
                      </Badge>
                    </div>
                    
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{completados} de {total} items</span>
                        <span className="font-medium">{porcentaje}%</span>
                      </div>
                      <Progress value={porcentaje} className={`h-2 ${porcentaje === 100 ? '[&>div]:bg-green-500' : ''}`} />
                    </div>
                    
                    {/* Indicadores de meses */}
                    <div className="flex flex-wrap gap-1">
                      {objetivosMes.map(({ mes, obj, completadosMes, cumplido }: { mes: string; obj: number; completadosMes: number; cumplido: boolean }) => (
                        <span 
                          key={mes}
                          className={`text-[11px] px-2 py-1 rounded-full ${
                            cumplido 
                              ? 'bg-green-500 text-white' 
                              : completadosMes > 0 
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' 
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                          }`}
                          title={`${mes}: ${completadosMes}/${obj}`}
                        >
                          {mes} {cumplido ? '✓' : `${completadosMes}/${obj}`}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Dashboard de Ajustes */}
      <AjustesDashboard />
      

      <motion.div 
        className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        variants={containerAnimation}
      >
        <motion.div variants={fadeInUp} whileHover={hoverScale.hover} whileTap={hoverScale.tap}>
          <Card className={`bg-gradient-to-br ${COLORS.blue} hover:shadow-lg transition-all duration-300`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Ajustes</CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(metrics?.resumen.totalAjustes || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Movimientos registrados
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp} whileHover={hoverScale.hover} whileTap={hoverScale.tap}>
          <Card className={`bg-gradient-to-br ${COLORS.green} hover:shadow-lg transition-all duration-300`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Unidades</CardTitle>
              <Package className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(metrics?.resumen.totalUnidades || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Unidades ajustadas
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp} whileHover={hoverScale.hover} whileTap={hoverScale.tap}>
          <Card className={`bg-gradient-to-br ${COLORS.purple} hover:shadow-lg transition-all duration-300`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Mayor Impacto</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.resumen.sucursalMasImpacto.nombre}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {formatNumber(metrics?.resumen.sucursalMasImpacto.cantidad || 0)} unidades
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp} whileHover={hoverScale.hover} whileTap={hoverScale.tap}>
          <Card className={`bg-gradient-to-br ${COLORS.amber} hover:shadow-lg transition-all duration-300`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Promedio Diario</CardTitle>
              <BarChart2 className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber((metrics?.resumen.totalAjustes || 0) / 30)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Ajustes por día
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        <motion.div variants={fadeInUp} whileHover={hoverScale.hover} whileTap={hoverScale.tap}>
          <Card className="hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
              <div>
                <CardTitle className="text-xl font-semibold">Distribución por Sucursal</CardTitle>
                <p className="text-sm text-muted-foreground">Comparativa de ajustes entre sucursales</p>
              </div>
              <Building2 className="h-6 w-6 text-primary" />
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics?.topSucursales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="sucursal" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatNumber(Number(value))} />
                    <Legend />
                    <Bar dataKey="unidades" name="Unidades Ajustadas" fill="#0ea5e9" />
                    <Bar dataKey="cantidad" name="Cantidad de Ajustes" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp} whileHover={hoverScale.hover} whileTap={hoverScale.tap}>
          <Card className="hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
              <div>
                <CardTitle className="text-xl font-semibold">Tendencia de Ajustes</CardTitle>
                <p className="text-sm text-muted-foreground">Evolución temporal de los ajustes</p>
              </div>
              <AlertCircle className="h-6 w-6 text-primary" />
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics?.ajustesPorComprobante}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="fecha" 
                      tickFormatter={(value) => formatDate(value, true)}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => formatDate(value, true)}
                      formatter={(value) => formatNumber(Number(value))} 
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="cantidad" 
                      name="Unidades Ajustadas" 
                      stroke="#0ea5e9"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={fadeInUp} whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
        <Card className="hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <div>
              <CardTitle className="text-xl font-semibold">Top Artículos más Ajustados</CardTitle>
              <p className="text-sm text-muted-foreground">Artículos con mayor movimiento</p>
            </div>
            <Package className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Artículo</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {metrics?.topArticulos.slice(0, visibleArticulos).map((articulo) => (
                    <motion.tr
                      key={`${articulo.codigo}-${articulo.sucursal}`}
                      className="hover:bg-muted/50"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <TableCell className="font-medium">{articulo.codigo}</TableCell>
                      <TableCell>{articulo.articulo}</TableCell>
                      <TableCell>{articulo.sucursal}</TableCell>
                      <TableCell>{formatNumber(Math.abs(articulo.cantidad))}</TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
            {(metrics?.topArticulos?.length ?? 0) > visibleArticulos && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  onClick={handleShowMoreArticulos}
                  className="transition-all duration-200 hover:scale-105"
                >
                  Mostrar más artículos
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <div className="overflow-x-auto">
        <Card className="hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <div>
              <CardTitle className="text-xl font-semibold">Ajustes por N° de Comprobante</CardTitle>
              <p className="text-sm text-muted-foreground">Detalle de movimientos por comprobante</p>
            </div>
            <FileText className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Comprobante</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Artículo</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {metrics?.ajustesPorComprobante.slice(0, visibleComprobantes).map((comprobante) => (
                    <motion.tr
                      key={comprobante.nroComprobante}
                      className="hover:bg-muted/50"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <TableCell className="font-medium">{comprobante.nroComprobante}</TableCell>
                      <TableCell>{formatDate(comprobante.fecha)}</TableCell>
                      <TableCell>{comprobante.sucursal}</TableCell>
                      <TableCell>{comprobante.articulo}</TableCell>
                      <TableCell>{comprobante.codArticulo}</TableCell>
                      <TableCell>{formatNumber(Math.abs(comprobante.cantidad))}</TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
            {(metrics?.ajustesPorComprobante?.length ?? 0) > visibleComprobantes && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  onClick={handleShowMoreComprobantes}
                  className="transition-all duration-200 hover:scale-105"
                >
                  Mostrar más comprobantes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}