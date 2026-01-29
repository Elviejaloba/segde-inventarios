import { useState, useEffect } from "react";
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
  TrendingUp,
  AlertTriangle,
  Package,
  Search,
  Building2,
  Calendar,
  ArrowUpDown,
  Eye,
  RefreshCw,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus,
  FileText,
  ExternalLink,
  Loader2
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
  totalCostoReposicion: number;
  primerAjuste: string;
  ultimoAjuste: string;
  totalVendido: number;
  totalVentaValorizada: number;
  porcentajePerdida: number;
  alertaPerdida: boolean;
  sinAjusteAnual: boolean;
  diferencia2025: number;
  diferencia2026: number;
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

interface MuestreoFile {
  id: string;
  name: string;
  path: string;
  size: number;
  modified: string;
  sharedLink?: string;
}

const PERIODOS = [
  { value: 'todo', label: 'Todo el historial', description: 'Desde el inicio' },
  { value: '2025', label: 'Año 2025', description: 'Ene - Dic 2025' },
  { value: '2026', label: 'Año 2026', description: 'Ene 2026 en adelante' },
  { value: 'ultimo-trimestre', label: 'Último trimestre', description: 'Últimos 3 meses' },
  { value: 'ultimo-semestre', label: 'Último semestre', description: 'Últimos 6 meses' },
];

export default function ReportesPage() {
  const [selectedSucursal, setSelectedSucursal] = useState<string>("");
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>("todo");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'valorizado' | 'perdida' | 'unidades'>('valorizado');
  const [selectedCodigo, setSelectedCodigo] = useState<string | null>(null);
  const [showHistorial, setShowHistorial] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showDocumentos, setShowDocumentos] = useState(false);
  const [selectedCodigoDoc, setSelectedCodigoDoc] = useState<{ codigo: string; articulo: string; sucursal: string } | null>(null);
  const [loadingLink, setLoadingLink] = useState<string | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [showCostoReposicion, setShowCostoReposicion] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPeriodoLabel = () => {
    const periodo = PERIODOS.find(p => p.value === selectedPeriodo);
    return periodo?.description || 'Todo el historial';
  };

  const { data: analisis, isLoading, refetch } = useQuery<{ detalle: AnalisisItem[]; resumen: ResumenSucursal[] }>({
    queryKey: ['/api/ajustes/valorizado', selectedSucursal, selectedPeriodo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSucursal) params.append('sucursal', selectedSucursal);
      if (selectedPeriodo && selectedPeriodo !== 'todo') params.append('periodo', selectedPeriodo);
      const url = `/api/ajustes/valorizado${params.toString() ? `?${params.toString()}` : ''}`;
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

  const { data: muestreos, isLoading: loadingMuestreos } = useQuery<MuestreoFile[]>({
    queryKey: ['/api/muestreos'],
    queryFn: async () => {
      const response = await fetch('/api/muestreos');
      if (!response.ok) throw new Error('Error fetching muestreos');
      return response.json();
    },
    enabled: showDocumentos
  });

  const { data: analisisCosto } = useQuery<{ resumen: Array<{ sucursal: string; unidadesAjustadas: number; perdidaCosto: number }> }>({
    queryKey: ['/api/ajustes/valorizado-costo', selectedSucursal],
    queryFn: async () => {
      const url = selectedSucursal 
        ? `/api/ajustes/valorizado-costo?sucursal=${encodeURIComponent(selectedSucursal)}`
        : '/api/ajustes/valorizado-costo';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Error fetching data con costo');
      return response.json();
    },
    enabled: showCostoReposicion
  });

  const { data: ajustesPorUnidad } = useQuery<Array<{ unidadMedida: string; articulos: number; registros: number; totalAjustado: number; total2025: number; variacionPorcentaje: number }>>({
    queryKey: ['/api/ajustes/por-unidad', selectedSucursal, selectedPeriodo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSucursal) params.append('sucursal', selectedSucursal);
      if (selectedPeriodo && selectedPeriodo !== 'todo') params.append('periodo', selectedPeriodo);
      const url = `/api/ajustes/por-unidad${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Error fetching ajustes por unidad');
      return response.json();
    }
  });

  const filteredMuestreos = muestreos?.filter(file => {
    if (!selectedCodigoDoc) return true;
    const sucursal = selectedCodigoDoc.sucursal.toLowerCase();
    const fileName = file.name.toLowerCase();
    return fileName.includes(sucursal.toLowerCase()) || 
           fileName.includes(sucursal.replace(/\./g, '').toLowerCase()) ||
           fileName.includes(sucursal.replace('t.', '').toLowerCase());
  }) || [];

  const handleOpenDocument = async (file: MuestreoFile) => {
    if (file.sharedLink) {
      window.open(file.sharedLink, '_blank');
      return;
    }
    setLoadingLink(file.id);
    try {
      const response = await fetch(`/api/muestreos/${encodeURIComponent(file.id)}/link?path=${encodeURIComponent(file.path)}`);
      if (response.ok) {
        const data = await response.json();
        window.open(data.link, '_blank');
      }
    } catch (error) {
      console.error('Error getting file link:', error);
    } finally {
      setLoadingLink(null);
    }
  };

  const handleVerDocumentos = (item: AnalisisItem) => {
    setSelectedCodigoDoc({ 
      codigo: item.codigo, 
      articulo: item.articulo, 
      sucursal: item.sucursal 
    });
    setShowDocumentos(true);
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === "2809") {
      setShowCostoReposicion(true);
      setShowPasswordDialog(false);
      setPasswordInput("");
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleCloseCostoMode = () => {
    setShowCostoReposicion(false);
  };

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
  const articulosConAlerta = (analisis as any)?.totales?.totalAlertas || 0;
  const totalArticulos = (analisis as any)?.totales?.totalArticulos || 0;

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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-1 sm:gap-2">
        <h1 className="text-lg sm:text-2xl font-bold">Reportes Valorizados</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Análisis de ajustes con valorización económica
        </p>
      </div>

      <div className="flex flex-col gap-3" data-testid="reportes-filtros">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Select value={selectedSucursal || "todas"} onValueChange={(v) => setSelectedSucursal(v === "todas" ? "" : v)}>
            <SelectTrigger className="w-full" data-testid="select-sucursal">
              <Building2 className="h-4 w-4 mr-2 text-purple-600 shrink-0" />
              <SelectValue placeholder="Sucursal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las sucursales</SelectItem>
              {SUCURSALES.map((suc) => (
                <SelectItem key={suc} value={suc}>{suc}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedPeriodo} onValueChange={setSelectedPeriodo}>
            <SelectTrigger className="w-full">
              <Calendar className="h-4 w-4 mr-2 text-blue-600 shrink-0" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {PERIODOS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{p.label}</span>
                    <span className="text-xs text-muted-foreground">{p.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-full">
              <ArrowUpDown className="h-4 w-4 mr-2 text-gray-600 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="valorizado">Mayor valor</SelectItem>
              <SelectItem value="perdida">Mayor % pérdida</SelectItem>
              <SelectItem value="unidades">Más unidades</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => refetch()} className="shrink-0">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {selectedPeriodo && selectedPeriodo !== 'todo' && (
        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2">
          <Calendar className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-blue-700 dark:text-blue-300">
            Período seleccionado: <strong>{PERIODOS.find(p => p.value === selectedPeriodo)?.label}</strong>
          </span>
          <span className="text-xs text-blue-600 dark:text-blue-400">
            ({getPeriodoLabel()})
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSelectedPeriodo('todo')}
            className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
          >
            Ver todo
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4" data-testid="reportes-kpis">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800" data-testid="kpi-perdida">
            <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                <span className="hidden sm:inline">Total Pérdida Valorizada</span>
                <span className="sm:hidden">Pérdida</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-base sm:text-2xl font-bold text-red-600">
                {formatCurrency(totalValorizado)}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 hidden sm:block">
                En ajustes de inventario
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800" data-testid="kpi-ventas">
            <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                <span className="hidden sm:inline">Total Ventas Período</span>
                <span className="sm:hidden">Ventas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-base sm:text-2xl font-bold text-green-600">
                {formatCurrency(totalVentas)}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 hidden sm:block">
                Ventas de artículos con ajustes
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800" data-testid="kpi-alertas">
            <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
                <span>Alertas &gt;3%</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-base sm:text-2xl font-bold text-amber-600">
                {articulosConAlerta}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 hidden sm:block">
                Artículos con pérdida crítica
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800" data-testid="kpi-articulos">
            <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
                <Package className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                <span className="hidden sm:inline">Artículos Analizados</span>
                <span className="sm:hidden">Artículos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-base sm:text-2xl font-bold text-blue-600">
                {totalArticulos}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 hidden sm:block">
                Con ajustes registrados
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {ajustesPorUnidad && ajustesPorUnidad.length > 0 && (
        <Card className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/30 dark:to-slate-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-slate-600" />
              Ajustes por Unidad de Medida
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Total ajustado consolidado por tipo de unidad (comparado vs 2025)
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {(['UN', 'MTS', 'KG'] as const).map((unidad) => {
                const data = ajustesPorUnidad.find(u => u.unidadMedida === unidad);
                const iconColor = unidad === 'UN' ? 'text-purple-600' : unidad === 'MTS' ? 'text-blue-600' : 'text-orange-600';
                const bgColor = unidad === 'UN' ? 'from-purple-50 to-purple-100 dark:from-purple-900/20' : unidad === 'MTS' ? 'from-blue-50 to-blue-100 dark:from-blue-900/20' : 'from-orange-50 to-orange-100 dark:from-orange-900/20';
                const label = unidad === 'UN' ? 'Unidades' : unidad === 'MTS' ? 'Metros' : 'Kilogramos';
                const variacion = data?.variacionPorcentaje || 0;
                const isUp = variacion > 0;
                const isDown = variacion < 0;
                const isNeutral = Math.abs(variacion) < 0.5;
                
                const tooltipText = data 
                  ? `${label}: ${data.totalAjustado.toLocaleString('es-AR', { maximumFractionDigits: 2 })} ${unidad === 'UN' ? 'unidades' : unidad === 'MTS' ? 'metros' : 'kilogramos'} ajustados en total.\n\n` +
                    `En 2025: ${data.total2025.toLocaleString('es-AR', { maximumFractionDigits: 2 })} ${unidad === 'UN' ? 'unidades' : unidad === 'MTS' ? 'metros' : 'kilogramos'}.\n\n` +
                    (isUp ? `↑ Aumento del ${Math.abs(variacion).toFixed(1)}% respecto a 2025 (más pérdidas)` : 
                     isDown ? `↓ Disminución del ${Math.abs(variacion).toFixed(1)}% respecto a 2025 (menos pérdidas)` : 
                     'Sin variación significativa respecto a 2025') +
                    `\n\n${data.articulos} artículos diferentes afectados.`
                  : 'Sin datos para esta unidad de medida';

                return (
                  <div 
                    key={unidad} 
                    className={`bg-gradient-to-br ${bgColor} rounded-lg p-3 border cursor-help transition-transform hover:scale-[1.02]`}
                    title={tooltipText}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Package className={`h-4 w-4 ${iconColor}`} />
                        <span className="text-xs font-medium text-muted-foreground">{label}</span>
                      </div>
                      {data && !isNeutral && (
                        <div 
                          className={`flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded ${isUp ? 'text-red-600 bg-red-100 dark:bg-red-900/30' : 'text-green-600 bg-green-100 dark:bg-green-900/30'}`}
                          title={isUp ? 'Aumentó respecto a 2025 (más pérdidas)' : 'Disminuyó respecto a 2025 (menos pérdidas)'}
                        >
                          {isUp ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          <span>{Math.abs(variacion).toFixed(1)}%</span>
                        </div>
                      )}
                      {data && isNeutral && (
                        <div 
                          className="flex items-center gap-0.5 text-[10px] font-medium text-gray-500 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800"
                          title="Sin variación significativa respecto a 2025"
                        >
                          <Minus className="h-3 w-3" />
                          <span>0%</span>
                        </div>
                      )}
                    </div>
                    <div className={`text-lg sm:text-xl font-bold ${iconColor}`}>
                      {data ? data.totalAjustado.toLocaleString('es-AR', { maximumFractionDigits: 2 }) : '0'}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {data ? `${data.articulos} artículos` : 'Sin datos'}
                      </span>
                      {data && data.total2025 > 0 && (
                        <span 
                          className="text-[9px] text-muted-foreground cursor-help"
                          title={`Total ajustado en el año 2025: ${data.total2025.toLocaleString('es-AR', { maximumFractionDigits: 2 })} ${unidad === 'UN' ? 'unidades' : unidad === 'MTS' ? 'metros' : 'kilogramos'}`}
                        >
                          2025: {data.total2025.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {analisis?.resumen && analisis.resumen.length > 0 && (
        <Card data-testid="tabla-resumen">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Resumen por Sucursal
              </CardTitle>
              {showCostoReposicion ? (
                <Button variant="outline" size="sm" onClick={handleCloseCostoMode} className="text-green-600 border-green-600">
                  <Eye className="h-4 w-4 mr-1" />
                  Ocultar Costo
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(true)}>
                  <DollarSign className="h-4 w-4 mr-1" />
                  Ver con Costo
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {showCostoReposicion 
                ? "* Los valores están calculados a COSTO DE REPOSICIÓN"
                : "* Los valores están calculados a precio público"}
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sucursal</TableHead>
                    <TableHead className="text-right hidden sm:table-cell" title="Cantidad de artículos diferentes con ajustes">
                      <div className="flex flex-col items-end">
                        <span>Artículos</span>
                        <span className="text-[10px] font-normal text-muted-foreground">Cant. ajuste</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-right text-purple-600" title="Total de unidades (UN) ajustadas">
                      <div className="flex flex-col items-end">
                        <span>UN</span>
                        <span className="text-[10px] font-normal text-muted-foreground">Unidades</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-right text-blue-600" title="Total de metros (MTS) ajustados">
                      <div className="flex flex-col items-end">
                        <span>MTS</span>
                        <span className="text-[10px] font-normal text-muted-foreground">Metros</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-right text-orange-600" title="Total de kilogramos (KG) ajustados">
                      <div className="flex flex-col items-end">
                        <span>KG</span>
                        <span className="text-[10px] font-normal text-muted-foreground">Kilogramos</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Pérdida $</TableHead>
                    {showCostoReposicion && (
                      <TableHead className="text-right text-green-700">Costo Rep.</TableHead>
                    )}
                    <TableHead className="text-right">% Pérdida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analisis.resumen.map((item: any) => {
                    const costData = analisisCosto?.resumen?.find(c => c.sucursal === item.sucursal);
                    return (
                      <TableRow key={item.sucursal} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedSucursal(item.sucursal)}>
                        <TableCell className="font-medium">{item.sucursal}</TableCell>
                        <TableCell className="text-right hidden sm:table-cell">{item.articulosConAjuste}</TableCell>
                        <TableCell className="text-right text-purple-600 font-medium" title={`${(item.totalUn || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })} unidades ajustadas`}>
                          {(item.totalUn || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell className="text-right text-blue-600 font-medium" title={`${(item.totalMts || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })} metros ajustados`}>
                          {(item.totalMts || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell className="text-right text-orange-600 font-medium" title={`${(item.totalKg || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })} kilogramos ajustados`}>
                          {(item.totalKg || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-medium">
                          {formatCurrency(item.totalValorizado)}
                        </TableCell>
                        {showCostoReposicion && (
                          <TableCell className="text-right text-green-700 font-medium">
                            {costData ? formatCurrency(costData.perdidaCosto) : '-'}
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <Badge variant={item.porcentajePerdida > 3 ? "destructive" : item.porcentajePerdida > 1 ? "secondary" : "outline"}>
                            {item.porcentajePerdida.toFixed(2)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="tabla-detalle">
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
          <p className="text-xs text-muted-foreground mt-1">
            {selectedSucursal 
              ? `Datos de la sucursal ${selectedSucursal}. Valores a precio público.`
              : "Datos consolidados de todas las sucursales. Valores a precio público. Haga clic en una sucursal del resumen para filtrar."
            }
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead className="hidden sm:table-cell">Artículo</TableHead>
                  <TableHead className="text-right text-purple-600" title="Unidades (UN)">
                    <div className="flex flex-col items-end">
                      <span>UN</span>
                      <span className="text-[10px] font-normal text-muted-foreground">Unidades</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-right text-blue-600" title="Metros (MTS)">
                    <div className="flex flex-col items-end">
                      <span>MTS</span>
                      <span className="text-[10px] font-normal text-muted-foreground">Metros</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-right text-orange-600" title="Kilogramos (KG)">
                    <div className="flex flex-col items-end">
                      <span>KG</span>
                      <span className="text-[10px] font-normal text-muted-foreground">Kilogramos</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Pérdida $</TableHead>
                  {showCostoReposicion && (
                    <TableHead className="text-right text-green-700"></TableHead>
                  )}
                  <TableHead className="text-right">% Pérdida</TableHead>
                  <TableHead className="text-center hidden xl:table-cell">Último</TableHead>
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
                    <TableCell className="text-right text-purple-600 font-medium">
                      {(item.totalUn || 0) > 0 ? (item.totalUn || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 }) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-blue-600 font-medium">
                      {(item.totalMts || 0) > 0 ? (item.totalMts || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 }) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-orange-600 font-medium">
                      {(item.totalKg || 0) > 0 ? (item.totalKg || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 }) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-red-600 font-medium">
                      {formatCurrency(item.totalValorizado)}
                    </TableCell>
                    {showCostoReposicion && (
                      <TableCell className="text-right text-green-700 font-medium">
                        {formatCurrency(item.totalCostoReposicion)}
                      </TableCell>
                    )}
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
                      <div className="flex flex-col items-center gap-1">
                        {formatDate(item.ultimoAjuste)}
                        {item.sinAjusteAnual && (
                          <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                            Solo 2025
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleVerHistorial(item.codigo)} title="Ver historial">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleVerDocumentos(item)} title="Buscar en documentos">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </Button>
                      </div>
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
                    <TableHead>Código</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Diferencia</TableHead>
                    <TableHead className="text-right">Valor Ajuste</TableHead>
                    <TableHead className="text-right">Ventas período</TableHead>
                    <TableHead className="text-right">% Pérdida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historial.map((item) => {
                    const colorMatch = item.codigo.match(/\s+(\d{2})$/);
                    const colorCode = colorMatch ? colorMatch[1] : null;
                    const colorNum = colorCode ? parseInt(colorCode) : 0;
                    const colorStyle = colorNum > 0 ? {
                      backgroundColor: `hsl(${(colorNum * 25) % 360}, 70%, 90%)`,
                      color: `hsl(${(colorNum * 25) % 360}, 70%, 30%)`,
                      border: `1px solid hsl(${(colorNum * 25) % 360}, 70%, 70%)`
                    } : {};
                    
                    return (
                    <TableRow key={item.id} className={item.porcentajePerdida > 3 ? "bg-red-50 dark:bg-red-900/10" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{item.codigo.replace(/\s+\d{2}$/, '')}</span>
                          {colorCode && (
                            <span 
                              className="px-2 py-0.5 rounded-full text-xs font-bold"
                              style={colorStyle}
                            >
                              {colorCode}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.sucursal}
                        </Badge>
                      </TableCell>
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
                  )})}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <div className="text-muted-foreground">
                No se encontraron ajustes para el código <span className="font-mono font-bold">{selectedCodigo}</span>
              </div>
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg max-w-md mx-auto">
                <p className="font-medium mb-1">Posibles razones:</p>
                <ul className="list-disc list-inside text-left space-y-1">
                  <li>El código fue dado de baja o cambió de nombre</li>
                  <li>Los ajustes fueron registrados con un código diferente</li>
                  <li>Este artículo no tiene ajustes en el sistema actual</li>
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showDocumentos} onOpenChange={setShowDocumentos}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Documentos de Muestreo
            </DialogTitle>
          </DialogHeader>
          
          {selectedCodigoDoc && (
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Buscando código:</p>
              <p className="font-mono font-bold text-lg">{selectedCodigoDoc.codigo}</p>
              <p className="text-sm text-muted-foreground">{selectedCodigoDoc.articulo}</p>
              <Badge variant="secondary" className="mt-2">
                <Building2 className="h-3 w-3 mr-1" />
                {selectedCodigoDoc.sucursal}
              </Badge>
            </div>
          )}

          <p className="text-sm text-muted-foreground mb-4">
            Documentos de la sucursal donde puedes buscar este código:
          </p>

          {loadingMuestreos ? (
            <div className="flex items-center justify-center py-8">
              <LoadingMascot size="sm" message="Cargando documentos..." />
            </div>
          ) : filteredMuestreos.length > 0 ? (
            <div className="space-y-2">
              {filteredMuestreos.slice(0, 20).map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(file.modified).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })} • {(file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDocument(file)}
                    disabled={loadingLink === file.id}
                  >
                    {loadingLink === file.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Abrir
                      </>
                    )}
                  </Button>
                </div>
              ))}
              {filteredMuestreos.length > 20 && (
                <p className="text-center text-sm text-muted-foreground pt-2">
                  Mostrando 20 de {filteredMuestreos.length} documentos
                </p>
              )}
            </div>
          ) : muestreos && muestreos.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                No hay documentos específicos para {selectedCodigoDoc?.sucursal}. 
                Mostrando todos los documentos disponibles:
              </p>
              <div className="space-y-2">
                {muestreos.slice(0, 10).map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(file.modified).toLocaleDateString('es-AR')}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDocument(file)}
                      disabled={loadingLink === file.id}
                    >
                      {loadingLink === file.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Abrir
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hay documentos de muestreo disponibles
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Ver a Costo de Reposición
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Ingrese la contraseña para ver los valores a costo de reposición
            </p>
            <Input
              type="password"
              placeholder="Contraseña"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setPasswordError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePasswordSubmit();
              }}
              className={passwordError ? "border-red-500" : ""}
            />
            {passwordError && (
              <p className="text-sm text-red-500">Contraseña incorrecta</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowPasswordDialog(false);
                setPasswordInput("");
                setPasswordError(false);
              }}>
                Cancelar
              </Button>
              <Button onClick={handlePasswordSubmit}>
                Acceder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showScrollTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary/90 transition-colors z-50"
          title="Volver arriba"
        >
          <ArrowUp className="h-6 w-6" />
        </motion.button>
      )}
    </div>
  );
}
