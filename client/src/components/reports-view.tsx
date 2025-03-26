import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Package,
  FileText,
  TrendingUp,
  ArrowUpDown,
  BarChart2,
  LineChart,
  PieChart,
  Activity
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

const COLORS = {
  blue: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
  green: 'from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20',
  purple: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20',
  amber: 'from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20'
};

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
    <motion.div 
      className="space-y-8 p-4"
      variants={containerAnimation}
      initial="hidden"
      animate="show"
    >
      <div className="flex justify-between items-center mb-8">
        <BranchSelectorNew 
          value={selectedBranch}
          onChange={handleBranchChange}
        />
        <motion.div 
          className="text-sm text-muted-foreground"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {selectedBranch === "Todas las Sucursales" 
            ? "Vista consolidada de todas las sucursales"
            : `Mostrando datos de ${selectedBranch}`}
        </motion.div>
      </div>

      {/* Dashboard General */}
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
                {metrics?.resumen.totalAjustes.toLocaleString()}
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
                {metrics?.resumen.totalUnidades.toLocaleString()}
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
                {metrics?.resumen.sucursalMasImpacto.cantidad.toLocaleString()} unidades
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemAnimation}>
          <Card className={`bg-gradient-to-br ${COLORS.amber} hover:shadow-lg transition-shadow`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Rendimiento</CardTitle>
              <BarChart2 className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {((metrics?.resumen.totalAjustes || 0) / 30).toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Promedio diario
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Top 5 Sucursales */}
      <motion.div variants={itemAnimation}>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <div>
              <CardTitle className="text-xl font-semibold">Top 5 Sucursales</CardTitle>
              <p className="text-sm text-muted-foreground">Análisis de movimientos por sucursal</p>
            </div>
            <Building2 className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent className="pt-6">
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
                  <TableRow key={sucursal.sucursal} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{sucursal.sucursal}</TableCell>
                    <TableCell>{sucursal.cantidad.toLocaleString()}</TableCell>
                    <TableCell>{sucursal.unidades.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Top 10 Artículos */}
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
                    <TableCell>{Math.abs(articulo.cantidad).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Ajustes por Comprobante */}
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
                    <TableCell>{comprobante.fecha}</TableCell>
                    <TableCell>{comprobante.sucursal}</TableCell>
                    <TableCell>{comprobante.articulo}</TableCell>
                    <TableCell>{comprobante.codArticulo}</TableCell>
                    <TableCell>{Math.abs(comprobante.cantidad).toLocaleString()}</TableCell>
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