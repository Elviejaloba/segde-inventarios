import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingMascot } from "@/components/ui/loading-mascot";
import { Trophy, AlertCircle, RefreshCw } from "lucide-react";
import { AVAILABLE_BRANCHES } from "@/lib/store";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useFirebaseData } from "@/hooks/use-firebase-data";

interface DashboardProps {
  onBranchSelect?: (branch: string) => void;
}

export function Dashboard({ onBranchSelect }: DashboardProps) {
  const { data, loading, error, refetch } = useFirebaseData();
  const { toast } = useToast();

  const handleRetry = async () => {
    toast({
      title: "Reconectando",
      description: "Intentando recargar los datos...",
    });
    await refetch();
  };

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

  const sortedBranches = [...AVAILABLE_BRANCHES]
    .map(branchId => {
      const branchData = data.find(d => d.id === branchId) || {
        id: branchId,
        totalCompleted: 0,
        noStock: 0,
        items: {}
      };
      return branchData;
    })
    .sort((a, b) => b.totalCompleted - a.totalCompleted);

  return (
    <div className="rounded-md border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[80px] min-w-[60px]">Posición</TableHead>
            <TableHead className="min-w-[120px]">Sucursal</TableHead>
            <TableHead className="text-right min-w-[150px]">Progreso</TableHead>
            <TableHead className="text-right min-w-[150px]">Sin Stock</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedBranches.map((branch, index) => (
            <TableRow
              key={branch.id}
              className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                index === 0 ? 'bg-yellow-50 dark:bg-yellow-950/10' :
                  index === 1 ? 'bg-gray-50 dark:bg-gray-950/10' :
                    index === 2 ? 'bg-amber-50 dark:bg-amber-950/10' : ''
              }`}
              onClick={() => onBranchSelect?.(branch.id)}
            >
              <TableCell>
                {index < 3 ? (
                  <Trophy className={`h-5 w-5 ${
                    index === 0 ? 'text-yellow-500 animate-[bounce_3s_ease-in-out_infinite]' :
                      index === 1 ? 'text-gray-400 animate-[pulse_4s_ease-in-out_infinite]' :
                        'text-amber-600 animate-[pulse_4s_ease-in-out_infinite]'
                  } ${
                    index === 0 ? 'hover:scale-125' :
                      index === 1 ? 'hover:scale-110' :
                        'hover:scale-105'
                  } transition-transform duration-500`} />
                ) : (
                  index + 1
                )}
              </TableCell>
              <TableCell>{branch.id}</TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  <Progress value={branch.totalCompleted} className="w-24 h-2" />
                  <span className="text-sm whitespace-nowrap">{Math.round(branch.totalCompleted)}%</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-sm whitespace-nowrap">{branch.noStock} items</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}