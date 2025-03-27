import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Package,
  FileText,
  TrendingUp,
  ArrowUpDown,
  BarChart2,
  Activity,
  AlertCircle
} from "lucide-react";
import { useAjustesData, Temporada } from "@/hooks/use-ajustes-data";
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
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

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

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(Math.round(num));
};

function formatDate(serialDate: string | number, shortFormat: boolean = false): string {
  try {
    // Si es un número serial de Excel
    if (!isNaN(Number(serialDate))) {
      const EXCEL_START_DATE = new Date(1899, 11, 30);
      const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
      const date = new Date(EXCEL_START_DATE.getTime() + Number(serialDate) * MILLISECONDS_PER_DAY);

      if (shortFormat) {
        // Formato corto: MMM/YYYY (ej: Ene/2025)
        return date.toLocaleDateString('es-AR', {
          month: 'short',
          year: 'numeric'
        });
      }

      // Formato completo para las tablas: DD/MM/YYYY
      return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }

    // Si ya está en formato fecha, devolverlo según el formato requerido
    if (typeof serialDate === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(serialDate)) {
      if (shortFormat) {
        const [dia, mes, año] = serialDate.split('/');
        const fecha = new Date(Number(año), Number(mes) - 1, Number(dia));
        return fecha.toLocaleDateString('es-AR', {
          month: 'short',
          year: 'numeric'
        });
      }
      return serialDate;
    }

    // Para otros casos, intentar convertir
    const date = new Date(serialDate);
    return date.toLocaleDateString('es-AR', {
      day: shortFormat ? undefined : '2-digit',
      month: shortFormat ? 'short' : '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formateando fecha:', serialDate, error);
    return String(serialDate);
  }
}

export function ReportsView() {
  const [selectedBranch, setSelectedBranch] = useState<string>("Todas las Sucursales");
  const [selectedSeason, setSelectedSeason] = useState<Temporada>("todas");
  const { metrics, loading } = useAjustesData(
    selectedBranch === "Todas las Sucursales" ? undefined : selectedBranch,
    selectedSeason
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-8 p-4"
      variants={containerAnimation}
      initial="hidden"
      animate="show"
    >
      {/* Header y Selector */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex gap-4">
          <BranchSelectorNew 
            value={selectedBranch}
            onChange={(value) => setSelectedBranch(value)}
          />
          <SeasonSelector
            value={selectedSeason}
            onChange={(value) => setSelectedSeason(value as Temporada)}
          />
        </div>
        <motion.div 
          className="text-sm text-muted-foreground"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {selectedBranch === "Todas las Sucursales" 
            ? `Vista consolidada - ${selectedSeason === 'todas' ? 'Todas las temporadas' : `Temporada ${selectedSeason}`}`
            : `${selectedBranch} - ${selectedSeason === 'todas' ? 'Todas las temporadas' : `Temporada ${selectedSeason}`}`}
        </motion.div>
      </div>

      {/* KPIs */}
      <motion.div 
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
        variants={containerAnimation}
      >
        <motion.div variants={itemAnimation}>
          <Card className={`bg-gradient-to-br ${COLORS.blue} hover:shadow-lg transition-shadow`}>
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

        <motion.div variants={itemAnimation}>
          <Card className={`bg-gradient-to-br ${COLORS.green} hover:shadow-lg transition-shadow`}>
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

        <motion.div variants={itemAnimation}>
          <Card className={`bg-gradient-to-br ${COLORS.purple} hover:shadow-lg transition-shadow`}>
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

        <motion.div variants={itemAnimation}>
          <Card className={`bg-gradient-to-br ${COLORS.amber} hover:shadow-lg transition-shadow`}>
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

      {/* Gráficos Principales */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Distribución por Sucursal */}
        <motion.div variants={itemAnimation}>
          <Card className="hover:shadow-lg transition-shadow">
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

        {/* Tendencia de Ajustes */}
        <motion.div variants={itemAnimation}>
          <Card className="hover:shadow-lg transition-shadow">
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

      {/* Tablas Detalladas */}
      <motion.div variants={itemAnimation}>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <div>
              <CardTitle className="text-xl font-semibold">Top 10 Artículos más Ajustados</CardTitle>
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
                {metrics?.topArticulos.map((articulo) => (
                  <TableRow key={`${articulo.codigo}-${articulo.sucursal}`} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{articulo.codigo}</TableCell>
                    <TableCell>{articulo.articulo}</TableCell>
                    <TableCell>{articulo.sucursal}</TableCell>
                    <TableCell>{formatNumber(Math.abs(articulo.cantidad))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Detalles por Comprobante */}
      <motion.div variants={itemAnimation}>
        <Card className="hover:shadow-lg transition-shadow">
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
                {metrics?.ajustesPorComprobante.map((comprobante) => (
                  <TableRow key={comprobante.nroComprobante} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{comprobante.nroComprobante}</TableCell>
                    <TableCell>{formatDate(comprobante.fecha)}</TableCell>
                    <TableCell>{comprobante.sucursal}</TableCell>
                    <TableCell>{comprobante.articulo}</TableCell>
                    <TableCell>{comprobante.codArticulo}</TableCell>
                    <TableCell>{formatNumber(Math.abs(comprobante.cantidad))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}