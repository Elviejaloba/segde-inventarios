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

// Códigos de ejemplo - esto debería venir de una configuración
const CODES = [
  'A001 - Solicitud de Stock',
  'A002 - Verificación de Inventario',
  'A003 - Control de Calidad',
  'A004 - Registro de Faltantes',
  'A005 - Actualización de Sistema',
  'B001 - Reporte de Ventas',
  'B002 - Control de Precios',
  'B003 - Revisión de Exhibición',
  'B004 - Limpieza de Local',
  'B005 - Cierre de Caja'
];

export default function Home() {
  const [selectedBranch, setSelectedBranch] = useState<Branch>();
  const [items, setItems] = useState<Record<string, { completed: boolean }>>({});

  // Cargar datos cuando se selecciona una sucursal
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

  // Guardar cambios cuando se marca/desmarca un código
  const handleToggle = async (code: string) => {
    if (!selectedBranch) return;

    const newItems = {
      ...items,
      [code]: {
        completed: !items[code]?.completed
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
                  Seleccione las tareas completadas
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
                      <span className="flex-1">{code}</span>
                      <Checkbox
                        checked={items[code]?.completed || false}
                        onCheckedChange={() => handleToggle(code)}
                      />
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