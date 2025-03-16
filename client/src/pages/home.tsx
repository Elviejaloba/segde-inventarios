import { useState } from "react";
import { Branch } from "@/lib/store";
import { BranchSelector } from "@/components/branch-selector";
import { ArrowLeft, LineChart } from "lucide-react";
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
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Lista de códigos
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

const retryOperation = async <T>(operation: () => Promise<T>, maxRetries = 3, retryDelay = 1000): Promise<T> => {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      console.error(`Retry attempt ${retries + 1} failed:`, error);
      retries++;
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * retries));
      } else {
        throw error; // Re-throw error after max retries
      }
    }
  }
};


export default function Home() {
  const [selectedBranch, setSelectedBranch] = useState<Branch>();
  const [items, setItems] = useState<Record<string, ItemState>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadBranchData = async (branch: Branch) => {
    if (loading) return;

    setLoading(true);
    setSelectedBranch(branch);
    setItems({});

    try {
      const branchData = await retryOperation(async () => {
        const branchRef = doc(db, "branches", branch);
        const branchDoc = await getDoc(branchRef);

        if (branchDoc.exists()) {
          return branchDoc.data();
        } else {
          const initialData = { items: {}, totalCompleted: 0, noStock: 0 };
          await setDoc(branchRef, initialData);
          return initialData;
        }
      });

      setItems(branchData.items || {});
    } catch (error) {
      console.error("Error al cargar datos:", error);
      toast({
        title: "Error de conexión",
        description: "No se pudieron cargar los datos. Intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (code: string, field: keyof ItemState) => {
    if (!selectedBranch || loading) return;

    const newItems = {
      ...items,
      [code]: {
        ...(items[code] || { completed: false, hasStock: true }),
        [field]: !items[code]?.[field],
        ...(field === 'completed' ? { hasStock: true } :
          field === 'hasStock' ? { completed: false } : {})
      }
    };

    setItems(newItems);

    try {
      await retryOperation(async () => {
        const branchRef = doc(db, "branches", selectedBranch);
        await setDoc(branchRef, {
          items: newItems,
          totalCompleted: Math.round((Object.values(newItems).filter(i => i.completed).length / CODES.length) * 100),
          noStock: Object.values(newItems).filter(i => !i.hasStock).length
        });
      });
    } catch (error) {
      console.error("Error al guardar:", error);
      setItems(items); // Revertir cambios en caso de error
      toast({
        title: "Error al guardar",
        description: "Intente nuevamente",
        variant: "destructive",
      });
    }
  };

  const progress = {
    completed: selectedBranch
      ? (Object.values(items).filter(i => i.completed).length / CODES.length) * 100
      : 0,
    noStock: selectedBranch
      ? (Object.values(items).filter(i => !i.hasStock).length / CODES.length) * 100
      : 0
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between sticky top-20 bg-background pt-4 pb-4 z-40">
        <div className="flex items-center gap-4">
          {selectedBranch && (
            <Button
              variant="outline"
              onClick={() => {
                setSelectedBranch(undefined);
                setItems({});
              }}
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

      {loading ? (
        <div className="flex items-center justify-center p-4">
          <LoadingSpinner />
        </div>
      ) : selectedBranch ? (
        <Card>
          <CardHeader>
            <CardTitle>Checklist de {selectedBranch}</CardTitle>
            <CardDescription>
              Marque los items completados y los que no tienen stock disponible
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Progreso</h3>
                <Progress
                  value={progress.completed}
                  className="h-2"
                  style={{
                    background: progress.completed === 100 ? 'var(--success)' :
                      progress.completed >= 75 ? 'var(--primary)' :
                        progress.completed >= 50 ? 'var(--warning)' :
                          'var(--muted)'
                  }}
                />
                <div className="text-sm text-muted-foreground mt-2">
                  {Math.round(progress.completed)}% completado
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Sin Stock</h3>
                <Progress
                  value={progress.noStock}
                  className="h-2 bg-destructive/20"
                />
                <div className="text-sm text-muted-foreground mt-2">
                  {Math.round(progress.noStock)}% sin stock
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {CODES.map((code) => (
                <div
                  key={code}
                  className={`flex items-center gap-4 p-2 rounded hover:bg-accent transition-colors ${
                    items[code]?.completed ? 'bg-primary/10' : ''
                  }`}
                >
                  <span className="flex-1 font-mono">{code}</span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Completado</span>
                      <Checkbox
                        checked={items[code]?.completed || false}
                        onCheckedChange={() => handleToggle(code, 'completed')}
                        disabled={loading}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Sin Stock</span>
                      <Checkbox
                        checked={!items[code]?.hasStock}
                        onCheckedChange={() => handleToggle(code, 'hasStock')}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div>
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <LineChart className="h-6 w-6" />
            Ranking de Sucursales
          </h2>
          <p className="text-muted-foreground mb-6">
            Seleccione una sucursal para ver su detalle
          </p>
          <Dashboard onBranchSelect={loadBranchData} />
        </div>
      )}
    </div>
  );
}