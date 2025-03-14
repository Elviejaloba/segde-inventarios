import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
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
import { Trophy } from "lucide-react";
import { Branch, AVAILABLE_BRANCHES } from "@/lib/store";

export function Dashboard() {
  const [branchesData, setBranchesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBranchesData = async () => {
      try {
        setLoading(true);
        setError(null);

        const branchesRef = collection(db, "branches");
        const snapshot = await getDocs(branchesRef);

        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setBranchesData(data);
      } catch (err) {
        console.error('Error loading branches data:', err);
        setError('Error cargando datos. Por favor, intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    loadBranchesData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  const totalCodes = 10; // Valor fijo para ejemplo
  const sortedBranches = AVAILABLE_BRANCHES
    .map(branch => {
      const branchDoc = branchesData.find(d => d.id === branch);
      return {
        branch,
        data: {
          totalCompleted: branchDoc?.totalCompleted || 0,
        }
      };
    })
    .sort((a, b) => b.data.totalCompleted - a.data.totalCompleted);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-md border bg-card"
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[40px]">Pos</TableHead>
            <TableHead className="w-[180px]">Sucursal</TableHead>
            <TableHead className="text-right">Códigos Completados</TableHead>
            <TableHead className="text-right">Progreso</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedBranches.map(({ branch, data }, index) => (
            <motion.tr
              key={branch}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`border-b transition-colors hover:bg-muted/50 ${
                index === 0 ? 'bg-primary/5' : ''
              }`}
            >
              <TableCell className="font-medium">
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
              <TableCell className="font-medium">
                Sucursal {branch.substring(3)}
              </TableCell>
              <TableCell className="text-right">
                {data.totalCompleted} de {totalCodes}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="h-2 w-24 rounded-full bg-muted">
                    <motion.div
                      className={`h-full rounded-full transition-all ${
                        data.totalCompleted === totalCodes ? 'bg-green-500' :
                        data.totalCompleted > totalCodes / 2 ? 'bg-primary' :
                        'bg-orange-500'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${(data.totalCompleted / totalCodes) * 100}%` 
                      }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {((data.totalCompleted / totalCodes) * 100).toFixed(0)}%
                  </span>
                </div>
              </TableCell>
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </motion.div>
  );
}