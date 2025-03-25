import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart2,
  TrendingUp,
  Building2,
  ArrowUpRight,
  PieChart,
  LineChart,
  Package,
  CalendarDays
} from "lucide-react";
import { AVAILABLE_BRANCHES } from "@/lib/store";
import { useAjustesData } from "@/hooks/use-ajustes-data";
import { motion, AnimatePresence } from "framer-motion";
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
  Cell
} from 'recharts';
import { BranchSelectorNew } from "@/components/branch-selector-new";

const COLORS = ['#6366f1', '#f43f5e', '#22c55e', '#eab308', '#ec4899', '#8b5cf6'];

export function ReportsView() {
  const [selectedBranch, setSelectedBranch] = useState<string>("Todas las Sucursales");
  const { metrics, loading } = useAjustesData(selectedBranch === "Todas las Sucursales" ? undefined : selectedBranch);

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

  const handleBranchChange = (value: string) => {
    setSelectedBranch(value);
  };

  return (
    <div className="space-y-8">
      <BranchSelectorNew 
        value={selectedBranch}
        onChange={handleBranchChange}
      />

      {/* Resumen General */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
        >
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Movimientos</CardTitle>
              <BarChart2 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.resumen.totalAjustes.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Registros procesados
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Unidades Movidas</CardTitle>
              <Package className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.resumen.valorTotal.toLocaleString()} unidades
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Total de unidades en movimientos
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Movimientos por Día</CardTitle>
              <CalendarDays className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.resumen.promedioAjustesDiarios.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">promedio de movimientos</p>
            </CardContent>
          </Card>

          {selectedBranch === "Todas las Sucursales" && (
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Sucursal más Activa</CardTitle>
                <Building2 className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.topSucursales[0]?.sucursal}
                </div>
                <motion.div
                  className="mt-4 flex items-center gap-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600">
                    {metrics?.topSucursales[0]?.cantidad.toLocaleString()} movimientos
                  </span>
                </motion.div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Gráficos principales */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">
                Movimientos por Mes
              </CardTitle>
              <LineChart className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={metrics?.ajustesPorMes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="cantidad" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    dot={false}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">
                Distribución por Tipo
              </CardTitle>
              <PieChart className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={metrics?.distribucionTipos}
                    dataKey="cantidad"
                    nameKey="tipo"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ tipo, porcentaje }) => `${tipo} (${porcentaje.toFixed(1)}%)`}
                  >
                    {metrics?.distribucionTipos.map((entry, index) => (
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

        {/* Top Artículos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">
              Top 10 Artículos con Más Movimientos
            </CardTitle>
            <Package className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {metrics?.topArticulos.map((articulo, index) => (
                <div key={articulo.codigo} className="flex items-center">
                  <span className="text-2xl font-bold w-8 text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="ml-4 flex-1">
                    <div className="text-sm font-medium">{articulo.articulo}</div>
                    <div className="text-sm text-muted-foreground">
                      Código: {articulo.codigo}
                    </div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-sm font-medium">
                      {articulo.cantidad.toLocaleString()} unidades
                    </div>
                    <div className="text-sm text-muted-foreground">
                      en movimientos
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </AnimatePresence>
    </div>
  );
}