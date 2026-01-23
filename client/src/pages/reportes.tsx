import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DollarSign,
  TrendingDown,
  AlertTriangle,
  Package,
  Search,
  Building2,
  Calendar,
  ArrowUpDown,
  Eye,
  RefreshCw,
  BarChart3
} from "lucide-react";
import { LoadingMascot } from "@/components/ui/loading-mascot";
import { motion } from "framer-motion";

interface AnalisisItem {
  sucursal: string;
  codigo: string;
  articulo: string;
  totalAjustes: number;
  totalUnidades: number;
  precioUnitario: number;
  totalValorizado: number;
  primerAjuste: string;
  ultimoAjuste: string;
  totalVendido: number;
  totalVentaValorizada: number;
  porcentajePerdida: number;
  alertaPerdida: boolean;
  sinAjusteAnual: boolean;
}

interface ResumenSucursal {
  sucursal: string;
  articulosConAjuste: number;
  totalUnidadesAjustadas: number;
  totalValorizado: number;
  totalVentas: number;
  porcentajePerdida: number;
}

interface HistorialItem {
  id: number;
  sucursal: string;
  codigo: string;
  articulo: string;
  fechaMovimiento: string;
  tipoMovimiento: string;
  diferencia: number;
  precioUnitario: number;
  valorAjuste: number;
  ajusteAnterior: string | null;
  ventasEntreAjustes: number;
  valorVentasEntreAjustes: number;
  porcentajePerdida: number;
}

const SUCURSALES = [
  "T.Mendoza",
  "T.Sjuan",
  "T.SLuis",
  "Crisa2",
  "T.S.Martin",
  "T.Tunuyan",
  "T.Lujan",
  "T.Maipu",
  "T.Srafael"
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export default function ReportesPage() {
  const [selectedSucursal, setSelectedSucursal] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'valorizado' | 'perdida' | 'unidades'>('valorizado');
  const [selectedCodigo, setSelectedCodigo] = useState<string | null>(null);
  const [showHistorial, setShowHistorial] = useState(false);

  const { data: analisis, isLoading, refetch } = useQuery<{ detalle: AnalisisItem[]; resumen: ResumenSucursal[] }>({
    queryKey: ['/api/ajustes/valorizado', selectedSucursal],
    queryFn: async () => {
      const url = selectedSucursal 
        ? `/api/ajustes/valorizado?sucursal=${encodeURIComponent(selectedSucursal)}`
        : '/api/ajustes/valorizado';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Error fetching data');
      return response.json();
    }
  });

  const { data: historial, isLoading: loadingHistorial } = useQuery<HistorialItem[]>({
    queryKey: ['/api/ajustes/historial', selectedCodigo, selectedSucursal],
    queryFn: async () => {
      if (!selectedCodigo) return [];
      const url = selectedSucursal
        ? `/api/ajustes/historial/${encodeURIComponent(selectedCodigo)}?sucursal=${encodeURIComponent(selectedSucursal)}`
        : `/api/ajustes/historial/${encodeURIComponent(selectedCodigo)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Error fetching historial');
      return response.json();
    },
    enabled: !!selectedCodigo
  });

  const filteredData = analisis?.detalle?.filter(item => {
    const matchesSearch = searchTerm === "" || 
      item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.articulo?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  const sortedData = [...filteredData].sort((a, b) => {
    switch (sortBy) {
      case 'valorizado':
        return b.totalValorizado - a.totalValorizado;
      case 'perdida':
        return b.porcentajePerdida - a.porcentajePerdida;
      case 'unidades':
        return b.totalUnidades - a.totalUnidades;
      default:
        return 0;
    }
  });

  const totalValorizado = analisis?.resumen?.reduce((sum, r) => sum + r.totalValorizado, 0) || 0;
  const totalVentas = analisis?.resumen?.reduce((sum, r) => sum + r.totalVentas, 0) || 0;
  const articulosConAlerta = filteredData.filter(item => item.alertaPerdida).length;
  const totalArticulos = filteredData.length;

  const handleVerHistorial = (codigo: string) => {
    setSelectedCodigo(codigo);
    setShowHistorial(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingMascot size="lg" message="Cargando análisis valorizado..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl sm:text-2xl font-bold">Reportes Valorizados</h1>
        <p className="text-muted-foreground">
          Análisis de ajustes con valorización económica y comparativa vs ventas
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Select value={selectedSucursal || "todas"} onValueChange={(v) => setSelectedSucursal(v === "todas" ? "" : v)}>
          <SelectTrigger className="w-[180px]">
            <Building2 className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sucursal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las sucursales</SelectItem>
            {SUCURSALES.map((suc) => (
              <SelectItem key={suc} value={suc}>{suc}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar código o artículo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
          <SelectTrigger className="w-[160px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="valorizado">Mayor valor</SelectItem>
            <SelectItem value="perdida">Mayor % pérdida</SelectItem>
            <SelectItem value="unidades">Más unidades</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-red-600" />
                Total Pérdida Valorizada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalValorizado)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                En ajustes de inventario
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-green-600" />
                Total Ventas Período
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalVentas)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ventas de artículos con ajustes
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Alertas &gt;3%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {articulosConAlerta}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Artículos con pérdida crítica
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                Artículos Analizados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {totalArticulos}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Con ajustes registrados
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {analisis?.resumen && analisis.resumen.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Resumen por Sucursal
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">* Los valores están calculados a precio público</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sucursal</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Artículos</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Unidades</TableHead>
                    <TableHead className="text-right">Pérdida $</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Ventas $</TableHead>
                    <TableHead className="text-right">% Pérdida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analisis.resumen.map((item) => (
                    <TableRow key={item.sucursal} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedSucursal(item.sucursal)}>
                      <TableCell className="font-medium">{item.sucursal}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell">{item.articulosConAjuste}</TableCell>
                      <TableCell className="text-right hidden md:table-cell">{item.totalUnidadesAjustadas.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {formatCurrency(item.totalValorizado)}
                      </TableCell>
                      <TableCell className="text-right text-green-600 hidden sm:table-cell">
                        {formatCurrency(item.totalVentas)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={item.porcentajePerdida > 3 ? "destructive" : item.porcentajePerdida > 1 ? "secondary" : "outline"}>
                          {item.porcentajePerdida.toFixed(2)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <TrendingDown className="h-5 w-5" />
            Detalle de Ajustes Valorizados
            {selectedSucursal && (
              <span className="bg-gradient-to-r from-primary to-primary/80 text-white px-4 py-1 rounded-full text-lg font-bold shadow-md">
                {selectedSucursal}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead className="hidden sm:table-cell">Artículo</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Ajustes</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Unidades</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Precio Unit.</TableHead>
                  <TableHead className="text-right">Pérdida $</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Ventas $</TableHead>
                  <TableHead className="text-right">% Pérdida</TableHead>
                  <TableHead className="text-center hidden xl:table-cell">1er Ajuste</TableHead>
                  <TableHead className="text-center hidden xl:table-cell">Último</TableHead>
                  <TableHead className="text-center">Días</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.slice(0, 100).map((item, idx) => (
                  <TableRow key={`${item.sucursal}-${item.codigo}-${idx}`} className={item.alertaPerdida ? "bg-red-50 dark:bg-red-900/10" : ""}>
                    <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                    <TableCell className="max-w-[200px] truncate hidden sm:table-cell" title={item.articulo}>
                      {item.articulo || '-'}
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">
                      <Badge variant="outline">{item.totalAjustes}</Badge>
                    </TableCell>
                    <TableCell className="text-right hidden lg:table-cell">{item.totalUnidades.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-muted-foreground hidden lg:table-cell">
                      {formatCurrency(item.precioUnitario)}
                    </TableCell>
                    <TableCell className="text-right text-red-600 font-medium">
                      {formatCurrency(item.totalValorizado)}
                    </TableCell>
                    <TableCell className="text-right text-green-600 hidden md:table-cell">
                      {formatCurrency(item.totalVentaValorizada)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.alertaPerdida ? (
                        <Badge variant="destructive" className="animate-pulse">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {item.porcentajePerdida.toFixed(1)}%
                        </Badge>
                      ) : (
                        <Badge variant={item.porcentajePerdida > 1 ? "secondary" : "outline"}>
                          {item.porcentajePerdida.toFixed(1)}%
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-xs hidden xl:table-cell">
                      {formatDate(item.primerAjuste)}
                    </TableCell>
                    <TableCell className="text-center text-xs hidden xl:table-cell">
                      <div className="flex flex-col items-center gap-1">
                        {formatDate(item.ultimoAjuste)}
                        {item.sinAjusteAnual && (
                          <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                            +1 año
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={
                        Math.floor((new Date(item.ultimoAjuste).getTime() - new Date(item.primerAjuste).getTime()) / (1000 * 60 * 60 * 24)) > 180 
                          ? "destructive" 
                          : "secondary"
                      }>
                        {Math.floor((new Date(item.ultimoAjuste).getTime() - new Date(item.primerAjuste).getTime()) / (1000 * 60 * 60 * 24))}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleVerHistorial(item.codigo)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {sortedData.length > 100 && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Mostrando 100 de {sortedData.length} artículos
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showHistorial} onOpenChange={setShowHistorial}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Historial de Ajustes: {selectedCodigo}
            </DialogTitle>
          </DialogHeader>
          
          {loadingHistorial ? (
            <div className="flex items-center justify-center py-8">
              <LoadingMascot size="sm" message="Cargando historial..." />
            </div>
          ) : historial && historial.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Diferencia</TableHead>
                    <TableHead className="text-right">Valor Ajuste</TableHead>
                    <TableHead className="text-right">Ventas entre ajustes</TableHead>
                    <TableHead className="text-right">% Pérdida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historial.map((item) => (
                    <TableRow key={item.id} className={item.porcentajePerdida > 3 ? "bg-red-50 dark:bg-red-900/10" : ""}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{formatDate(item.fechaMovimiento)}</span>
                          {item.ajusteAnterior && (
                            <span className="text-xs text-muted-foreground">
                              Anterior: {formatDate(item.ajusteAnterior)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.tipoMovimiento === 'E' ? "secondary" : "destructive"}>
                          {item.tipoMovimiento === 'E' ? 'Entrada' : 'Salida'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.diferencia.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {formatCurrency(item.valorAjuste)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col">
                          <span className="text-green-600">{formatCurrency(item.valorVentasEntreAjustes)}</span>
                          <span className="text-xs text-muted-foreground">
                            {item.ventasEntreAjustes.toFixed(2)} unid.
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.porcentajePerdida > 3 ? (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {item.porcentajePerdida.toFixed(1)}%
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            {item.porcentajePerdida.toFixed(1)}%
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hay historial de ajustes para este código
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
