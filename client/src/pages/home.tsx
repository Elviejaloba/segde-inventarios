import { useState, useEffect } from "react";
import { Branch, SEASON_CODES_TEMPORADA_VERANO } from "@/lib/store";
import { BranchSelector } from "@/components/branch-selector";
import { ArrowLeft, LineChart, PartyPopper, Trophy, Star, ArrowUp, Calendar, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dashboard } from "@/components/dashboard";
import { useFirebaseData } from "@/hooks/use-firebase-data";
import { SeasonManager } from "@/components/season-manager";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { LoadingMascot } from "@/components/ui/loading-mascot";
import { storage } from "@/lib/storage";
// @ts-ignore
import confetti from 'canvas-confetti';
import { analytics } from "@/lib/analytics";


// Lista de códigos para temporada de verano
const CODES = SEASON_CODES_TEMPORADA_VERANO;

// Función para sanitizar códigos al guardar
const sanitizeCode = (code: string) => {
  return code.toLowerCase().replace(/[/.#$[\]]/g, '-');
};

// Función para desanitizar códigos al mostrar
const desanitizeCode = (code: string) => {
  return CODES.find(originalCode => sanitizeCode(originalCode) === code) || code;
};

interface ItemState {
  completed: boolean;
  hasStock: boolean;
  lastUpdated?: number;
}

const MOTIVATION_MESSAGES = {
  20: {
    title: "¡Excelente inicio! 🌟",
    description: "¡Sigue así, vas por buen camino!",
    variant: "success" as const
  },
  40: {
    title: "¡Vas muy bien! 💪",
    description: "¡Ya llevas casi la mitad!",
    variant: "success" as const
  },
  60: {
    title: "¡Increíble progreso! 🚀",
    description: "¡Mantén ese ritmo!",
    variant: "success" as const
  },
  80: {
    title: "¡Casi llegas! 🎯",
    description: "¡Te falta muy poco!",
    variant: "success" as const
  },
  100: {
    title: "¡FELICITACIONES! 🎉",
    description: "¡Has completado todos los items!",
    variant: "success" as const
  }
};

const celebrateProgress = (progress: number) => {
  const defaults = {
    spread: 360,
    ticks: 100,
    gravity: 0,
    decay: 0.94,
    startVelocity: 30,
  };

  const particleCount = Math.floor(progress * 2);

  if (progress >= 20) {
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
  const [currentView, setCurrentView] = useState<'checklist' | 'seasons'>('checklist');
  const { toast } = useToast();
  const [lastToastProgress, setLastToastProgress] = useState(0);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const { data: branchesData } = useFirebaseData();

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollButton(window.pageYOffset > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    analytics.logPageView('home');
    const startTime = Date.now();
    
    // Migrar datos al cargar la página si es necesario
    const migrateDataIfNeeded = async () => {
      try {
        // Verificar si los datos necesitan migración (si contienen códigos antiguos)
        if (branchesData && branchesData.length > 0) {
          const firstBranch = branchesData[0];
          const hasOldCodes = firstBranch.items && Object.keys(firstBranch.items).some(key => 
            !SEASON_CODES_TEMPORADA_VERANO.includes(key)
          );
          
          if (hasOldCodes) {
            console.log('Detectados códigos que no son de temporada de verano, ejecutando migración...');
            await storage.migrateToSeasonCodes();
            // Esperar un momento y recargar
            setTimeout(() => window.location.reload(), 1000);
          }
        }
      } catch (error) {
        console.error('Error durante la migración:', error);
      }
    };
    
    migrateDataIfNeeded();
    
    return () => {
      const duration = (Date.now() - startTime) / 1000;
      analytics.logSessionDuration(duration);
    };
  }, [branchesData]);

  const loadBranchData = async (branch: Branch) => {
    if (loading) return;

    setLoading(true);
    setSelectedBranch(branch);

    try {
      const branchData = branchesData?.find(b => b.id === branch);
      const initializedItems = CODES.reduce((acc, code) => {
        const sanitizedCode = sanitizeCode(code);
        const existingItem = branchData?.items?.[sanitizedCode];
        acc[sanitizedCode] = existingItem || { completed: false, hasStock: true };
        return acc;
      }, {} as Record<string, ItemState>);

      setItems(initializedItems);
      analytics.logAction('branch_select', { branch });

      // Restaurar el último progreso guardado
      if (branchData?.totalCompleted) {
        const progress = Math.floor(branchData.totalCompleted);
        setLastToastProgress(progress);
      } else {
        setLastToastProgress(0);
      }
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

    const sanitizedCode = sanitizeCode(code);
    const newItems = {
      ...items,
      [sanitizedCode]: {
        ...(items[sanitizedCode] || { completed: false, hasStock: true }),
        [field]: !items[sanitizedCode]?.[field],
        ...(field === 'completed' ?
          { hasStock: true } :
          field === 'hasStock' ?
            { completed: !items[sanitizedCode]?.hasStock } :
            {}
        )
      }
    };

    setItems(newItems);

    try {
      const completedPercentage = Math.round((Object.values(newItems).filter(i => i.completed).length / CODES.length) * 100);
      const noStockCount = Object.values(newItems).filter(item => item.hasStock === false).length;

      const updatedItems = Object.entries(newItems).reduce((acc, [key, value]) => {
        acc[key] = {
          ...value,
          lastUpdated: Date.now()
        };
        return acc;
      }, {} as Record<string, any>);

      for (const [threshold, message] of Object.entries(MOTIVATION_MESSAGES)) {
        const thresholdNum = parseInt(threshold);
        if (completedPercentage >= thresholdNum && lastToastProgress < thresholdNum) {
          toast({
            title: message.title,
            description: message.description,
            variant: message.variant,
            duration: 8000,
          });
          setLastToastProgress(thresholdNum);
          setTimeout(() => celebrateProgress(thresholdNum), 100);
        }
      }

      await storage.updateBranch(selectedBranch, {
        items: updatedItems,
        totalCompleted: completedPercentage,
        noStock: noStockCount,
      });

      analytics.logAction('item_toggle', {
        branch: selectedBranch,
        code: sanitizedCode,
        field,
        newValue: !items[sanitizedCode]?.[field]
      });
    } catch (error) {
      console.error("Error al guardar:", error);
      setItems(items);
      toast({
        title: "Error al guardar",
        description: "Intente nuevamente",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const progress = {
    completed: selectedBranch
      ? (Object.values(items).filter(i => i.completed).length / CODES.length) * 100
      : 0,
    noStock: selectedBranch
      ? (Object.values(items).filter(i => i.hasStock === false).length / CODES.length) * 100
      : 0
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between sticky top-20 bg-background pt-4 pb-4 z-40">
        <div className="flex flex-wrap items-center gap-4">
          {selectedBranch && currentView === 'checklist' && (
            <Button
              variant="outline"
              onClick={() => {
                setSelectedBranch(undefined);
                setItems({});
                setLastToastProgress(0);
              }}
              className="gap-2 w-full sm:w-auto bg-primary/5 hover:bg-primary/10 border-primary/20 hover:border-primary/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <ArrowLeft className="h-4 w-4 text-primary" />
              Volver al Dashboard
            </Button>
          )}
          
          {currentView === 'checklist' && (
            <BranchSelector
              value={selectedBranch}
              onChange={loadBranchData}
            />
          )}
          
          <div className="flex gap-2">
            <Button
              variant={currentView === 'checklist' ? 'default' : 'outline'}
              onClick={() => setCurrentView('checklist')}
              className="gap-2"
            >
              <LineChart className="h-4 w-4" />
              Checklist
            </Button>
            <Button
              variant={currentView === 'seasons' ? 'default' : 'outline'}
              onClick={() => setCurrentView('seasons')}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              Temporadas
            </Button>
          </div>
        </div>
        <div className="text-sm text-foreground bg-muted/50 p-4 rounded-lg border border-border/50 shadow-sm animate-[fadeIn_1s_ease-in] italic w-full md:w-auto">
          <p className="font-medium text-primary">Esta herramienta funciona como un recordatorio y permite hacer un seguimiento del progreso.</p>
          <p className="mt-1 text-muted-foreground">La comunicación continuará por correo electrónico con el archivo adjunto correspondiente.</p>
        </div>
      </div>

      {currentView === 'seasons' ? (
        <SeasonManager />
      ) : loading ? (
        <div className="flex items-center justify-center p-8">
          <LoadingMascot message="Actualizando datos..." />
        </div>
      ) : selectedBranch ? (
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 flex-wrap">
                <span>Checklist de {selectedBranch}</span>
                {progress.completed === 100 && <Trophy className="h-5 w-5 text-yellow-500" />}
              </CardTitle>
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
                  {progress.noStock > 0 ? (
                    <>
                      <Progress
                        value={progress.noStock}
                        className="h-2 bg-destructive/20"
                      />
                      <div className="text-sm text-muted-foreground mt-2">
                        {Math.round(Object.values(items).filter(i => !i.hasStock).length)} items sin stock
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground mt-2">
                      0 items sin stock
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {CODES.map((code) => (
                  <div
                    key={code}
                    className={`flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 p-2 rounded hover:bg-accent transition-colors ${
                      items[sanitizeCode(code)]?.completed ? 'bg-primary/10' : ''
                    }`}
                  >
                    <span className="flex-1 font-mono">{desanitizeCode(code)}</span>
                    <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Completado</span>
                        <Checkbox
                          checked={items[sanitizeCode(code)]?.completed || false}
                          onCheckedChange={() => handleToggle(code, 'completed')}
                          disabled={loading}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Sin Stock</span>
                        <Checkbox
                          checked={!items[sanitizeCode(code)]?.hasStock}
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
              className="fixed bottom-4 right-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-primary/10 hover:bg-primary/20 border-primary/20 hover:border-primary/30 h-12 w-12 hover:scale-110"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <ArrowUp className="h-6 w-6 text-primary animate-bounce" />
            </Button>
          )}
        </div>
      ) : (
        <Dashboard onBranchSelect={(branch: string) => loadBranchData(branch as Branch)} />
      )}
    </div>
  );
}