import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Package,
  FileText,
  TrendingUp,
  ArrowUpDown
} from "lucide-react";
import { useAjustesData } from "@/hooks/use-ajustes-data";
import { motion, AnimatePresence } from "framer-motion";
import { BranchSelectorNew } from "@/components/branch-selector-new";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const COLORS = ['#6366f1', '#f43f5e', '#22c55e', '#eab308', '#ec4899'];

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
    <div className="space-y-8 p-4">
      <div className="flex justify-between items-center">
        <BranchSelectorNew 
          value={selectedBranch}
          onChange={handleBranchChange}
        />
        <div className="text-sm text-muted-foreground">
          {selectedBranch === "Todas las Sucursales" 
            ? "Vista consolidada de todas las sucursales"
            : `Mostrando datos de ${selectedBranch}`}
        </div>
      </div>

      {/* Dashboard General */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Ajustes</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.resumen.totalAjustes.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Movimientos registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Unidades</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.resumen.totalUnidades.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Unidades ajustadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mayor Impacto</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.resumen.sucursalMasImpacto.nombre}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {metrics?.resumen.sucursalMasImpacto.cantidad.toLocaleString()} unidades
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Sucursales */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Top 5 Sucursales</CardTitle>
          <Building2 className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sucursal</TableHead>
                <TableHead>Cantidad de Ajustes</TableHead>
                <TableHead>Total Unidades</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics?.topSucursales.map((sucursal, index) => (
                <TableRow key={sucursal.sucursal}>
                  <TableCell className="font-medium">{sucursal.sucursal}</TableCell>
                  <TableCell>{sucursal.cantidad.toLocaleString()}</TableCell>
                  <TableCell>{sucursal.unidades.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top 10 Artículos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Top 10 Artículos más Ajustados</CardTitle>
          <Package className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
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
                <TableRow key={`${articulo.codigo}-${articulo.sucursal}`}>
                  <TableCell className="font-medium">{articulo.codigo}</TableCell>
                  <TableCell>{articulo.articulo}</TableCell>
                  <TableCell>{articulo.sucursal}</TableCell>
                  <TableCell>{Math.abs(articulo.cantidad).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Ajustes por Comprobante */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Ajustes por N° de Comprobante</CardTitle>
          <FileText className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Comprobante</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Cantidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics?.ajustesPorComprobante.map((comprobante) => (
                <TableRow key={comprobante.nroComprobante}>
                  <TableCell className="font-medium">{comprobante.nroComprobante}</TableCell>
                  <TableCell>{new Date(comprobante.fecha).toLocaleDateString()}</TableCell>
                  <TableCell>{comprobante.sucursal}</TableCell>
                  <TableCell>{Math.abs(comprobante.cantidad).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}