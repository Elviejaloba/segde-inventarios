import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, checkFirebaseConnection } from "@/lib/firebase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Trophy } from "lucide-react";
import { AVAILABLE_BRANCHES } from "@/lib/store";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { FirebaseStatus } from '@/components/firebase-status';

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
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const isConnected = await checkFirebaseConnection();
      if (!isConnected) {
        throw new Error("No se pudo establecer conexión con Firebase");
      }

      const branchesRef = collection(db, "branches");
      const snapshot = await getDocs(branchesRef);

      const branchData = snapshot.docs
        .filter(doc => AVAILABLE_BRANCHES.includes(doc.id))
        .map(doc => ({
          id: doc.id,
          totalCompleted: doc.data().totalCompleted || 0,
          noStock: Object.values(doc.data().items || {}).filter((item: any) => !item.hasStock).length,
          items: doc.data().items || {}
        }));

      setData(branchData);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("No se pudieron cargar los datos. Por favor, intente nuevamente.");
      toast({
        title: "Error de conexión",
        description: "No se pudo establecer conexión con el servidor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const sortedBranches = AVAILABLE_BRANCHES
    .map(branchId => {
      const branchData = data.find(d => d.id === branchId) || {
        totalCompleted: 0,
        noStock: 0,
        items: {}
      };
      return {
        id: branchId,
        ...branchData
      };
    })
    .sort((a, b) => b.totalCompleted - a.totalCompleted);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center text-destructive">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FirebaseStatus />
      <div className="rounded-md border bg-card">
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
    </div>
  );
}