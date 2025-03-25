import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileDown, BarChart2, TrendingUp, Building2, ArrowUpRight } from "lucide-react";
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
  ResponsiveContainer
} from 'recharts';

export function ReportsView() {
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const { data: branchData, loading: branchLoading } = useFirebaseData();
  const { metrics, loading: metricsLoading } = useAjustesData(selectedBranch);

  const loading = branchLoading || metricsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"/>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Vista Consolidada */}
      {!selectedBranch && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
        >
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Sucursales</CardTitle>
              <Building2 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{AVAILABLE_BRANCHES.length}</div>
              <p className="text-xs text-muted-foreground">Activas en el sistema</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Progreso Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(branchData?.reduce((acc, curr) => acc + curr.totalCompleted, 0) / branchData?.length || 0)}%
              </div>
              <p className="text-xs text-muted-foreground">Promedio general</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Items Sin Stock</CardTitle>
              <BarChart2 className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {branchData?.reduce((acc, curr) => acc + curr.noStock, 0)}
              </div>
              <p className="text-xs text-muted-foreground">En todas las sucursales</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Mejor Sucursal</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {branchData?.sort((a, b) => b.totalCompleted - a.totalCompleted)[0]?.id}
              </div>
              <p className="text-xs text-muted-foreground">Mayor progreso</p>
            </CardContent>
          </Card>

          {/* Gráfico Consolidado */}
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle>Comparativa de Sucursales</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="id" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="totalCompleted" name="Progreso" fill="#6366f1" />
                  <Bar dataKey="noStock" name="Sin Stock" fill="#f43f5e" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Selector de Sucursal */}
      <div className="flex justify-between items-center">
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Seleccionar Sucursal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Vista General</SelectItem>
            {AVAILABLE_BRANCHES.map((branch) => (
              <SelectItem key={branch} value={branch}>
                {branch}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" className="gap-2">
          <FileDown className="h-4 w-4" />
          Exportar Reporte
        </Button>
      </div>

      {/* Vista Detallada por Sucursal */}
      {selectedBranch && metrics && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-6"
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20">
              <CardHeader>
                <CardTitle>Total Comprobantes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalComprobantes}</div>
              </CardContent>
            </Card>

            {/* Gráfico de Códigos con Mayor Diferencia */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Códigos con Mayor Diferencia</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.codigosDiferencia}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="codigo" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="diferencia" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Comparativa de Diferencias */}
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle>Comparativa de Diferencias por Período</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.comparativaDiferencias}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="sucursal" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="diferencia" fill="#f43f5e" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}
    </div>
  );
}