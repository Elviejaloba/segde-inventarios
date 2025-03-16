import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, retryOperation } from "@/lib/firebase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Trophy, AlertCircle, Wifi, WifiOff } from "lucide-react";
import { AVAILABLE_BRANCHES } from "@/lib/store";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface DashboardProps {
  onBranchSelect?: (branch: string) => void;
}

export function Dashboard({ onBranchSelect }: DashboardProps) {
  const [data, setData] = useState<Array<{
    id: string,
    totalCompleted: number,
    noStock: number,
    items: Record<string, { completed: boolean, hasStock: boolean }>
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const branchData = await retryOperation(async () => {
        const branchesRef = collection(db, "branches");
        const snapshot = await getDocs(branchesRef);
        return snapshot.docs
          .filter(doc => AVAILABLE_BRANCHES.includes(doc.id))
          .map(doc => ({
            id: doc.id,
            totalCompleted: doc.data().totalCompleted || 0,
            noStock: doc.data().noStock || 0,
            items: doc.data().items || {}
          }));
      });

      setData(branchData);
    } catch (err) {
      console.error("Error al cargar datos:", err);
      const message = isOffline ? 
        "Trabajando en modo offline. Los datos pueden no estar actualizados." :
        "Error de conexión. Por favor, intente nuevamente.";

      setError(message);
      toast({
        title: isOffline ? "Modo Offline" : "Error de conexión",
        description: message,
        variant: isOffline ? "warning" : "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-4 space-y-4">
        {isOffline ? <WifiOff className="h-8 w-8 text-warning" /> : <AlertCircle className="h-8 w-8 text-destructive" />}
        <p className={`text-center ${isOffline ? 'text-warning' : 'text-destructive'}`}>{error}</p>
        <Button onClick={fetchData} variant="outline" className="gap-2">
          {isOffline ? <Wifi className="h-4 w-4" /> : null}
          Reintentar
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
    <div className="rounded-md border bg-card">
      {isOffline && (
        <div className="p-2 bg-warning/10 text-warning flex items-center gap-2 text-sm">
          <WifiOff className="h-4 w-4" />
          Modo offline - Los datos pueden no estar actualizados
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[100px]">Posición</TableHead>
            <TableHead>Sucursal</TableHead>
            <TableHead className="text-right">Progreso</TableHead>
            <TableHead className="text-right">Sin Stock</TableHead>
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
                    index === 0 ? 'text-yellow-500' :
                      index === 1 ? 'text-gray-400' :
                        'text-amber-600'
                  }`} />
                ) : (
                  index + 1
                )}
              </TableCell>
              <TableCell>{branch.id}</TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  <Progress value={branch.totalCompleted} className="w-24 h-2" />
                  <span className="text-sm">{Math.round(branch.totalCompleted)}%</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  <Progress value={(branch.noStock / 30) * 100} className="w-24 h-2" />
                  <span className="text-sm">{branch.noStock} items</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}