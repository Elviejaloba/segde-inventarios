import { useState, useEffect } from "react";
import { Branch, Code, codeSchema, Role } from "@shared/schema";
import { BranchSelector } from "@/components/branch-selector";
import { Share, ArrowLeft, LineChart, EyeOff } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/firebase";
import { doc, updateDoc, setDoc, getDoc } from "firebase/firestore";

interface HomeProps {
  userRole?: Role;
}

export default function Home({ userRole }: HomeProps) {
  const [selectedBranch, setSelectedBranch] = useState<Branch>();
  const [items, setItems] = useState<Record<Code, { completed: boolean }>>({});
  const { toast } = useToast();

  const progress = {
    completed: selectedBranch
      ? (Object.values(items).filter((i) => i.completed).length / Object.keys(codeSchema.enum).length) * 100
      : 0,
  };

  useEffect(() => {
    if (!selectedBranch) return;

    const loadBranchData = async () => {
      const branchRef = doc(db, "branches", selectedBranch);
      const branchDoc = await getDoc(branchRef);
      if (branchDoc.exists()) {
        setItems(branchDoc.data().items || {});
      }
    };

    loadBranchData();
  }, [selectedBranch]);

  const handleShare = () => {
    if (!selectedBranch) return;

    const message = encodeURIComponent(
      `Seguimiento de pedido para sucursal ${selectedBranch}\n\n` +
      "Esta es una herramienta de seguimiento. La comunicación debe realizarse " +
      "vía mail adjuntando el comprobante de toma de inventario del artículo solicitado."
    );

    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleToggle = async (code: Code) => {
    // Solo permitir edición si el usuario es de tipo "branch"
    if (userRole !== "branch") {
      toast({
        title: "Acceso denegado",
        description: "Solo las sucursales pueden editar los items",
        variant: "destructive",
      });
      return;
    }

    if (!selectedBranch) return;

    const newItems = {
      ...items,
      [code]: {
        completed: !items[code]?.completed
      }
    };

    setItems(newItems);

    const completedCount = Object.values(newItems).filter(i => i.completed).length;
    const totalItems = Object.keys(codeSchema.enum).length;
    const percentage = (completedCount / totalItems) * 100;

    // Actualizar Firestore
    const branchRef = doc(db, "branches", selectedBranch);
    await setDoc(branchRef, {
      items: newItems,
      totalCompleted: completedCount,
    }, { merge: true });

    // Mostrar notificaciones según el progreso
    if (percentage === 25) {
      toast({
        title: "¡Buen comienzo! 🌟",
        description: "Has completado el 25% de tu checklist",
      });
    } else if (percentage === 50) {
      toast({
        title: "¡Excelente progreso! 🎯",
        description: "¡Ya vas por la mitad del camino!",
      });
    } else if (percentage === 75) {
      toast({
        title: "¡Casi allí! 🚀",
        description: "Solo te falta un pequeño esfuerzo más",
      });
    } else if (percentage === 100) {
      toast({
        title: "¡Felicitaciones! 🎉",
        description: "Has completado todos los códigos",
      });
    }
  };

  // Mostrar siempre el dashboard para los dueños
  if (userRole === "owner") {
    return (
      <div className="space-y-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <LineChart className="h-6 w-6" />
          Ranking de Sucursales
        </h2>
        <Dashboard />
      </div>
    );
  }

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
          <BranchSelector value={selectedBranch} onChange={setSelectedBranch} />
        </div>
        {selectedBranch && (
          <div className="flex items-center gap-2">
            <Button onClick={handleShare}>
              <Share className="mr-2 h-4 w-4" />
              Compartir en WhatsApp
            </Button>
          </div>
        )}
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
                  Por favor seleccione los códigos que fueron realizados y comunicados vía mail
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="sticky top-36 bg-background pt-2 pb-4 z-30">
                  <h3 className="text-sm font-medium mb-2">Progreso</h3>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 0.5 }}
                  >
                    <Progress value={progress.completed} className="h-2" />
                  </motion.div>
                  <div className="text-sm text-muted-foreground mt-2">
                    {progress.completed.toFixed(0)}% completado
                  </div>
                </div>

                <div className="space-y-4">
                  {Object.values(codeSchema.enum).map((code, index) => (
                    <motion.div
                      key={code}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="flex items-center gap-4 p-2 rounded hover:bg-accent"
                    >
                      <span className="flex-1 font-mono">{code}</span>
                      {userRole === "branch" ? (
                        <Checkbox
                          checked={items[code]?.completed || false}
                          onCheckedChange={() => handleToggle(code)}
                        />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
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
            <Dashboard />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}