import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileDown, BarChart2, TrendingUp, Building2, ArrowUpRight, PieChart, LineChart, BarChart3 } from "lucide-react";
import { AVAILABLE_BRANCHES } from "@/lib/store";
import { useFirebaseData } from "@/hooks/use-firebase-data";
import { useAjustesData } from "@/hooks/use-ajustes-data";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  LineChart as RechartsLineChart,
  Line,
  Legend,
  Cell,
  Scatter,
  ScatterChart
} from 'recharts';

const COLORS = ['#6366f1', '#f43f5e', '#22c55e', '#eab308', '#ec4899', '#8b5cf6'];

export function ReportsView() {
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedArticulo, setSelectedArticulo] = useState<string>("all");
  const { data: branchData, loading: branchLoading } = useFirebaseData();
  const { metrics, loading: metricsLoading } = useAjustesData(selectedBranch === "all" ? undefined : selectedBranch);

  const loading = branchLoading || metricsLoading;

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
    <div className="space-y-8">
      {/* Vista General Consolidada */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 overflow-hidden relative">
          <motion.div
            className="absolute inset-0 bg-grid-white/10"
            animate={{ opacity: [0.5, 0.3, 0.5] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Ajustes Totales
            </CardTitle>
            <BarChart2 className="h-4 w-4 text-blue-600 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.ajustesPorSucursal.reduce((acc, curr) => acc + curr.cantidad, 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Últimos 30 días
            </p>
            <div className="mt-4 h-2 bg-blue-100 dark:bg-blue-800/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-blue-600"
                initial={{ width: 0 }}
                animate={{ width: '75%' }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Eficiencia de Stock
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.distribucionMovimientos[0]?.porcentaje.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Movimientos exitosos
            </p>
            <motion.div
              className="mt-4 flex items-center gap-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <ArrowUpRight className="h-4 w-4 text-green-600" />
              <span className="text-xs text-green-600">+2.5% vs mes anterior</span>
            </motion.div>
          </CardContent>
        </Card>

        {/* Selector de Sucursal con mejor diseño */}
        <div className="col-span-full flex justify-between items-center gap-4 bg-card p-4 rounded-lg border">
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Seleccionar Sucursal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las Sucursales</SelectItem>
              {AVAILABLE_BRANCHES.map((branch) => (
                <SelectItem key={branch} value={branch}>{branch}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" className="gap-2" onClick={() => {}}>
            <FileDown className="h-4 w-4" />
            Exportar Reporte
          </Button>
        </div>

        {/* Gráficos Principales */}
        <div className="col-span-full grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">
                Cantidad de Ajustes por Sucursal
              </CardTitle>
              <BarChart2 className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics?.ajustesPorSucursal}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sucursal" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="cantidad" fill="#6366f1">
                    {metrics?.ajustesPorSucursal.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">
                Distribución de Movimientos
              </CardTitle>
              <PieChart className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={metrics?.distribucionMovimientos}
                    dataKey="cantidad"
                    nameKey="tipo"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {metrics?.distribucionMovimientos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Métricas Detalladas */}
        <div className="col-span-full grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Artículos Ajustados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.articulosMasAjustados.length || 0}
              </div>
              <div className="mt-4 space-y-2">
                {metrics?.articulosMasAjustados.slice(0, 3).map((articulo, index) => (
                  <div key={articulo.codigo} className="flex items-center justify-between">
                    <span className="text-sm truncate">{articulo.articulo}</span>
                    <span className="text-sm font-medium">{articulo.cantidadAjustes}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Evolución del Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={metrics?.evolucionStock.slice(0, 5)}>
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="stockDespues" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Devoluciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.comparativaDevoluciones.reduce((acc, curr) => acc + curr.cantidadDevuelta, 0) || 0}
              </div>
              <div className="mt-4">
                <div className="h-2 bg-pink-200 dark:bg-pink-800/20 rounded-full">
                  <motion.div
                    className="h-full bg-pink-600 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: '65%' }}
                    transition={{ duration: 1 }}
                  />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  65% del total de ajustes
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}