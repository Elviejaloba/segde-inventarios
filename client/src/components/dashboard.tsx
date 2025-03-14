import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion } from "framer-motion";
import { Trophy, AlertCircle, RefreshCcw } from "lucide-react";
import { AVAILABLE_BRANCHES } from "@/lib/store";
import { Progress } from "@/components/ui/progress";
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
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const retryDelay = 500; // Reducido a 500ms

  const fetchData = async (isRetry = false) => {
    try {
      if (!loading) setLoading(true);
      setError(null);

      const branchesRef = collection(db, "branches");
      const snapshot = await getDocs(branchesRef);

      const branchData = snapshot.docs.map(doc => ({
        id: doc.id,
        totalCompleted: doc.data().totalCompleted || 0,
        noStock: Object.values(doc.data().items || {}).filter((item: any) => !item.hasStock).length,
        items: doc.data().items || {}
      }));

      setData(branchData);
      setRetryCount(0);
      setLoading(false);
    } catch (err) {
      console.error("Error loading data:", err);
      if (retryCount < maxRetries) {
        const nextRetryDelay = retryDelay * Math.pow(1.5, retryCount); // Backoff más suave
        setRetryCount(prev => prev + 1);
        setTimeout(() => fetchData(true), nextRetryDelay);
      } else {
        setError("No se pudieron cargar los datos. Por favor, intente nuevamente.");
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
    return () => {
      setData([]);
      setLoading(false);
      setError(null);
    };
  }, []);

  if (loading && !data.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <LoadingSpinner />
        <p className="text-muted-foreground">Cargando datos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <p className="text-destructive">{error}</p>
          <Button
            variant="outline"
            onClick={() => fetchData(true)}
            className="gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const sortedBranches = AVAILABLE_BRANCHES
    .map(branchId => {
      const branchData = data.find(d => d.id === branchId);
      return {
        id: branchId,
        totalCompleted: branchData?.totalCompleted || 0,
        noStock: branchData?.noStock || 0,
        items: branchData?.items || {}
      };
    })
    .sort((a, b) => b.totalCompleted - a.totalCompleted);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="rounded-md border bg-card"
    >
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
            <motion.tr
              key={branch.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                index === 0 ? 'bg-yellow-50 dark:bg-yellow-950/10' :
                  index === 1 ? 'bg-gray-50 dark:bg-gray-950/10' :
                    index === 2 ? 'bg-amber-50 dark:bg-amber-950/10' : ''
              }`}
              onClick={() => onBranchSelect && onBranchSelect(branch.id)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <TableCell>
                {index < 3 ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                      delay: index * 0.1
                    }}
                  >
                    <Trophy className={`h-5 w-5 ${
                      index === 0 ? 'text-yellow-500' :
                        index === 1 ? 'text-gray-400' :
                          'text-amber-600'
                    }`} />
                  </motion.div>
                ) : (
                  index + 1
                )}
              </TableCell>
              <TableCell>
                {branch.id}
              </TableCell>
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
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </motion.div>
  );
}