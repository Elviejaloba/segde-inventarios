import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingMascot } from "@/components/ui/loading-mascot";
import { Trophy, AlertCircle, RefreshCw } from "lucide-react";
import { AVAILABLE_BRANCHES } from "@/lib/store";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useFirebaseData } from "@/hooks/use-firebase-data";
import { ReportsView } from "@/components/reports-view";
import { useState, useEffect } from "react";

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
    return {
      id: branchId,
      totalCompleted: branchData?.totalCompleted || 0,
      noStock: branchData?.noStock || 0,
      items: branchData?.items || {},
      lastUpdated: branchData?.lastUpdated || 0
    };
  });

  const sortedBranches = [...branches].sort((a, b) => b.totalCompleted - a.totalCompleted);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <Button
            variant={selectedView === 'ranking' ? "default" : "outline"}
            onClick={() => setSelectedView('ranking')}
          >
            Ranking de Sucursales
          </Button>
          <Button
            variant={selectedView === 'reporte' ? "default" : "outline"}
            onClick={() => setSelectedView('reporte')}
          >
            Reportes
          </Button>
        </div>
      </div>

      {selectedView === 'ranking' && (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[80px]">Posición</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead className="text-right">Progreso</TableHead>
                <TableHead className="text-right">Sin Stock</TableHead>
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
                  <TableCell>
                    {index < 3 ? (
                      <Trophy 
                        className={`h-5 w-5 ${
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-400' :
                          'text-amber-600'
                        }`} 
                      />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </TableCell>
                  <TableCell>{branch.id}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Progress value={branch.totalCompleted} className="w-24 h-2" />
                      <span className="text-sm">{Math.round(branch.totalCompleted)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm">{branch.noStock} items</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedView === 'reporte' && <ReportsView />}
    </div>
  );
}