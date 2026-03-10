import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DollarSign,
  TrendingUp,
  Target,
  AlertTriangle,
  Search,
  BarChart3,
} from "lucide-react";
import { motion } from "framer-motion";

interface ResumenEquilibrio {
  sucursal: string;
  total_articulos: number;
  total_unidades: number;
  perdida_valorizada: number;
  perdida_costo: number;
  margen_promedio: number;
  ventas_totales: number;
  punto_equilibrio: number;
  porcentaje_alcanzado: number;
}

interface DetalleEquilibrio {
  sucursal: string;
  codigo: string;
  articulo: string;
  unidades_perdidas: number;
  precio_venta: number;
  costo: number;
  perdida_valorizada: number;
  perdida_costo: number;
  margen_porcentual: number;
  punto_equilibrio: number;
  ventas_acumuladas: number;
  porcentaje_alcanzado: number;
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatCurrencyFull = (value: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const getProgressColor = (pct: number) => {
  if (pct >= 80) return 'bg-green-500';
  if (pct >= 50) return 'bg-yellow-500';
  if (pct >= 25) return 'bg-orange-500';
  return 'bg-red-500';
};

const getProgressBg = (pct: number) => {
  if (pct >= 80) return 'bg-green-100';
  if (pct >= 50) return 'bg-yellow-100';
  if (pct >= 25) return 'bg-orange-100';
  return 'bg-red-100';
};

interface PuntoEquilibrioProps {
  sucursal: string;
}

export default function PuntoEquilibrio({ sucursal }: PuntoEquilibrioProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useQuery<{ detalle: DetalleEquilibrio[]; resumen: ResumenEquilibrio[] }>({
    queryKey: ['/api/ajustes/punto-equilibrio', sucursal],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sucursal) params.append('sucursal', sucursal);
      const url = `/api/ajustes/punto-equilibrio${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Error fetching data');
      return response.json();
    },
    enabled: !!sucursal
  });

  const resumen = data?.resumen?.[0];
  const detalle = data?.detalle || [];

  const filteredDetalle = detalle.filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return item.codigo.toLowerCase().includes(term) || 
           item.articulo.toLowerCase().includes(term);
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Target className="h-4 w-4 animate-pulse" />
            <span className="text-sm">Calculando punto de equilibrio...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!resumen) return null;

  const perdida = Number(resumen.perdida_valorizada);
  const ptoEq = Number(resumen.punto_equilibrio);
  const ventas = Number(resumen.ventas_totales);
  const pct = Number(resumen.porcentaje_alcanzado);
  const faltante = Math.max(ptoEq - ventas, 0);
  const margen = Number(resumen.margen_promedio);

  return (
    <Card className="border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <Target className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
          Punto de Equilibrio
        </CardTitle>
        <p className="text-[10px] sm:text-xs text-muted-foreground">
          ¿Cuánto necesita vender esta sucursal para cubrir las pérdidas por ajustes?
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
            <div className="rounded-lg border border-red-200 bg-red-50/50 dark:bg-red-900/10 p-2.5 sm:p-3">
              <div className="flex items-center gap-1.5 mb-0.5">
                <AlertTriangle className="h-3 w-3 text-red-600" />
                <span className="text-[9px] sm:text-[10px] font-medium text-red-600 uppercase">Pérdida</span>
              </div>
              <p className="text-sm sm:text-lg font-bold text-red-700">{formatCurrency(perdida)}</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 p-2.5 sm:p-3">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Target className="h-3 w-3 text-blue-600" />
                <span className="text-[9px] sm:text-[10px] font-medium text-blue-600 uppercase">Pto. Equilibrio</span>
              </div>
              <p className="text-sm sm:text-lg font-bold text-blue-700">{formatCurrency(ptoEq)}</p>
              <p className="text-[9px] text-blue-500">Margen {margen}%</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="rounded-lg border border-green-200 bg-green-50/50 dark:bg-green-900/10 p-2.5 sm:p-3">
              <div className="flex items-center gap-1.5 mb-0.5">
                <DollarSign className="h-3 w-3 text-green-600" />
                <span className="text-[9px] sm:text-[10px] font-medium text-green-600 uppercase">Ventas Acum.</span>
              </div>
              <p className="text-sm sm:text-lg font-bold text-green-700">{formatCurrency(ventas)}</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className={`rounded-lg border-2 p-2.5 sm:p-3 ${pct >= 100 ? 'border-green-400 bg-green-50/50 dark:bg-green-900/10' : pct >= 50 ? 'border-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/10' : 'border-orange-400 bg-orange-50/50 dark:bg-orange-900/10'}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <TrendingUp className={`h-3 w-3 ${pct >= 100 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-orange-600'}`} />
                <span className={`text-[9px] sm:text-[10px] font-medium uppercase ${pct >= 100 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-orange-600'}`}>Avance</span>
              </div>
              <p className={`text-sm sm:text-lg font-bold ${pct >= 100 ? 'text-green-700' : pct >= 50 ? 'text-yellow-700' : 'text-orange-700'}`}>
                {pct >= 100 ? '✓ Equilibrio' : `${pct.toFixed(1)}%`}
              </p>
              <p className="text-[9px] text-muted-foreground">
                {faltante > 0 ? `Faltan ${formatCurrency(faltante)}` : 'Cubierto'}
              </p>
            </div>
          </motion.div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>Ventas: {formatCurrency(ventas)}</span>
            <span>Meta: {formatCurrency(ptoEq)}</span>
          </div>
          <div className={`w-full h-6 sm:h-7 rounded-full ${getProgressBg(pct)} relative overflow-hidden`}>
            <motion.div
              className={`h-full rounded-full ${getProgressColor(pct)} flex items-center justify-end pr-2`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(Math.min(pct, 100), 2)}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            >
              {pct > 20 && (
                <span className="text-[10px] sm:text-xs font-bold text-white whitespace-nowrap">
                  {pct >= 100 ? '100%' : `${pct.toFixed(1)}%`}
                </span>
              )}
            </motion.div>
            {pct <= 20 && (
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs font-bold text-muted-foreground">
                {pct.toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-purple-600" />
              Detalle por Artículo
            </h4>
            <div className="relative w-40 sm:w-56">
              <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 h-7 sm:h-8 text-xs"
              />
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-[10px] sm:text-xs font-semibold sticky top-0 bg-muted/95">Código</TableHead>
                  <TableHead className="text-[10px] sm:text-xs font-semibold hidden sm:table-cell sticky top-0 bg-muted/95">Artículo</TableHead>
                  <TableHead className="text-[10px] sm:text-xs font-semibold text-right sticky top-0 bg-muted/95">Un.</TableHead>
                  <TableHead className="text-[10px] sm:text-xs font-semibold text-right hidden sm:table-cell sticky top-0 bg-muted/95">P. Vta</TableHead>
                  <TableHead className="text-[10px] sm:text-xs font-semibold text-right hidden md:table-cell sticky top-0 bg-muted/95">Costo</TableHead>
                  <TableHead className="text-[10px] sm:text-xs font-semibold text-right hidden sm:table-cell sticky top-0 bg-muted/95">Margen</TableHead>
                  <TableHead className="text-[10px] sm:text-xs font-semibold text-right text-red-600 sticky top-0 bg-muted/95">Pérdida</TableHead>
                  <TableHead className="text-[10px] sm:text-xs font-semibold text-right text-blue-600 hidden sm:table-cell sticky top-0 bg-muted/95">Pto.Eq.</TableHead>
                  <TableHead className="text-[10px] sm:text-xs font-semibold text-right text-green-600 hidden sm:table-cell sticky top-0 bg-muted/95">Ventas</TableHead>
                  <TableHead className="text-[10px] sm:text-xs font-semibold w-20 sm:w-28 sticky top-0 bg-muted/95">Avance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDetalle.slice(0, 100).map((item, idx) => {
                  const itemPct = Number(item.porcentaje_alcanzado) || 0;
                  return (
                    <TableRow key={`${item.codigo}-${idx}`} className="hover:bg-muted/30">
                      <TableCell className="text-[10px] sm:text-xs font-mono font-medium py-1">{item.codigo}</TableCell>
                      <TableCell className="text-[10px] sm:text-xs hidden sm:table-cell py-1 max-w-[180px] truncate">{item.articulo}</TableCell>
                      <TableCell className="text-[10px] sm:text-xs text-right py-1">{Number(item.unidades_perdidas).toLocaleString('es-AR', { maximumFractionDigits: 1 })}</TableCell>
                      <TableCell className="text-[10px] sm:text-xs text-right hidden sm:table-cell py-1">{formatCurrencyFull(Number(item.precio_venta))}</TableCell>
                      <TableCell className="text-[10px] sm:text-xs text-right hidden md:table-cell py-1">{formatCurrencyFull(Number(item.costo))}</TableCell>
                      <TableCell className="text-[10px] sm:text-xs text-right hidden sm:table-cell py-1">
                        {Number(item.margen_porcentual) > 0 ? (
                          <Badge variant="outline" className={`text-[8px] sm:text-[9px] px-1 py-0 ${Number(item.margen_porcentual) >= 50 ? 'border-green-300 text-green-700' : Number(item.margen_porcentual) >= 30 ? 'border-yellow-300 text-yellow-700' : 'border-red-300 text-red-700'}`}>
                            {item.margen_porcentual}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-[10px] sm:text-xs text-right font-medium text-red-600 py-1">{formatCurrency(Number(item.perdida_valorizada))}</TableCell>
                      <TableCell className="text-[10px] sm:text-xs text-right font-medium text-blue-600 hidden sm:table-cell py-1">{Number(item.punto_equilibrio) > 0 ? formatCurrency(Number(item.punto_equilibrio)) : '-'}</TableCell>
                      <TableCell className="text-[10px] sm:text-xs text-right font-medium text-green-600 hidden sm:table-cell py-1">{Number(item.ventas_acumuladas) > 0 ? formatCurrency(Number(item.ventas_acumuladas)) : '-'}</TableCell>
                      <TableCell className="py-1">
                        <div className="flex items-center gap-1">
                          <div className={`w-full h-2.5 rounded-full ${getProgressBg(itemPct)} overflow-hidden`}>
                            <div
                              className={`h-full rounded-full ${getProgressColor(itemPct)} transition-all duration-500`}
                              style={{ width: `${Math.max(itemPct, 1)}%` }}
                            />
                          </div>
                          <span className={`text-[8px] sm:text-[9px] font-bold min-w-[24px] text-right ${itemPct >= 100 ? 'text-green-600' : itemPct >= 50 ? 'text-yellow-600' : itemPct > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                            {itemPct > 0 ? (itemPct >= 100 ? '✓' : `${itemPct}%`) : '-'}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filteredDetalle.length > 100 && (
            <p className="text-[10px] text-muted-foreground text-center">
              Mostrando 100 de {filteredDetalle.length} artículos
            </p>
          )}
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50/30 dark:bg-blue-900/10 p-2.5 sm:p-3">
          <div className="flex items-start gap-2">
            <Target className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-[10px] sm:text-xs text-blue-800 dark:text-blue-300 space-y-0.5">
              <p className="font-semibold">¿Cómo se calcula?</p>
              <p><strong>Pérdida</strong> = Unidades perdidas × Precio promedio de venta (con IVA)</p>
              <p><strong>Pto. Equilibrio</strong> = Pérdida / Margen bruto → cuánto debe vender para que la ganancia cubra la pérdida</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}