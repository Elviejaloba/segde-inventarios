import { useState, useEffect } from "react";
import { Branch } from "@/lib/store";
import { BranchSelector } from "@/components/branch-selector";
import { ArrowLeft, LineChart, PartyPopper, Trophy, Star, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dashboard } from "@/components/dashboard";
import { FirebaseStatus } from "@/components/firebase-status";
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
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { storage } from "@/lib/storage";
import confetti from 'canvas-confetti';

// Lista de códigos
const CODES = [
  '114F', '505', '138P', '118M', '400I', '505X', '506M', '305K',
  '605E', '605T', '510M', '506C', '90/91/92 COLOR', '507M', '98KS00',
  '158S00', '99 COLOR', 'TI125', '98KM', '150P', '30P/30S', '150M/P',
  '451I', '81M', '81SM', '15S/15C', '7095 color', 'Cortinas black out',
  'Cortinas tropical', 'Cover'
];

interface ItemState {
  completed: boolean;
  hasStock: boolean;
}

const MOTIVATION_MESSAGES = {
  20: { title: "¡Excelente inicio! 🌟", description: "¡Sigue así, vas por buen camino!" },
  40: { title: "¡Vas muy bien! 💪", description: "¡Ya llevas casi la mitad!" },
  60: { title: "¡Increíble progreso! 🚀", description: "¡Mantén ese ritmo!" },
  80: { title: "¡Casi llegas! 🎯", description: "¡Te falta muy poco!" },
  100: { title: "¡FELICITACIONES! 🎉", description: "¡Has completado todos los items!" }
};

const celebrateProgress = (progress: number) => {
  const defaults = {
    spread: 360,
    ticks: 100,
    gravity: 0,
    decay: 0.94,
    startVelocity: 30,
  };

  const particleCount = Math.floor(progress * 2); // Más partículas a mayor progreso

  if (progress >= 20) {
    // Celebración básica para 20%
    confetti({
      ...defaults,
      particleCount,
      colors: ['#ffd700', '#ff0000'],
      origin: { x: 0.2, y: 0.8 }
    });
    confetti({
      ...defaults,
      particleCount,
      colors: ['#ffd700', '#ff0000'],
      origin: { x: 0.8, y: 0.8 }
    });
  }

  if (progress >= 40) {
    // Celebración en zigzag para 40%
    confetti({
      ...defaults,
      particleCount,
      angle: 60,
      spread: 80,
      colors: ['#00ff00', '#0000ff'],
      origin: { x: 0, y: 0.8 }
    });
    confetti({
      ...defaults,
      particleCount,
      angle: 120,
      spread: 80,
      colors: ['#00ff00', '#0000ff'],
      origin: { x: 1, y: 0.8 }
    });
  }

  if (progress >= 60) {
    // Lluvia de confetti para 60%
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        ...defaults,
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.5 }
      });
      confetti({
        ...defaults,
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.5 }
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }

  if (progress >= 80) {
    // Explosión circular para 80%
    const circles = 3;
    for (let i = 0; i < circles; i++) {
      setTimeout(() => {
        confetti({
          ...defaults,
          particleCount: 100,
          angle: 360 * i / circles,
          spread: 360 / circles,
          colors: ['#ff00ff', '#00ffff', '#ffff00'],
          origin: { x: 0.5, y: 0.5 }
        });
      }, i * 200);
    }
  }

  if (progress === 100) {
    // Gran final para 100%
    const duration = 5000;
    const end = Date.now() + duration;

    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];

    (function frame() {
      confetti({
        ...defaults,
        particleCount: 6,
        angle: 60,
        spread: 360,
        colors,
        origin: { x: Math.random(), y: Math.random() * 0.8 }
      });
      confetti({
        ...defaults,
        particleCount: 6,
        angle: 120,
        spread: 360,
        colors,
        origin: { x: Math.random(), y: Math.random() * 0.8 }
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  }
};

export default function Home() {
  const [selectedBranch, setSelectedBranch] = useState<Branch>();
  const [items, setItems] = useState<Record<string, ItemState>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [lastToastProgress, setLastToastProgress] = useState(0);
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollButton(window.pageYOffset > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadBranchData = async (branch: Branch) => {
    if (loading) return;

    setLoading(true);
    setSelectedBranch(branch);

    try {
      const branchData = storage.getData().find(b => b.id === branch);
      setItems(branchData?.items || {});
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
        ...(field === 'completed' ?
          { hasStock: true } : // Si marca completado, tiene stock
          field === 'hasStock' ?
            { completed: !items[code]?.hasStock } : // Si cambia stock, invierte completed
            {}
        )
      }
    };

    setItems(newItems);

    try {
      const completedPercentage = Math.round((Object.values(newItems).filter(i => i.completed).length / CODES.length) * 100);

      // Verificar si alcanzamos un nuevo hito
      Object.entries(MOTIVATION_MESSAGES).forEach(([threshold, message]) => {
        const thresholdNum = parseInt(threshold);
        if (completedPercentage >= thresholdNum && lastToastProgress < thresholdNum) {
          toast({
            title: message.title,
            description: message.description,
            duration: 5000,
          });
          setLastToastProgress(thresholdNum);
          celebrateProgress(thresholdNum);
        }
      });

      storage.updateBranch(selectedBranch, {
        items: newItems,
        totalCompleted: completedPercentage,
        noStock: Object.values(newItems).filter(i => !i.hasStock).length
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between sticky top-20 bg-background pt-4 pb-4 z-40">
        <div className="flex flex-wrap items-center gap-4">
          {selectedBranch && (
            <Button
              variant="outline"
              onClick={() => {
                setSelectedBranch(undefined);
                setItems({});
                setLastToastProgress(0);
              }}
              className="gap-2 w-full sm:w-auto"
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
        <div className="text-sm text-muted-foreground max-w-[600px] bg-muted/50 p-4 rounded-lg border border-border/50 shadow-sm animate-[fadeIn_1s_ease-in] italic w-full md:w-auto">
          Esta herramienta sirve como ayuda memoria y seguimiento para ir monitoreando su avance. 
          <span className="block mt-1 text-primary/80">
            La comunicación sigue por mail con su adjunto correspondiente.
          </span>
        </div>
      </div>

      {!selectedBranch && <FirebaseStatus />}

      {loading ? (
        <div className="flex items-center justify-center p-4">
          <LoadingSpinner />
        </div>
      ) : selectedBranch ? (
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 flex-wrap">
                <span>Checklist de {selectedBranch}</span>
                {progress.completed === 100 && <Trophy className="h-5 w-5 text-yellow-500" />}
              </CardTitle>
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
                  <div className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                    {Math.round(progress.completed)}% completado
                    {progress.completed >= 20 && progress.completed < 100 && (
                      <Star className="h-4 w-4 text-yellow-500 animate-pulse" />
                    )}
                    {progress.completed === 100 && (
                      <PartyPopper className="h-4 w-4 text-yellow-500 animate-bounce" />
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">Sin Stock</h3>
                  <Progress
                    value={Math.round((Object.values(items).filter(i => !i.hasStock).length / CODES.length) * 100)}
                    className="h-2 bg-destructive/20"
                  />
                  <div className="text-sm text-muted-foreground mt-2">
                    {Math.round(Object.values(items).filter(i => !i.hasStock).length)} items sin stock
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {CODES.map((code) => (
                  <div
                    key={code}
                    className={`flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 p-2 rounded hover:bg-accent transition-colors ${
                      items[code]?.completed ? 'bg-primary/10' : ''
                    }`}
                  >
                    <span className="flex-1 font-mono">{code}</span>
                    <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
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
          {showScrollButton && (
            <Button
              variant="outline"
              size="icon"
              className="fixed bottom-4 right-4 rounded-full shadow-lg hover:shadow-xl transition-all"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </div>
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