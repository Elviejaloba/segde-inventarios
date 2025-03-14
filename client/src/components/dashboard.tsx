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
import { Trophy, AlertCircle } from "lucide-react";
import { AVAILABLE_BRANCHES } from "@/lib/store";

export function Dashboard() {
  const [data, setData] = useState<Array<{id: string, totalCompleted: number}>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const branchesRef = collection(db, "branches");
        const snapshot = await getDocs(branchesRef);

        if (!mounted) return;

        const branchData = snapshot.docs.map(doc => ({
          id: doc.id,
          totalCompleted: doc.data().totalCompleted || 0
        }));

        setData(branchData);
      } catch (err) {
        console.error("Error loading data:", err);
        if (mounted) {
          setError("No se pudieron cargar los datos. Por favor, actualiza la página.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <LoadingSpinner size="lg" />
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
        </div>
      </div>
    );
  }

  const sortedBranches = AVAILABLE_BRANCHES
    .map(branchId => {
      const branchData = data.find(d => d.id === branchId);
      return {
        id: branchId,
        totalCompleted: branchData?.totalCompleted || 0
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
            <TableHead className="text-right">Completados</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedBranches.map((branch, index) => (
            <TableRow key={branch.id}>
              <TableCell>
                {index < 3 ? (
                  <Trophy className={`h-4 w-4 ${
                    index === 0 ? 'text-yellow-500' :
                    index === 1 ? 'text-gray-400' :
                    'text-amber-600'
                  }`} />
                ) : (
                  index + 1
                )}
              </TableCell>
              <TableCell>
                {branch.id}
              </TableCell>
              <TableCell className="text-right">
                {branch.totalCompleted}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </motion.div>
  );
}