import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, AlertCircle, RefreshCw, LineChart, FileText } from "lucide-react";
import { AVAILABLE_BRANCHES, Branch, SEASON_CODES_TEMPORADA_VERANO } from "@/lib/store";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useFirebaseData } from "@/hooks/use-firebase-data";
import { ReportsView } from "@/components/reports-view";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  getCalendarioSucursal,
  getChecklistEntriesForMonth,
  getChecklistItemState,
} from "@/lib/calendario-semanal";

interface DashboardProps {
  onBranchSelect?: (branch: string) => void;
}

export function Dashboard({ onBranchSelect }: DashboardProps) {
  const { data, loading, error, refetch } = useFirebaseData();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [selectedView, setSelectedView] = useState<'ranking' | 'reporte'>('ranking');

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleRetry = async () => {
    toast({
      title: "Reconectando",
      description: "Intentando recargar los datos...",
    });
    await refetch();
  };

  if (!mounted || loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="hidden sm:block text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-primary mb-1">Artículos solicitados para realizar inventario</h1>
          <p className="text-muted-foreground text-sm">{"Sistema de Seguimiento — Grupo Crisa"}</p>
        </div>
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="p-3 sm:p-4 border-b bg-muted/30">
            <div className="h-5 w-40 bg-muted animate-pulse rounded" />
          </div>
          <div className="divide-y">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="w-6 h-4 bg-muted animate-pulse rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-32" />
                  <div className="h-2 bg-muted animate-pulse rounded w-full" />
                </div>
                <div className="h-5 w-12 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-4 space-y-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-destructive text-center">{error}</p>
        <Button 
          onClick={handleRetry}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar conexión
        </Button>
      </div>
    );
  }

  // Helper para sanitizar cÃƒÂ³digos (DEBE coincidir exactamente con home.tsx)
  const sanitizeCode = (code: string) => code.toLowerCase().replace(/[/.#$[\]]/g, '-');
  
  // Helper para buscar item por cÃƒÂ³digo - busca tanto el cÃƒÂ³digo original como el sanitizado
  // porque Firebase puede tener datos guardados con cualquiera de los dos formatos
  const findItemByCode = (items: Record<string, any>, code: string) => {
    // Primero intentar con el cÃƒÂ³digo sanitizado (formato actual)
    const sanitized = sanitizeCode(code);
    if (items[sanitized]) return items[sanitized];
    // Luego intentar con el cÃƒÂ³digo original
    if (items[code]) return items[code];
    return null;
  };
  
  const CURRENT_RANKING_PERIOD = '2026-08';

  const branches = AVAILABLE_BRANCHES.map(branchId => {
    const branchData = data?.find(d => d.id === branchId);
    const items = branchData?.items || {};
    
    // Para sucursales con calendario, calcular progreso sobre los items del calendario
    const calendario = getCalendarioSucursal(branchId as Branch);
    
    let totalCompleted = 0;
    let totalItems = 0;
    let augustCompleted = 0;
    let augustTotal = 0;
    let augustPercentage = 0;
    
    if (calendario) {
      // Usar los items del calendario (260 para T.Mendoza)
      const checklistEntries = calendario.semanas.flatMap((semana) => semana.items.map((code) => ({ code, periodKey: semana.periodKey })));
      totalItems = checklistEntries.length;
      const completados = checklistEntries.filter((entry) => getChecklistItemState(branchData, entry.code, entry.periodKey)?.completed === true).length;
      totalCompleted = totalItems > 0 ? (completados / totalItems) * 100 : 0;

      const augustEntries = checklistEntries.filter((entry) => entry.periodKey === CURRENT_RANKING_PERIOD);
      augustTotal = augustEntries.length;
      augustCompleted = augustEntries.filter((entry) => getChecklistItemState(branchData, entry.code, entry.periodKey)?.completed === true).length;
      augustPercentage = augustTotal > 0 ? (augustCompleted / augustTotal) * 100 : 0;
    } else {
      // Para sucursales sin calendario: cuenta items procesados (completado O sin stock), cap 100%
      totalItems = SEASON_CODES_TEMPORADA_VERANO.length;
      const completados = Math.min(
        Object.values(items).filter(i => i.completed === true).length,
        totalItems
      );
      totalCompleted = totalItems > 0 ? (completados / totalItems) * 100 : 0;
    }
    
    const noStockItems = calendario
      ? calendario.semanas.flatMap((semana) => semana.items.map((code) => ({ code, periodKey: semana.periodKey }))).filter((entry) => getChecklistItemState(branchData, entry.code, entry.periodKey)?.hasStock === false).length
      : SEASON_CODES_TEMPORADA_VERANO.filter(code => findItemByCode(items, code)?.hasStock === false).length;
    const noStockPercentage = totalItems > 0 ? (noStockItems / totalItems) * 100 : 0;
    
    const now = new Date();
    const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthAddedItems = Object.values(branchData?.addedItems || {}).filter(item => {
      if (!item.month) {
        const d = new Date(item.addedAt);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === curMonth;
      }
      return item.month === curMonth;
    });
    const addedItemsCount = monthAddedItems.length;
    const addedItemsPercentage = totalItems > 0 ? (addedItemsCount / totalItems) * 100 : 0;

    return {
      id: branchId,
      totalCompleted,
      augustCompleted,
      augustTotal,
      augustPercentage,
      noStock: branchData?.noStock || 0,
      noStockPercentage,
      noStockItems,
      addedItemsCount,
      addedItemsPercentage,
      totalItems,
      items: branchData?.items || {},
      branchData,
      lastUpdated: branchData?.lastUpdated || 0
    };
  });

  const sortedBranches = [...branches].sort((a, b) => {
    if (b.augustCompleted !== a.augustCompleted) return b.augustCompleted - a.augustCompleted;
    if (b.augustPercentage !== a.augustPercentage) return b.augustPercentage - a.augustPercentage;
    return a.id.localeCompare(b.id, 'es-AR');
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="hidden sm:block text-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-1">Artículos solicitados para realizar inventario</h1>
        <p className="text-sm text-muted-foreground italic">a realizar muestreo paleta completa</p>
      </div>
      
      {selectedView === 'ranking' && (
        <div className="mb-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm sm:mb-4 sm:p-5">
          <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <LineChart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 sm:text-2xl">Ranking de Sucursales</h2>
              <p className="text-[11px] sm:text-sm text-slate-500">
                {"Elegí una sucursal para abrir su checklist y revisar el avance actual."}
              </p>
            </div>
          </div>
        </div>
      )}

      {selectedView === 'ranking' ? (
        <div className="mx-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:rounded-2xl">
          <div className="overflow-hidden">
            <Table className="block w-full md:table">
              <TableHeader className="hidden md:table-header-group">
                <TableRow className="bg-slate-50/90">
                  <TableHead className="w-[88px] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Pos.</TableHead>
                  <TableHead className="min-w-[120px] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Sucursal</TableHead>
                  <TableHead className="min-w-[220px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Progreso</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody className="block md:table-row-group">
              {sortedBranches.map((branch, index) => (
                <TableRow
                  key={`branch-${branch.id}-${branch.lastUpdated || index}`}
                  className={`grid grid-cols-[40px_minmax(0,1fr)] gap-x-3 gap-y-2 border-b border-slate-100 p-3 transition-colors hover:bg-slate-50/70 md:table-row md:p-0 ${
                    index === 0 ? 'bg-amber-50/40' :
                    index === 1 ? 'bg-slate-50/70' :
                    index === 2 ? 'bg-orange-50/40' : 'bg-white'
                  }`}
                  onClick={() => onBranchSelect?.(branch.id)}
                >
                  <TableCell className="row-span-2 px-0 py-0 text-center align-top md:table-cell md:px-4 md:py-5 md:align-middle">
                    {index < 3 ? (
                      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 sm:h-9 sm:w-9">
                        <Trophy 
                        className={`h-4 w-4 sm:h-5 sm:w-5 ${
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-400' :
                          'text-amber-600'
                        }`} 
                      />
                      </div>
                    ) : (
                      <span className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-full bg-slate-100 px-2 text-sm font-semibold text-slate-700 sm:h-9">{index + 1}</span>
                    )}
                  </TableCell>
                  <TableCell className="min-w-0 px-0 py-0 align-top md:table-cell md:px-4 md:py-5 md:align-middle"><div className="flex min-w-0 flex-col gap-0.5 pt-0.5 md:pt-0"><span className="truncate text-sm font-semibold text-slate-900 sm:text-[15px]">{branch.id}</span><span className="text-[11px] leading-tight text-slate-500">Checklist y progreso de muestreo</span></div></TableCell>
                  <TableCell className="col-span-2 min-w-0 px-0 pb-0 pt-1 align-middle md:table-cell md:px-4 md:py-5 md:text-right">
                    <div className="w-full space-y-2.5 md:space-y-2">
                      <div className="flex w-full min-w-0 items-center gap-2 md:ml-auto md:max-w-[260px] md:justify-end">
                        <span className="w-[78px] shrink-0 text-[10px] font-medium text-slate-500 sm:text-[11px] md:w-auto md:font-normal md:text-slate-400">Completados</span>
                        <div className="relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-emerald-100 md:w-28 md:flex-none">
                          <motion.div 
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                            initial={{ width: 0 }}
                            animate={{ width: `${branch.totalCompleted}%` }}
                            transition={{ 
                              duration: 1,
                              ease: "easeOut",
                              delay: index * 0.1
                            }}
                          />
                        </div>
                        <motion.span 
                          className="min-w-[36px] text-right text-[11px] font-semibold text-emerald-600 sm:text-sm md:min-w-[42px]"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.1 + 0.5 }}
                        >
                          {Math.round(branch.totalCompleted)}%
                        </motion.span>
                      </div>
                      <div className="flex w-full min-w-0 items-center gap-2 md:ml-auto md:max-w-[260px] md:justify-end">
                        <span className="w-[78px] shrink-0 text-[10px] font-medium text-slate-500 sm:text-[11px] md:w-auto md:font-normal md:text-slate-400">Sin Stock</span>
                        <div className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-orange-100 md:w-24 md:flex-none">
                          <motion.div 
                            className="h-full rounded-full bg-gradient-to-r from-orange-300 to-orange-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${branch.noStockPercentage}%` }}
                            transition={{ 
                              duration: 1,
                              ease: "easeOut",
                              delay: index * 0.1 + 0.2
                            }}
                          />
                        </div>
                        <motion.span 
                          className="min-w-[36px] text-right text-[10px] font-medium text-orange-500 md:min-w-[35px]"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.1 + 0.7 }}
                        >
                          {Math.round(branch.noStockPercentage)}%
                        </motion.span>
                      </div>
                      {branch.addedItemsCount > 0 && (
                        <div className="flex w-full min-w-0 items-center gap-2 md:ml-auto md:max-w-[260px] md:justify-end">
                          <span className="w-[78px] shrink-0 text-[10px] font-medium text-slate-500 sm:text-[11px] md:w-auto md:font-normal md:text-gray-400">Agregados</span>
                          <div className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900/20 md:w-24 md:flex-none">
                            <motion.div 
                              className="h-full rounded-full bg-gradient-to-r from-blue-300 to-blue-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${branch.addedItemsPercentage}%` }}
                              transition={{ 
                                duration: 1,
                                ease: "easeOut",
                                delay: index * 0.1 + 0.3
                              }}
                            />
                          </div>
                          <motion.span 
                            className="min-w-[36px] text-right text-[10px] font-medium text-blue-500 md:min-w-[35px]"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.1 + 0.8 }}
                          >
                            {Math.round(branch.addedItemsPercentage)}%
                          </motion.span>
                        </div>
                      )}
                      {getCalendarioSucursal(branch.id) && (() => {
                        const calendario = getCalendarioSucursal(branch.id);
                        if (!calendario) return null;
                        
                        const mesesMap: { [key: string]: { corto: string, items: number } } = {
                          'DICIEMBRE': { corto: 'Dic', items: 0 },
                          'ENERO': { corto: 'Ene', items: 0 },
                          'FEBRERO': { corto: 'Feb', items: 0 },
                          'MARZO': { corto: 'Mar', items: 0 },
                          'ABRIL': { corto: 'Abr', items: 0 },
                          'MAYO': { corto: 'May', items: 0 },
                          'AGOSTO': { corto: 'Ago', items: 0 }
                        };
                        calendario.semanas.forEach(s => {
                          if (mesesMap[s.mes]) {
                            mesesMap[s.mes].items += s.items.length;
                          }
                        });
                        
                        const objetivos = Object.entries(mesesMap)
                          .filter(([_, value]) => value.items > 0)
                          .map(([mes, value]) => {
                            const entriesMes = getChecklistEntriesForMonth(calendario, mes);
                            const completadosMes = entriesMes.filter((entry) =>
                              getChecklistItemState(branch.branchData, entry.code, entry.periodKey)?.completed === true
                            ).length;

                            return {
                              mes: value.corto,
                              obj: value.items,
                              completadosMes,
                              cumplido: completadosMes >= value.items,
                            };
                          });
                        
                        return (
                          <div className="flex w-full flex-wrap gap-1.5 md:ml-auto md:max-w-[320px] md:justify-end md:gap-2" data-testid="indicadores-meses-ranking">
                            {objetivos.map(({ mes, obj, completadosMes, cumplido }) => {
                              return (
                                <span 
                                  key={mes}
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-medium leading-tight whitespace-nowrap sm:px-3 sm:py-1.5 sm:text-[11px] ${
                                    cumplido 
                                      ? 'bg-emerald-500 text-white shadow-sm' 
                                      : completadosMes > 0 
                                        ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200' 
                                        : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
                                  }`}
                                  title={`${mes}: ${completadosMes}/${obj}`}
                                >
                                  {mes} {cumplido ? '\u2713' : `${completadosMes}/${obj}`}
                                </span>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <ReportsView />
      )}
    </div>
  );
}

