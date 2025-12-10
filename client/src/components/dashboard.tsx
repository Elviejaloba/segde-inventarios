import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingMascot } from "@/components/ui/loading-mascot";
import { Trophy, AlertCircle, RefreshCw, LineChart, FileText } from "lucide-react";
import { AVAILABLE_BRANCHES } from "@/lib/store";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useFirebaseData } from "@/hooks/use-firebase-data";
import { ReportsView } from "@/components/reports-view";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

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

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <LoadingMascot size="sm" message="Cargando datos..." />
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

  const branches = AVAILABLE_BRANCHES.map(branchId => {
    const branchData = data?.find(d => d.id === branchId);
    const items = branchData?.items || {};
    const totalItems = Object.keys(items).length;
    const noStockItems = Object.values(items).filter(item => !item.hasStock).length;
    const noStockPercentage = totalItems > 0 ? (noStockItems / totalItems) * 100 : 0;
    
    return {
      id: branchId,
      totalCompleted: branchData?.totalCompleted || 0,
      noStock: branchData?.noStock || 0,
      noStockPercentage,
      noStockItems,
      totalItems,
      items: branchData?.items || {},
      lastUpdated: branchData?.lastUpdated || 0
    };
  });

  const sortedBranches = [...branches].sort((a, b) => b.totalCompleted - a.totalCompleted);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        {selectedView === 'ranking' && (
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <LineChart className="h-6 w-6" />
              Ranking de Sucursales
            </h2>
            <p className="text-muted-foreground">
              Seleccione su sucursal para ver los articulos solicitados:
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-4 w-full sm:w-auto">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full sm:w-auto"
          >
            <Button
              variant={selectedView === 'ranking' ? "default" : "outline"}
              onClick={() => setSelectedView('ranking')}
              className="gap-2 w-full sm:w-auto"
            >
              <Trophy className="h-4 w-4" />
              Ranking
            </Button>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative w-full sm:w-auto"
          >
            <Button
              variant={selectedView === 'reporte' ? "default" : "ghost"}
              onClick={() => setSelectedView('reporte')}
              className={`gap-2 relative bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 shadow-lg w-full sm:w-auto ${
                selectedView === 'reporte' ? 'ring-2 ring-purple-300 ring-offset-2' : ''
              }`}
            >
              <FileText className="h-4 w-4" />
              Reportes
              <motion.div
                className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.8, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </Button>
          </motion.div>
        </div>
      </div>

      {selectedView === 'ranking' ? (
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[60px] sm:w-[80px] text-xs sm:text-sm text-center">Pos.</TableHead>
                  <TableHead className="min-w-[120px] text-xs sm:text-sm">Sucursal</TableHead>
                  <TableHead className="text-center min-w-[120px] text-xs sm:text-sm">Progreso</TableHead>
                  <TableHead className="text-center min-w-[130px] text-xs sm:text-sm">Art. Sin Stock</TableHead>
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
                  <TableCell className="text-xs sm:text-sm">
                    {index < 3 ? (
                      <Trophy 
                        className={`h-4 w-4 sm:h-5 sm:w-5 ${
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-400' :
                          'text-amber-600'
                        }`} 
                      />
                    ) : (
                      <span className="text-xs sm:text-sm">{index + 1}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm font-medium">{branch.id}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="relative w-20 sm:w-24 h-2 bg-green-100 dark:bg-green-900/20 rounded-full overflow-hidden">
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
                        className="text-xs sm:text-sm min-w-[35px] font-medium text-green-600"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.1 + 0.5 }}
                      >
                        {Math.round(branch.totalCompleted)}%
                      </motion.span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="relative w-20 sm:w-24 h-2 bg-red-100 dark:bg-red-900/20 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full"
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
                        className="text-xs sm:text-sm min-w-[35px] text-red-600 font-medium"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.1 + 0.7 }}
                      >
                        {Math.round(branch.noStockPercentage)}%
                      </motion.span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {branch.noStockItems}/{branch.totalItems} arts
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