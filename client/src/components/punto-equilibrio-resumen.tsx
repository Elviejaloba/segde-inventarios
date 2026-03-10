import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Building2,
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

const SUCURSAL_MAP: Record<string, string> = {
  'LA TIJERA TUNUYAN': 'T.Tunuyan',
  'LA TIJERA SAN RAFAEL': 'T.Srafael',
  'LA TIJERA SAN MARTIN': 'T.S.Martin',
  'LA TIJERA SMARTIN': 'T.S.Martin',
  'LA TIJERA MAIPU': 'T.Maipu',
  'LA TIJERA LUJAN': 'T.Lujan',
  'LA TIJERA MENDOZA': 'T.Mendoza',
  'LA TIJERA SAN LUIS': 'T.SLuis',
  'LA TIJERA SAN JUAN': 'T.Sjuan',
  'CRISA 2': 'Crisa2',
};

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

const getProgressColor = (pct: number) => {
  if (pct >= 100) return 'bg-green-500';
  if (pct >= 50) return 'bg-yellow-500';
  if (pct >= 25) return 'bg-orange-500';
  return 'bg-red-500';
};

const getProgressBg = (pct: number) => {
  if (pct >= 100) return 'bg-green-100';
  if (pct >= 50) return 'bg-yellow-100';
  if (pct >= 25) return 'bg-orange-100';
  return 'bg-red-100';
};

export default function PuntoEquilibrioResumen() {
  const { data, isLoading } = useQuery<{ detalle: any[]; resumen: ResumenEquilibrio[] }>({
    queryKey: ['/api/ajustes/punto-equilibrio'],
    queryFn: async () => {
      const response = await fetch('/api/ajustes/punto-equilibrio');
      if (!response.ok) throw new Error('Error fetching data');
      return response.json();
    }
  });

  const resumen = data?.resumen || [];

  const totalPerdida = resumen.reduce((s, r) => s + Number(r.perdida_valorizada), 0);
  const totalVentas = resumen.reduce((s, r) => s + Number(r.ventas_totales), 0);
  const totalEquilibrio = resumen.reduce((s, r) => s + Number(r.punto_equilibrio), 0);
  const porcentajeGlobal = totalEquilibrio > 0 ? Math.min((totalVentas / totalEquilibrio) * 100, 100) : 0;

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

  if (!resumen.length) return null;

  return (
    <Card className="border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <Target className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
          Punto de Equilibrio por Sucursal
        </CardTitle>
        <p className="text-[10px] sm:text-xs text-muted-foreground">
          ¿Cuánto necesita vender cada sucursal para cubrir las pérdidas por ajustes?
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
            <div className="rounded-lg border border-red-200 bg-red-50/50 dark:bg-red-900/10 p-2.5 sm:p-3">
              <div className="flex items-center gap-1.5 mb-0.5">
                <AlertTriangle className="h-3 w-3 text-red-600" />
                <span className="text-[9px] sm:text-[10px] font-medium text-red-600 uppercase">Pérdida Total</span>
              </div>
              <p className="text-sm sm:text-lg font-bold text-red-700">{formatCurrency(totalPerdida)}</p>
              <p className="text-[9px] text-red-500">A precio público</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 p-2.5 sm:p-3">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Target className="h-3 w-3 text-blue-600" />
                <span className="text-[9px] sm:text-[10px] font-medium text-blue-600 uppercase">Pto. Equilibrio</span>
              </div>
              <p className="text-sm sm:text-lg font-bold text-blue-700">{formatCurrency(totalEquilibrio)}</p>
              <p className="text-[9px] text-blue-500">Ventas necesarias</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="rounded-lg border border-green-200 bg-green-50/50 dark:bg-green-900/10 p-2.5 sm:p-3">
              <div className="flex items-center gap-1.5 mb-0.5">
                <DollarSign className="h-3 w-3 text-green-600" />
                <span className="text-[9px] sm:text-[10px] font-medium text-green-600 uppercase">Ventas Acum.</span>
              </div>
              <p className="text-sm sm:text-lg font-bold text-green-700">{formatCurrency(totalVentas)}</p>
              <p className="text-[9px] text-green-500">Todas las sucursales</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className={`rounded-lg border-2 p-2.5 sm:p-3 ${porcentajeGlobal >= 100 ? 'border-green-400 bg-green-50/50 dark:bg-green-900/10' : porcentajeGlobal >= 50 ? 'border-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/10' : 'border-orange-400 bg-orange-50/50 dark:bg-orange-900/10'}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <TrendingUp className={`h-3 w-3 ${porcentajeGlobal >= 100 ? 'text-green-600' : porcentajeGlobal >= 50 ? 'text-yellow-600' : 'text-orange-600'}`} />
                <span className={`text-[9px] sm:text-[10px] font-medium uppercase ${porcentajeGlobal >= 100 ? 'text-green-600' : porcentajeGlobal >= 50 ? 'text-yellow-600' : 'text-orange-600'}`}>Avance Global</span>
              </div>
              <p className={`text-sm sm:text-lg font-bold ${porcentajeGlobal >= 100 ? 'text-green-700' : porcentajeGlobal >= 50 ? 'text-yellow-700' : 'text-orange-700'}`}>
                {porcentajeGlobal >= 100 ? '✓ Cubierto' : `${porcentajeGlobal.toFixed(1)}%`}
              </p>
              <p className="text-[9px] text-muted-foreground">
                {totalEquilibrio > totalVentas ? `Faltan ${formatCurrency(totalEquilibrio - totalVentas)}` : 'Equilibrio alcanzado'}
              </p>
            </div>
          </motion.div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-[10px] sm:text-xs font-semibold">Sucursal</TableHead>
                <TableHead className="text-[10px] sm:text-xs font-semibold text-right hidden sm:table-cell">Arts.</TableHead>
                <TableHead className="text-[10px] sm:text-xs font-semibold text-right hidden sm:table-cell">Margen</TableHead>
                <TableHead className="text-[10px] sm:text-xs font-semibold text-right text-red-600">Pérdida</TableHead>
                <TableHead className="text-[10px] sm:text-xs font-semibold text-right text-blue-600">Pto. Eq.</TableHead>
                <TableHead className="text-[10px] sm:text-xs font-semibold text-right text-green-600 hidden sm:table-cell">Ventas</TableHead>
                <TableHead className="text-[10px] sm:text-xs font-semibold w-24 sm:w-36">Avance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resumen.map((item, idx) => {
                const pct = Number(item.porcentaje_alcanzado) || 0;
                const shortName = SUCURSAL_MAP[item.sucursal] || item.sucursal;
                return (
                  <motion.tr
                    key={item.sucursal}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-b hover:bg-muted/30"
                  >
                    <TableCell className="text-xs font-medium py-2">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3 w-3 text-purple-600 shrink-0" />
                        {shortName}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-right hidden sm:table-cell py-2">{item.total_articulos}</TableCell>
                    <TableCell className="text-xs text-right hidden sm:table-cell py-2">
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 ${Number(item.margen_promedio) >= 50 ? 'border-green-300 text-green-700' : Number(item.margen_promedio) >= 30 ? 'border-yellow-300 text-yellow-700' : 'border-red-300 text-red-700'}`}>
                        {item.margen_promedio}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium text-red-600 py-2">{formatCurrency(Number(item.perdida_valorizada))}</TableCell>
                    <TableCell className="text-xs text-right font-medium text-blue-600 py-2">{formatCurrency(Number(item.punto_equilibrio))}</TableCell>
                    <TableCell className="text-xs text-right font-medium text-green-600 hidden sm:table-cell py-2">{formatCurrency(Number(item.ventas_totales))}</TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1.5">
                        <div className={`flex-1 h-3 sm:h-4 rounded-full ${getProgressBg(pct)} overflow-hidden`}>
                          <motion.div
                            className={`h-full rounded-full ${getProgressColor(pct)}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(Math.min(pct, 100), 2)}%` }}
                            transition={{ duration: 0.8, delay: idx * 0.05, ease: "easeOut" }}
                          />
                        </div>
                        <span className={`text-[9px] sm:text-[10px] font-bold min-w-[30px] text-right ${pct >= 100 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-orange-600'}`}>
                          {pct >= 100 ? '✓' : `${pct.toFixed(0)}%`}
                        </span>
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
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