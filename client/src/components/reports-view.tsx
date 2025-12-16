import { useState } from 'react';
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
  XCircle
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
const SUCURSALES_CALENDARIO = ['T.Mendoza', 'T.Sjuan', 'T.Luis', 'Crisa2'];

// Mapa de meses
const MESES_MAP: { [key: string]: string } = {
  'DICIEMBRE': 'Dic',
  'ENERO': 'Ene',
  'FEBRERO': 'Feb',
  'MARZO': 'Mar',
  'ABRIL': 'Abr'
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
  const { branchesData } = useFirebaseData();

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

  // Calcular el rango de fechas disponible
  const fechaMin = metrics?.ajustesPorComprobante?.reduce((min, item) => {
    try {
      if (!min || new Date(formatDate(item.fecha)) < new Date(formatDate(min))) {
        return item.fecha;
      }
    } catch (e) {}
    return min;
  }, '');
  
  const fechaMax = metrics?.ajustesPorComprobante?.reduce((max, item) => {
    try {
      if (!max || new Date(formatDate(item.fecha)) > new Date(formatDate(max))) {
        return item.fecha;
      }
    } catch (e) {}
    return max;
  }, '');
  
  return (
    <motion.div 
      className="space-y-8"
      variants={containerAnimation}
      initial="hidden"
      animate="show"
    >
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
            {/* KPIs Globales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {(() => {
                let totalItems = 0;
                let totalCompletados = 0;
                let sucursalesCompletas = 0;
                
                SUCURSALES_CALENDARIO.forEach(sucId => {
                  const calendario = getCalendarioSucursal(sucId);
                  if (calendario) {
                    const branchData = branchesData[sucId];
                    const codigos = calendario.semanas.flatMap(s => s.items);
                    totalItems += codigos.length;
                    const completados = codigos.filter(code => branchData?.items?.[sanitizeCode(code)]?.completed).length;
                    totalCompletados += completados;
                    if (completados >= codigos.length) sucursalesCompletas++;
                  }
                });
                
                const porcentajeGlobal = totalItems > 0 ? Math.round((totalCompletados / totalItems) * 100) : 0;
                
                return (
                  <>
                    <div className="bg-white dark:bg-background p-4 rounded-lg border shadow-sm">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Package className="h-4 w-4" />
                        Items Totales
                      </div>
                      <div className="text-2xl font-bold">{totalItems}</div>
                    </div>
                    <div className="bg-white dark:bg-background p-4 rounded-lg border shadow-sm">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Completados
                      </div>
                      <div className="text-2xl font-bold text-green-600">{totalCompletados}</div>
                    </div>
                    <div className="bg-white dark:bg-background p-4 rounded-lg border shadow-sm">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Clock className="h-4 w-4 text-amber-500" />
                        Pendientes
                      </div>
                      <div className="text-2xl font-bold text-amber-600">{totalItems - totalCompletados}</div>
                    </div>
                    <div className="bg-white dark:bg-background p-4 rounded-lg border shadow-sm">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Avance Global
                      </div>
                      <div className="text-2xl font-bold text-primary">{porcentajeGlobal}%</div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Tarjetas por Sucursal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SUCURSALES_CALENDARIO.map(sucursalId => {
                const calendario = getCalendarioSucursal(sucursalId);
                if (!calendario) return null;
                
                const branchData = branchesData[sucursalId];
                const todosLosCodigos = calendario.semanas.flatMap(s => s.items);
                const completados = todosLosCodigos.filter(code => branchData?.items?.[sanitizeCode(code)]?.completed).length;
                const porcentaje = Math.round((completados / todosLosCodigos.length) * 100);
                
                // Calcular objetivos por mes
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
                
                const mesActualIdx = objetivosMes.findIndex(m => !m.cumplido);
                const mesActual = mesActualIdx >= 0 ? objetivosMes[mesActualIdx] : objetivosMes[objetivosMes.length - 1];
                
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
                        <span className="text-muted-foreground">{completados} de {todosLosCodigos.length} items</span>
                        <span className="font-medium">{porcentaje}%</span>
                      </div>
                      <Progress value={porcentaje} className={`h-2 ${porcentaje === 100 ? '[&>div]:bg-green-500' : ''}`} />
                    </div>
                    
                    {/* Indicadores de meses */}
                    <div className="flex flex-wrap gap-1">
                      {objetivosMes.map(({ mes, obj, completadosMes, cumplido }) => (
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
        className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8 bg-muted/30 p-4 rounded-lg border border-border/50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </h3>
          <div className="flex flex-wrap gap-4">
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <div className="w-full sm:w-auto">
                    <BranchSelectorNew 
                      value={selectedBranch}
                      onChange={(value) => setSelectedBranch(value)}
                      showPlaceholder={true}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Seleccione una sucursal para filtrar los datos</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>

            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <div className="w-full sm:w-auto">
                    <SeasonSelector
                      value={selectedSeason}
                      onChange={(value) => setSelectedSeason(value as Temporada)}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Filtre por temporada del año</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full md:w-auto">
          <motion.div 
            className="text-sm text-muted-foreground bg-background p-3 rounded-md border border-border/50 shadow-sm"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                {selectedBranch === "Todas las Sucursales" 
                  ? `Vista consolidada - ${selectedSeason === 'todas' ? 'Todas las temporadas' : `Temporada ${selectedSeason}`}`
                  : `${selectedBranch} - ${selectedSeason === 'todas' ? 'Todas las temporadas' : `Temporada ${selectedSeason}`}`}
              </span>
            </div>
          </motion.div>
          
          {fechaMin && fechaMax && (
            <div className="text-xs text-muted-foreground bg-primary/5 p-2 rounded-md border border-primary/20">
              <div className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-primary" />
                <span>
                  Datos disponibles: {formatDate(fechaMin)} - {formatDate(fechaMax)}
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>

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
            {metrics?.topArticulos.length > visibleArticulos && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => setVisibleArticulos(prev => prev + 5)}
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
            {metrics?.ajustesPorComprobante.length > visibleComprobantes && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => setVisibleComprobantes(prev => prev + 5)}
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

<style jsx global>{`
  .hover\\:bg-muted\\/50:hover {
    transform: translateX(4px);
    transition: all 0.2s ease;
  }
`}</style>