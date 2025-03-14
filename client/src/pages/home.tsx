import { useState } from "react";
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
import { doc, setDoc, getDoc } from "firebase/firestore";

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

  const loadBranchData = async (branch: Branch) => {
    setSelectedBranch(branch);
    try {
      const branchRef = doc(db, "branches", branch);
      const branchDoc = await getDoc(branchRef);
      if (branchDoc.exists()) {
        setItems(branchDoc.data().items || {});
      } else {
        setItems({});
      }
    } catch (error) {
      console.error("Error al cargar datos de la sucursal:", error);
      setItems({});
    }
  };

  const handleToggle = async (code: string, field: keyof ItemState) => {
    if (!selectedBranch) return;

    const newItems = {
      ...items,
      [code]: {
        ...(items[code] || { completed: false, hasStock: false }),
        [field]: !items[code]?.[field]
      }
    };

    setItems(newItems);

    const completedCount = Object.values(newItems).filter(i => i.completed).length;

    try {
      const branchRef = doc(db, "branches", selectedBranch);
      await setDoc(branchRef, {
        items: newItems,
        totalCompleted: completedCount,
      }, { merge: true });
    } catch (error) {
      console.error("Error al guardar datos:", error);
    }
  };

  const progress = {
    completed: selectedBranch
      ? (Object.values(items).filter(i => i.completed).length / CODES.length) * 100
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
              <CardHeader>
                <CardTitle>Checklist de {selectedBranch}</CardTitle>
                <CardDescription className="text-muted-foreground mt-2">
                  Marque los items completados y si hay stock disponible
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="sticky top-36 bg-background pt-2 pb-4 z-30">
                  <h3 className="text-sm font-medium mb-2">Progreso</h3>
                  <Progress value={progress.completed} className="h-2" />
                  <div className="text-sm text-muted-foreground mt-2">
                    {progress.completed.toFixed(0)}% completado
                  </div>
                </div>

                <div className="space-y-4">
                  {CODES.map((code, index) => (
                    <motion.div
                      key={code}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="flex items-center gap-4 p-2 rounded hover:bg-accent"
                    >
                      <span className="flex-1 font-mono">{code}</span>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Completado</span>
                          <Checkbox
                            checked={items[code]?.completed || false}
                            onCheckedChange={() => handleToggle(code, 'completed')}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Stock</span>
                          <Checkbox
                            checked={items[code]?.hasStock || false}
                            onCheckedChange={() => handleToggle(code, 'hasStock')}
                          />
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
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <LineChart className="h-6 w-6" />
              Ranking de Sucursales
            </h2>
            <Dashboard onBranchSelect={loadBranchData} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}