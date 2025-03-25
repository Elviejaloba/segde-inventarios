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
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"/>
      </div>
    );
  }

  const handleExport = () => {
    // Implementar exportación a PNG/PDF
  };

  return (
    <div className="space-y-8">
      {/* Filtros */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex gap-2">
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

          <Select value={selectedArticulo} onValueChange={setSelectedArticulo}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Seleccionar Artículo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Artículos</SelectItem>
              {/* Lista de artículos se agregará después */}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" className="gap-2" onClick={handleExport}>
          <FileDown className="h-4 w-4" />
          Exportar Reporte
        </Button>
      </div>

      {/* Sección 1: Ajustes por Sucursal y Tipo de Movimiento */}
      <div className="grid gap-6 md:grid-cols-2">
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
                <Bar dataKey="cantidad" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">
              Distribución de Movimientos (E/S)
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

      {/* Sección 2: Evolución del Stock y Artículos más Ajustados */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">
              Evolución del Stock
            </CardTitle>
            <LineChart className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={metrics?.evolucionStock}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="articulo" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="stockAntes" stroke="#6366f1" name="Antes" />
                <Line type="monotone" dataKey="stockDespues" stroke="#f43f5e" name="Después" />
              </RechartsLineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">
              Artículos más Ajustados
            </CardTitle>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.articulosMasAjustados}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="articulo" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cantidadAjustes" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Sección 3: Distribución Temporal y Comparativa de Devoluciones */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">
              Distribución Temporal de Ajustes
            </CardTitle>
            <LineChart className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={metrics?.distribucionTemporal}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="cantidad" stroke="#8b5cf6" />
              </RechartsLineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">
              Comparativa de Devoluciones
            </CardTitle>
            <BarChart2 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.comparativaDevoluciones}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="sucursal" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="cantidadAjustada" fill="#eab308" name="Ajustada" />
                <Bar dataKey="cantidadDevuelta" fill="#ec4899" name="Devuelta" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Sección 4: Impacto Económico */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">
            Relación Cantidad-Precio
          </CardTitle>
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="cantidad" name="Cantidad Ajustada" />
              <YAxis dataKey="precioVenta" name="Precio de Venta" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Impacto" data={metrics?.impactoEconomico} fill="#6366f1" />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}