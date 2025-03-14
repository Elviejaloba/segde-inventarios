import { useState, useEffect } from "react";
import { Branch } from "@/lib/store";
import { BranchSelector } from "@/components/branch-selector";
import { Share, ArrowLeft, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dashboard } from "@/components/dashboard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, enableNetwork, disableNetwork } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

// Lista actualizada de códigos solicitados
const CODES = [
  '114F',
  '505',
  '138P',
  '118M',
  '400I',
  '505X',
  '506M',
  '305K',
  '605E',
  '605T',
  '510M',
  '506C',
  '90/91/92 COLOR',
  '507M',
  '98KS00',
  '158S00',
  '99 COLOR',
  'TI125',
  '98KM',
  '150P',
  '30P/30S',
  '150M/P',
  '451I',
  '81M',
  '81SM',
  '15S/15C',
  '7095 color',
  'Cortinas black out',
  'Cortinas tropical',
  'Cover'
];

interface ItemState {
  completed: boolean;
  hasStock: boolean;
}

export default function Home() {
  const [selectedBranch, setSelectedBranch] = useState<Branch>();
  const [items, setItems] = useState<Record<string, ItemState>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();
  const maxRetries = 3;
  const retryDelay = 1000; // 1 segundo base para backoff exponencial

  const loadBranchData = async (branch: Branch, isRetry = false) => {
    setSelectedBranch(branch);
    setLoading(true);
    setError(null);

    try {
      if (isRetry) {
        // En caso de reintento, reiniciar la conexión
        await disableNetwork(db);
        await enableNetwork(db);
      }

      const branchRef = doc(db, "branches", branch);
      const branchDoc = await getDoc(branchRef);

      if (branchDoc.exists()) {
        setItems(branchDoc.data().items || {});
        setRetryCount(0); // Reset retry count on success
      } else {
        setItems({});
      }
    } catch (error) {
      console.error("Error al cargar datos de la sucursal:", error);

      if (retryCount < maxRetries) {
        // Implementar backoff exponencial
        const nextRetryDelay = retryDelay * Math.pow(2, retryCount);
        setRetryCount(prev => prev + 1);
        setTimeout(() => loadBranchData(branch, true), nextRetryDelay);
      } else {
        setError("Error al cargar los datos. Por favor, intente nuevamente.");
        toast({
          title: "Error de conexión",
          description: "No se pudieron cargar los datos. Reintentando...",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (code: string, field: keyof ItemState) => {
    if (!selectedBranch) return;

    const newItems = {
      ...items,
      [code]: {
        ...(items[code] || { completed: false, hasStock: true }),
        [field]: !items[code]?.[field],
        // Si se marca como completado, asegurarse de que tenga stock
        // Si se marca sin stock, asegurarse de que no esté completado
        ...(field === 'completed' ? { hasStock: true } :
          field === 'hasStock' ? { completed: false } : {}),
      }
    };

    setItems(newItems);

    const completedCount = Object.values(newItems).filter(i => i.completed).length;
    const noStockCount = Object.values(newItems).filter(i => !i.hasStock).length;
    const completedPercentage = (completedCount / CODES.length) * 100;

    try {
      const branchRef = doc(db, "branches", selectedBranch);
      await setDoc(branchRef, {
        items: newItems,
        totalCompleted: completedPercentage,
        noStock: noStockCount,
      }, { merge: true });

      // Notificaciones de progreso para items completados
      if (field === 'completed' && newItems[code].completed) {
        if (completedPercentage === 25) {
          toast({
            title: "¡Buen comienzo! 🌟",
            description: "Has completado el 25% de los items",
          });
        } else if (completedPercentage === 50) {
          toast({
            title: "¡Medio camino recorrido! 🎯",
            description: "Has completado el 50% de los items",
          });
        } else if (completedPercentage === 75) {
          toast({
            title: "¡Excelente progreso! 🚀",
            description: "Solo te falta el último tramo",
          });
        } else if (completedPercentage === 100) {
          toast({
            title: "¡Felicitaciones! 🎉",
            description: "Has completado todos los items",
            variant: "success",
          });
        }
      }

      // Notificaciones para items sin stock
      if (field === 'hasStock' && !newItems[code].hasStock) {
        toast({
          title: "Item sin stock registrado",
          description: `${noStockCount} items marcados sin stock`,
          variant: "warning",
        });
      }
    } catch (error) {
      console.error("Error al guardar datos:", error);
      toast({
        title: "Error al guardar",
        description: "No se pudieron guardar los cambios. Intente nuevamente.",
        variant: "destructive",
      });

      // Revertir cambios locales en caso de error
      setItems(items);
    }
  };

  const progress = {
    completed: selectedBranch
      ? (Object.values(items).filter(i => i.completed).length / CODES.length) * 100
      : 0,
    noStock: selectedBranch
      ? (Object.values(items).filter(i => !i.hasStock).length / CODES.length) * 100
      : 0,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between sticky top-20 bg-background pt-4 pb-4 z-40">
        <div className="flex items-center gap-4">
          {selectedBranch && (
            <Button
              variant="outline"
              onClick={() => setSelectedBranch(undefined)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Ver Ranking
            </Button>
          )}
          <BranchSelector
            value={selectedBranch}
            onChange={loadBranchData}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedBranch ? (
          <motion.div
            key="checklist"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Checklist de {selectedBranch}</CardTitle>
                  <CardDescription className="text-muted-foreground mt-2">
                    Marque los items completados y los que no tienen stock disponible
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="sticky top-36 bg-background pt-2 pb-4 z-30 space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Progreso Completados</h3>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.completed}%` }}
                      transition={{ duration: 0.5 }}
                    >
                      <Progress
                        value={progress.completed}
                        className="h-2"
                        // Cambia el color basado en el progreso
                        style={{
                          background: progress.completed === 100 ? 'var(--success)' :
                            progress.completed >= 75 ? 'var(--primary)' :
                              progress.completed >= 50 ? 'var(--warning)' :
                                'var(--muted)'
                        }}
                      />
                    </motion.div>
                    <div className="text-sm text-muted-foreground mt-2">
                      {Math.round(progress.completed)}% completado
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-2">Sin Stock</h3>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.noStock}%` }}
                      transition={{ duration: 0.5 }}
                    >
                      <Progress
                        value={progress.noStock}
                        className="h-2"
                        // Color rojo para items sin stock
                        style={{
                          background: 'var(--destructive)'
                        }}
                      />
                    </motion.div>
                    <div className="text-sm text-muted-foreground mt-2">
                      {Math.round(progress.noStock)}% sin stock
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {CODES.map((code, index) => (
                    <motion.div
                      key={code}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className={`flex items-center gap-4 p-2 rounded hover:bg-accent transition-colors ${
                        items[code]?.completed ? 'bg-primary/10' : ''
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="flex-1 font-mono">{code}</span>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Completado</span>
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Checkbox
                              checked={items[code]?.completed || false}
                              onCheckedChange={() => handleToggle(code, 'completed')}
                            />
                          </motion.div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Sin Stock</span>
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Checkbox
                              checked={!items[code]?.hasStock}
                              onCheckedChange={() => handleToggle(code, 'hasStock')}
                            />
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <LineChart className="h-6 w-6" />
              Ranking de Sucursales por Inventarios Completados
            </h2>
            <p className="text-muted-foreground mb-6">
              Para visualizar los códigos solicitados, toque cada sucursal para ver su detalle
            </p>
            <Dashboard onBranchSelect={loadBranchData} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}