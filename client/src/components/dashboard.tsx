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
import { getCalendarioSucursal } from "@/lib/calendario-semanal";

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
          <h1 className="text-2xl md:text-3xl font-bold text-primary mb-1">Articulos sin rotacion y sobre stock</h1>
          <p className="text-muted-foreground text-sm">Sistema de Seguimiento — Grupo Crisa</p>
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

  // Helper para sanitizar códigos (DEBE coincidir exactamente con home.tsx)
  const sanitizeCode = (code: string) => code.toLowerCase().replace(/[/.#$[\]]/g, '-');
  
  // Helper para buscar item por código - busca tanto el código original como el sanitizado
  // porque Firebase puede tener datos guardados con cualquiera de los dos formatos
  const findItemByCode = (items: Record<string, any>, code: string) => {
    // Primero intentar con el código sanitizado (formato actual)
    const sanitized = sanitizeCode(code);
    if (items[sanitized]) return items[sanitized];
    // Luego intentar con el código original
    if (items[code]) return items[code];
    return null;
  };
  
  const branches = AVAILABLE_BRANCHES.map(branchId => {
    const branchData = data?.find(d => d.id === branchId);
    const items = branchData?.items || {};
    
    // Para sucursales con calendario, calcular progreso sobre los items del calendario
    const calendario = getCalendarioSucursal(branchId as Branch);
    
    let totalCompleted = 0;
    let totalItems = 0;
    
    if (calendario) {
      // Usar los items del calendario (260 para T.Mendoza)
      const codigosCalendario = calendario.semanas.flatMap(s => s.items);
      totalItems = codigosCalendario.length;
      const completados = codigosCalendario.filter(code => findItemByCode(items, code)?.completed).length;
      totalCompleted = totalItems > 0 ? (completados / totalItems) * 100 : 0;
    } else {
      // Para sucursales sin calendario, calcular desde los items usando CODES como referencia
      totalItems = SEASON_CODES_TEMPORADA_VERANO.length;
      const completados = SEASON_CODES_TEMPORADA_VERANO.filter(code => findItemByCode(items, code)?.completed).length;
      totalCompleted = totalItems > 0 ? (completados / totalItems) * 100 : 0;
    }
    
    const referenciaCodigos = calendario
      ? calendario.semanas.flatMap(s => s.items)
      : SEASON_CODES_TEMPORADA_VERANO;
    const noStockItems = referenciaCodigos.filter(code => findItemByCode(items, code)?.hasStock === false).length;
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
      noStock: branchData?.noStock || 0,
      noStockPercentage,
      noStockItems,
      addedItemsCount,
      addedItemsPercentage,
      totalItems,
      items: branchData?.items || {},
      lastUpdated: branchData?.lastUpdated || 0
    };
  });

  const sortedBranches = [...branches].sort((a, b) => b.totalCompleted - a.totalCompleted);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="hidden sm:block text-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-1">Articulos sin rotacion y sobre stock</h1>
        <p className="text-sm text-muted-foreground italic">a realizar muestreo paleta completa</p>
      </div>
      
      {selectedView === 'ranking' && (
        <div className="mb-2 sm:mb-4">
          <div className="flex items-center gap-2 mb-0.5 sm:mb-2">
            <LineChart className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
            <h2 className="text-base sm:text-2xl font-bold">Ranking de Sucursales</h2>
          </div>
          <p className="text-[11px] sm:text-sm text-muted-foreground">
            Seleccione su sucursal para ver los articulos solicitados:
          </p>
        </div>
      )}

      {selectedView === 'ranking' ? (
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[36px] sm:w-[80px] text-xs sm:text-sm text-center p-2 sm:p-4">Pos.</TableHead>
                  <TableHead className="min-w-[80px] sm:min-w-[120px] text-xs sm:text-sm p-2 sm:p-4">Sucursal</TableHead>
                  <TableHead className="text-right min-w-[140px] sm:min-w-[120px] text-xs sm:text-sm p-2 sm:p-4">Progreso</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {sortedBranches.map((branch, index) => (
                <TableRow
                  key={`branch-${branch.id}-${branch.lastUpdated || index}`}
                  className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                    index === 0 ? 'bg-yellow-50 dark:bg-yellow-950/10' :
                    index === 1 ? 'bg-gray-50 dark:bg-gray-950/10' :
                    index === 2 ? 'bg-amber-50 dark:bg-amber-950/10' : ''
                  }`}
                  onClick={() => onBranchSelect?.(branch.id)}
                >
                  <TableCell className="text-sm sm:text-sm p-2 sm:p-4 text-center">
                    {index < 3 ? (
                      <Trophy 
                        className={`h-4 w-4 sm:h-5 sm:w-5 mx-auto ${
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-400' :
                          'text-amber-600'
                        }`} 
                      />
                    ) : (
                      <span className="text-sm sm:text-sm font-medium">{index + 1}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm sm:text-sm font-medium p-2 sm:p-4">{branch.id}</TableCell>
                  <TableCell className="text-right p-2 sm:p-4">
                    <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                      <div className="relative w-20 sm:w-24 h-2.5 sm:h-2.5 bg-green-100 dark:bg-green-900/20 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
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
                        className="text-xs sm:text-sm min-w-[32px] sm:min-w-[35px] font-semibold text-green-600"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.1 + 0.5 }}
                      >
                        {Math.round(branch.totalCompleted)}%
                      </motion.span>
                    </div>
                    <div className="flex items-center justify-end gap-1 sm:gap-2 mt-1 sm:mt-1">
                      <span className="text-[9px] sm:text-[10px] text-gray-400 whitespace-nowrap hidden sm:inline">Sin Stock</span>
                      <span className="text-[9px] text-gray-400 whitespace-nowrap sm:hidden">S/S</span>
                      <div className="relative w-16 sm:w-24 h-1.5 sm:h-1.5 bg-orange-100 dark:bg-orange-900/20 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-orange-300 to-orange-500 rounded-full"
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
                        className="text-[10px] sm:text-[10px] min-w-[24px] sm:min-w-[35px] font-medium text-orange-500"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.1 + 0.7 }}
                      >
                        {Math.round(branch.noStockPercentage)}%
                      </motion.span>
                    </div>
                    {branch.addedItemsCount > 0 && (
                      <div className="flex items-center justify-end gap-1 sm:gap-2 mt-1 sm:mt-1">
                        <span className="text-[9px] sm:text-[10px] text-gray-400 whitespace-nowrap hidden sm:inline">Agregados</span>
                        <span className="text-[9px] text-gray-400 whitespace-nowrap sm:hidden">+</span>
                        <div className="relative w-16 sm:w-24 h-1.5 sm:h-1.5 bg-blue-100 dark:bg-blue-900/20 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-blue-300 to-blue-500 rounded-full"
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
                          className="text-[10px] sm:text-[10px] min-w-[24px] sm:min-w-[35px] font-medium text-blue-500"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.1 + 0.8 }}
                        >
                          {Math.round(branch.addedItemsPercentage)}%
                        </motion.span>
                      </div>
                    )}
                    {['T.Mendoza', 'T.Sjuan', 'T.SLuis', 'Crisa2'].includes(branch.id) && (() => {
                      const calendario = getCalendarioSucursal(branch.id);
                      if (!calendario) return null;
                      
                      const codigosCalendario = calendario.semanas.flatMap(s => s.items);
                      const completados = codigosCalendario.filter(code => findItemByCode(branch.items, code)?.completed).length;
                      
                      const mesesMap: { [key: string]: { corto: string, items: number } } = {
                        'DICIEMBRE': { corto: 'Dic', items: 0 },
                        'ENERO': { corto: 'Ene', items: 0 },
                        'FEBRERO': { corto: 'Feb', items: 0 },
                        'MARZO': { corto: 'Mar', items: 0 },
                        'ABRIL': { corto: 'Abr', items: 0 },
                        'MAYO': { corto: 'May', items: 0 }
                      };
                      calendario.semanas.forEach(s => {
                        if (mesesMap[s.mes]) {
                          mesesMap[s.mes].items += s.items.length;
                        }
                      });
                      
                      let acumulado = 0;
                      const objetivos = Object.entries(mesesMap)
                        .filter(([_, v]) => v.items > 0)
                        .map(([mes, v]) => {
                          acumulado += v.items;
                          return { mes: v.corto, obj: v.items, acum: acumulado };
                        });
                      
                      return (
                        <div className="flex gap-0.5 sm:gap-1 mt-1 sm:mt-1 justify-end flex-wrap max-w-full" data-testid="indicadores-meses-ranking">
                          {objetivos.map(({ mes, obj, acum }) => {
                            const acumAnterior = acum - obj;
                            const completadosMes = Math.min(Math.max(completados - acumAnterior, 0), obj);
                            const cumplido = completadosMes >= obj;
                            return (
                              <span 
                                key={mes}
                                className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 sm:py-0.5 rounded whitespace-nowrap leading-tight ${
                                  cumplido 
                                    ? 'bg-green-500 text-white' 
                                    : completadosMes > 0 
                                      ? 'bg-blue-100 text-blue-700' 
                                      : 'bg-gray-100 text-gray-500'
                                }`}
                                title={`${mes}: ${completadosMes}/${obj}`}
                              >
                                {mes} {cumplido ? '✓' : `${completadosMes}/${obj}`}
                              </span>
                            );
                          })}
                        </div>
                      );
                    })()}
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