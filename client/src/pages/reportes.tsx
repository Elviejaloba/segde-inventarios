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
  Loader2,
  ChevronDown,
  ChevronUp,
  Lock,
  Mail,
  Clock
} from "lucide-react";
import { LoadingMascot } from "@/components/ui/loading-mascot";
import { motion } from "framer-motion";
import PuntoEquilibrio from "@/components/punto-equilibrio";
import PuntoEquilibrioResumen from "@/components/punto-equilibrio-resumen";

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

const SUCURSALES_PREMIUM = ["LA TIJERA SAN RAFAEL", "T.Srafael", "LA TIJERA MAIPU", "T.Maipu", "LA TIJERA SAN MARTIN", "LA TIJERA SMARTIN", "T.S.Martin", "T.Lujan", "LA TIJERA LUJAN", "T.Tunuyan", "LA TIJERA TUNUYAN"];

const CODIGOS_PREMIUM: Record<string, string> = {
  'T.Srafael': '0401',
  'LA TIJERA SAN RAFAEL': '0401',
  'T.Tunuyan': '1501',
  'LA TIJERA TUNUYAN': '1501',
  'T.S.Martin': '1201',
  'LA TIJERA SAN MARTIN': '1201',
  'LA TIJERA SMARTIN': '1201',
  'T.Maipu': '1301',
  'LA TIJERA MAIPU': '1301',
  'T.Lujan': '1401',
  'LA TIJERA LUJAN': '1401',
};

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
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");
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
  const [detalleExpanded, setDetalleExpanded] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [premiumCode, setPremiumCode] = useState("");
  const [premiumCodeError, setPremiumCodeError] = useState(false);
  const [unlockedBranches, setUnlockedBranches] = useState<string[]>([]);

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
    queryKey: ['/api/ajustes/valorizado', selectedSucursal, selectedPeriodo, fechaDesde, fechaHasta],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSucursal) params.append('sucursal', selectedSucursal);
      if (fechaDesde && fechaHasta) {
        params.append('fechaDesde', fechaDesde);
        params.append('fechaHasta', fechaHasta);
      } else if (selectedPeriodo && selectedPeriodo !== 'todo') {
        params.append('periodo', selectedPeriodo);
      }
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

  const { data: ultimaActualizacion } = useQuery<{ ajustes_fecha: string; costos_fecha: string; ventas_fecha: string; ajustes_total: string; costos_total: string; ventas_total: string }>({
    queryKey: ['/api/ultima-actualizacion'],
    queryFn: async () => {
      const response = await fetch('/api/ultima-actualizacion');
      if (!response.ok) throw new Error('Error fetching ultima actualizacion');
      return response.json();
    },
    refetchInterval: 300000,
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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold">Reportes Valorizados</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Análisis de ajustes con valorización económica
          </p>
        </div>
        {ultimaActualizacion && (
          <div className="flex items-center gap-2 text-right bg-muted/50 rounded-lg px-3 py-1.5 border">
            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-tight">
                {(() => {
                  const parseLocalDate = (str: string) => {
                    if (!str) return null;
                    if (str.includes(' ')) {
                      const [datePart, timePart] = str.split(' ');
                      const [y, m, d] = datePart.split('-').map(Number);
                      const [h, min] = timePart.split(':').map(Number);
                      return { date: new Date(y, m - 1, d, h, min), hasTime: true };
                    }
                    const [y, m, d] = str.split('-').map(Number);
                    return { date: new Date(y, m - 1, d), hasTime: false };
                  };
                  const costo = parseLocalDate(ultimaActualizacion.costos_fecha);
                  const venta = parseLocalDate(ultimaActualizacion.ventas_fecha);
                  const latest = costo && venta ? (costo.date > venta.date ? costo : venta) : costo || venta;
                  if (!latest) return 'Sin datos';
                  const d = latest.date;
                  const timeStr = latest.hasTime ? ` ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';
                  return `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}${timeStr}`;
                })()}
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight">Última actualización</span>
              <span className="text-[9px] text-muted-foreground/70 leading-tight">Actualización automática: Lun, Mié, Vie</span>
            </div>
          </div>
        )}
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
              {analisis?.resumen?.map((item: any) => (
                <SelectItem key={item.sucursal} value={item.sucursal}>{item.sucursal}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedPeriodo} onValueChange={(v) => { setSelectedPeriodo(v); if (v !== 'custom') { setFechaDesde(''); setFechaHasta(''); } }}>
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
              <SelectItem value="custom">
                <div className="flex flex-col">
                  <span className="font-medium">Rango personalizado</span>
                  <span className="text-xs text-muted-foreground">Elegir fechas</span>
                </div>
              </SelectItem>
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

      {selectedPeriodo === 'custom' && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2.5">
          <Calendar className="h-4 w-4 text-blue-600 shrink-0 hidden sm:block" />
          <span className="text-sm text-blue-700 dark:text-blue-300 font-medium shrink-0">Rango:</span>
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="h-8 w-[140px] text-sm"
            />
            <span className="text-sm text-blue-600">a</span>
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="h-8 w-[140px] text-sm"
            />
          </div>
          {fechaDesde && fechaHasta && (
            <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700">
              {new Date(fechaDesde + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })} → {new Date(fechaHasta + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Badge>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setSelectedPeriodo('todo'); setFechaDesde(''); setFechaHasta(''); }}
            className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800 shrink-0"
          >
            Ver todo
          </Button>
        </div>
      )}

      {selectedPeriodo && selectedPeriodo !== 'todo' && selectedPeriodo !== 'custom' && (
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

      {SUCURSALES_PREMIUM.includes(selectedSucursal) && !unlockedBranches.includes(selectedSucursal) && (
        <div className="fixed inset-0 z-40 pointer-events-none" style={{ top: '140px' }}>
          <div className="absolute inset-0 backdrop-blur-md bg-white/30 dark:bg-black/30" />
          <div className="absolute inset-0 flex items-start justify-center pt-[12vh] pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8 sm:p-10 max-w-md mx-4 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                <Lock className="h-8 w-8 text-gray-500 dark:text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                Información Premium
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Para acceder a este nivel de información, comunicate con la administración para llegar a un acuerdo.
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Si ya tenés el código enviado por administración, ingresalo a continuación:
              </p>
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="text"
                  maxLength={4}
                  value={premiumCode}
                  onChange={(e) => { setPremiumCode(e.target.value); setPremiumCodeError(false); }}
                  placeholder="Código"
                  className={`flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border text-center text-base sm:text-lg tracking-widest font-mono ${premiumCodeError ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && premiumCode.length === 4) {
                      if (CODIGOS_PREMIUM[selectedSucursal] === premiumCode) {
                        setUnlockedBranches(prev => [...prev, selectedSucursal]);
                        setPremiumCode("");
                        setPremiumCodeError(false);
                      } else {
                        setPremiumCodeError(true);
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (CODIGOS_PREMIUM[selectedSucursal] === premiumCode) {
                      setUnlockedBranches(prev => [...prev, selectedSucursal]);
                      setPremiumCode("");
                      setPremiumCodeError(false);
                    } else {
                      setPremiumCodeError(true);
                    }
                  }}
                  className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors duration-200 whitespace-nowrap"
                >
                  Verificar
                </button>
              </div>
              {premiumCodeError && (
                <p className="text-xs text-red-500 mb-4">Código incorrecto. Verificá e intentá de nuevo.</p>
              )}
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                <a
                  href="https://wa.me/542615195614?text=Hola%2C%20me%20gustar%C3%ADa%20consultar%20sobre%20el%20acceso%20premium%20a%20los%20reportes%20de%20inventario."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium text-sm transition-colors duration-200"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Contactar Administración
                </a>
                <button
                  onClick={() => { setSelectedSucursal(""); setPremiumCode(""); setPremiumCodeError(false); }}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-3 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500 transition-colors duration-200"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
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
              {(() => {
                const p2025 = (analisis as any)?.totales?.perdida2025 || 0;
                const p2026 = (analisis as any)?.totales?.perdida2026 || 0;
                const diferencia = p2026 - p2025;
                const variacion = p2025 > 0 ? ((diferencia / p2025) * 100) : 0;
                const isPositive = diferencia > 0;
                const isNegative = diferencia < 0;
                return (
                  <div className="mt-1 space-y-0.5">
                    <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                      <span className="text-muted-foreground">vs 2025:</span>
                      <span className={`font-medium ${isNegative ? 'text-green-600' : isPositive ? 'text-red-600' : 'text-muted-foreground'}`}>
                        {isPositive ? '+' : ''}{formatCurrency(diferencia)}
                      </span>
                      <span className={`font-medium ${isNegative ? 'text-green-600' : isPositive ? 'text-red-600' : 'text-muted-foreground'}`}>
                        ({isPositive ? '+' : ''}{variacion.toFixed(1)}%)
                      </span>
                      {isNegative && <TrendingDown className="h-3 w-3 text-green-600" />}
                      {isPositive && <TrendingUp className="h-3 w-3 text-red-600" />}
                    </div>
                  </div>
                );
              })()}
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
              {(() => {
                const v2025 = (analisis as any)?.totales?.ventas2025 || 0;
                const v2026 = (analisis as any)?.totales?.ventas2026 || 0;
                const diferencia = v2026 - v2025;
                const variacion = v2025 > 0 ? ((diferencia / v2025) * 100) : 0;
                const isPositive = diferencia > 0;
                const isNegative = diferencia < 0;
                return (
                  <div className="mt-1 space-y-0.5">
                    <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                      <span className="text-muted-foreground">vs 2025:</span>
                      <span className={`font-medium ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-muted-foreground'}`}>
                        {isPositive ? '+' : ''}{formatCurrency(diferencia)}
                      </span>
                      <span className={`font-medium ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-muted-foreground'}`}>
                        ({isPositive ? '+' : ''}{variacion.toFixed(1)}%)
                      </span>
                      {isPositive && <TrendingUp className="h-3 w-3 text-green-600" />}
                      {isNegative && <TrendingDown className="h-3 w-3 text-red-600" />}
                    </div>
                  </div>
                );
              })()}
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
              {(() => {
                const art2025 = (analisis as any)?.totales?.articulos2025 || 0;
                const art2026 = (analisis as any)?.totales?.articulos2026 || 0;
                const diferencia = art2026 - art2025;
                const variacion = art2025 > 0 ? ((diferencia / art2025) * 100) : 0;
                const isPositive = diferencia > 0;
                const isNegative = diferencia < 0;
                return (
                  <div className="mt-1 space-y-0.5">
                    <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                      <span className="text-muted-foreground">vs 2025:</span>
                      <span className={`font-medium ${isNegative ? 'text-green-600' : isPositive ? 'text-red-600' : 'text-muted-foreground'}`}>
                        {isPositive ? '+' : ''}{diferencia}
                      </span>
                      <span className={`font-medium ${isNegative ? 'text-green-600' : isPositive ? 'text-red-600' : 'text-muted-foreground'}`}>
                        ({isPositive ? '+' : ''}{variacion.toFixed(1)}%)
                      </span>
                      {isNegative && <TrendingDown className="h-3 w-3 text-green-600" />}
                      {isPositive && <TrendingUp className="h-3 w-3 text-red-600" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground hidden sm:block">
                      2025: {art2025} | 2026: {art2026}
                    </p>
                  </div>
                );
              })()}
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
                    <div className="flex flex-col gap-0.5 mb-1">
                      <div className="flex items-center gap-1.5">
                        <Package className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${iconColor} shrink-0`} />
                        <span className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">{label}</span>
                      </div>
                      {data && !isNeutral && (
                        <div 
                          className={`flex items-center gap-0.5 text-[9px] sm:text-[10px] font-medium px-1 sm:px-1.5 py-0.5 rounded w-fit ${isUp ? 'text-red-600 bg-red-100 dark:bg-red-900/30' : 'text-green-600 bg-green-100 dark:bg-green-900/30'}`}
                          title={isUp ? 'Aumentó respecto a 2025 (más pérdidas)' : 'Disminuyó respecto a 2025 (menos pérdidas)'}
                        >
                          {isUp ? (
                            <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          ) : (
                            <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          )}
                          <span>{Math.abs(variacion).toFixed(1)}%</span>
                        </div>
                      )}
                      {data && isNeutral && (
                        <div 
                          className="flex items-center gap-0.5 text-[9px] sm:text-[10px] font-medium text-gray-500 px-1 sm:px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 w-fit"
                          title="Sin variación significativa respecto a 2025"
                        >
                          <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          <span>0%</span>
                        </div>
                      )}
                    </div>
                    <div className={`text-base sm:text-xl font-bold ${iconColor} truncate`}>
                      {data ? data.totalAjustado.toLocaleString('es-AR', { maximumFractionDigits: 0 }) : '0'}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-1 gap-0.5">
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground">
                        {data ? `${data.articulos} art.` : 'Sin datos'}
                      </span>
                      {data && data.total2025 > 0 && (
                        <span 
                          className="text-[8px] sm:text-[9px] text-muted-foreground cursor-help"
                          title={`Total ajustado en el año 2025: ${data.total2025.toLocaleString('es-AR', { maximumFractionDigits: 2 })} ${unidad === 'UN' ? 'unidades' : unidad === 'MTS' ? 'metros' : 'kilogramos'}`}
                        >
                          '25: {data.total2025.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
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
                <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(true)} data-testid="btn-ver-costo">
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
                    <TableHead className="text-right text-purple-600 hidden md:table-cell" title="Total de unidades (UN) ajustadas">
                      <div className="flex flex-col items-end">
                        <span>UN</span>
                        <span className="text-[10px] font-normal text-muted-foreground">Unidades</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-right text-blue-600 hidden md:table-cell" title="Total de metros (MTS) ajustados">
                      <div className="flex flex-col items-end">
                        <span>MTS</span>
                        <span className="text-[10px] font-normal text-muted-foreground">Metros</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-right text-orange-600 hidden md:table-cell" title="Total de kilogramos (KG) ajustados">
                      <div className="flex flex-col items-end">
                        <span>KG</span>
                        <span className="text-[10px] font-normal text-muted-foreground">Kilogramos</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-right text-xs sm:text-sm">Pérdida $</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm">% Pérd.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analisis.resumen.map((item: any) => {
                    const costData = analisisCosto?.resumen?.find(c => c.sucursal === item.sucursal);
                    return (
                      <TableRow key={item.sucursal} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedSucursal(item.sucursal)}>
                        <TableCell className="font-medium">{item.sucursal}</TableCell>
                        <TableCell className="text-right hidden sm:table-cell">{item.articulosConAjuste}</TableCell>
                        <TableCell className="text-right text-purple-600 font-medium hidden md:table-cell" title={`${(item.totalUn || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })} unidades ajustadas`}>
                          {(item.totalUn || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell className="text-right text-blue-600 font-medium hidden md:table-cell" title={`${(item.totalMts || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })} metros ajustados`}>
                          {(item.totalMts || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell className="text-right text-orange-600 font-medium hidden md:table-cell" title={`${(item.totalKg || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })} kilogramos ajustados`}>
                          {(item.totalKg || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-medium">
                          {formatCurrency(item.totalValorizado)}
                        </TableCell>
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

      {showCostoReposicion && !selectedSucursal && (
        <PuntoEquilibrioResumen />
      )}

      <Card data-testid="tabla-detalle">
        <CardHeader 
          className="cursor-pointer select-none hover:bg-muted/30 transition-colors"
          onClick={() => setDetalleExpanded(!detalleExpanded)}
        >
          <CardTitle className="flex items-center gap-3">
            {detalleExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
            <TrendingDown className="h-5 w-5" />
            Detalle de Ajustes Valorizados
            {selectedSucursal && (
              <span className="bg-gradient-to-r from-primary to-primary/80 text-white px-4 py-1 rounded-full text-lg font-bold shadow-md">
                {selectedSucursal}
              </span>
            )}
            {!detalleExpanded && (
              <span className="text-xs font-normal text-muted-foreground ml-auto">
                Clic para expandir
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
        {detalleExpanded && (
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead className="hidden sm:table-cell">Artículo</TableHead>
                  <TableHead className="text-right text-purple-600 hidden md:table-cell" title="Unidades (UN)">
                    <div className="flex flex-col items-end">
                      <span>UN</span>
                      <span className="text-[10px] font-normal text-muted-foreground">Unidades</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-right text-blue-600 hidden md:table-cell" title="Metros (MTS)">
                    <div className="flex flex-col items-end">
                      <span>MTS</span>
                      <span className="text-[10px] font-normal text-muted-foreground">Metros</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-right text-orange-600 hidden md:table-cell" title="Kilogramos (KG)">
                    <div className="flex flex-col items-end">
                      <span>KG</span>
                      <span className="text-[10px] font-normal text-muted-foreground">Kilogramos</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">Pérdida $</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">% Pérd.</TableHead>
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
                    <TableCell className="text-right text-purple-600 font-medium hidden md:table-cell">
                      {(item.totalUn || 0) > 0 ? (item.totalUn || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 }) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-blue-600 font-medium hidden md:table-cell">
                      {(item.totalMts || 0) > 0 ? (item.totalMts || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 }) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-orange-600 font-medium hidden md:table-cell">
                      {(item.totalKg || 0) > 0 ? (item.totalKg || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 }) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-red-600 font-medium">
                      {formatCurrency(item.totalValorizado)}
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
        )}
      </Card>

      {SUCURSALES_PREMIUM.includes(selectedSucursal) && unlockedBranches.includes(selectedSucursal) && (
        <PuntoEquilibrio sucursal={selectedSucursal} />
      )}

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
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
              <p className="text-sm font-medium text-amber-800 text-center">
                ⚠️ De uso exclusivo para el Directorio
              </p>
            </div>
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
