import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Branch, SEASON_CODES_TEMPORADA_VERANO } from "@/lib/store";
import { BranchSelector } from "@/components/branch-selector";
import { ArrowLeft, PartyPopper, Trophy, Star, ArrowUp, Calendar, ChevronDown, ChevronRight, CheckCircle2, Search, X, Clock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dashboard } from "@/components/dashboard";
import { useFirebaseData } from "@/hooks/use-firebase-data";
import { getCalendarioSucursal, getSemanaActual, type SemanaCalendario } from "@/lib/calendario-semanal";

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
  const [expandedSemanas, setExpandedSemanas] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');
  const [celebratedMonths, setCelebratedMonths] = useState<Set<string>>(new Set());
  const [addedItems, setAddedItems] = useState<Record<string, { code: string; addedAt: number; month?: string }>>({});
  const [newItemCode, setNewItemCode] = useState('');

  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const currentMonthAddedItems = useMemo(() => {
    return Object.fromEntries(
      Object.entries(addedItems).filter(([_, item]) => {
        if (!item.month) {
          const d = new Date(item.addedAt);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === currentMonth;
        }
        return item.month === currentMonth;
      })
    );
  }, [addedItems, currentMonth]);

  const { toast } = useToast();
  const [lastToastProgress, setLastToastProgress] = useState(0);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const { data: branchesData } = useFirebaseData();

  const { data: ultimaActualizacion } = useQuery<{ costos_fecha: string; ventas_fecha: string }>({
    queryKey: ['/api/ultima-actualizacion'],
    queryFn: async () => {
      const response = await fetch('/api/ultima-actualizacion');
      if (!response.ok) throw new Error('Error');
      return response.json();
    },
    refetchInterval: 300000,
  });

  useEffect(() => {
    if (!selectedBranch || !branchesData) return;
    const branchData = branchesData.find(b => b.id === selectedBranch);
    if (branchData?.addedItems) {
      setAddedItems(branchData.addedItems);
    }
  }, [branchesData, selectedBranch]);

  useEffect(() => {
    if (!selectedBranch || !branchesData || loading) return;
    
    const branchData = branchesData.find(b => b.id === selectedBranch);
    if (!branchData?.items) return;
    
    // Solo actualizar si hay diferencias para evitar loops innecesarios
    // IMPORTANTE: Buscar PRIMERO el código sanitizado, luego el original
    // Esto debe coincidir con loadBranchData y Dashboard
    
    // Usar los códigos del calendario si existe, de lo contrario CODES
    const calendario = getCalendarioSucursal(selectedBranch);
    const codesToUse = calendario 
      ? calendario.semanas.flatMap(s => s.items) 
      : CODES;
    
    const newItems = codesToUse.reduce((acc, code) => {
      const sanitizedCode = sanitizeCode(code);
      const existingItem = branchData.items[sanitizedCode] || branchData.items[code];
      if (existingItem) {
        acc[sanitizedCode] = existingItem;
      } else {
        acc[sanitizedCode] = { completed: false, hasStock: true };
      }
      return acc;
    }, {} as Record<string, ItemState>);
    
    // Comparar si hay cambios reales antes de actualizar
    const hasChanges = Object.keys(newItems).some(key => {
      const current = items[key];
      const updated = newItems[key];
      return !current || current.completed !== updated.completed || current.hasStock !== updated.hasStock;
    });
    
    if (hasChanges && Object.keys(items).length > 0) {
      
      setItems(newItems);
    }
  }, [branchesData, selectedBranch]);

  // Obtener calendario semanal si existe para la sucursal
  const calendarioSemanal = selectedBranch ? getCalendarioSucursal(selectedBranch) : null;
  const semanaActual = getSemanaActual();

  // Calcular progreso por semana
  const progresoSemanal = useMemo(() => {
    if (!calendarioSemanal || Object.keys(items).length === 0) return [];
    
    return calendarioSemanal.semanas.map(semana => {
      const completados = semana.items.filter(code => items[sanitizeCode(code)]?.completed).length;
      const total = semana.items.length;
      const porcentaje = total > 0 ? (completados / total) * 100 : 0;
      const esActual = semanaActual?.mes === semana.mes && semanaActual?.semana === semana.semana;
      
      return {
        ...semana,
        completados,
        total,
        porcentaje,
        esActual
      };
    });
  }, [calendarioSemanal, items, semanaActual]);

  // Toggle expandir/colapsar semana
  const toggleSemana = (key: string) => {
    setExpandedSemanas(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Calcular progreso por mes para detectar objetivos cumplidos
  const progresoMensual = useMemo(() => {
    if (!calendarioSemanal) return [];
    
    const todosLosCodigos = calendarioSemanal.semanas.flatMap(s => s.items);
    const totalCompletados = todosLosCodigos.filter(code => items[sanitizeCode(code)]?.completed).length;
    
    // Calcular objetivos dinámicamente desde el calendario
    const mesesMap: { [key: string]: number } = {};
    calendarioSemanal.semanas.forEach(s => {
      mesesMap[s.mes] = (mesesMap[s.mes] || 0) + s.items.length;
    });
    
    let acumuladoCalc = 0;
    const objetivosMensuales = Object.entries(mesesMap).map(([mes, objetivo]) => {
      acumuladoCalc += objetivo;
      return { mes, objetivo, acumulado: acumuladoCalc };
    });
    
    return objetivosMensuales.map(({ mes, objetivo, acumulado }) => {
      const acumuladoAnterior = acumulado - objetivo;
      const completadosParaEsteMes = Math.min(Math.max(totalCompletados - acumuladoAnterior, 0), objetivo);
      return { mes, objetivo, completados: completadosParaEsteMes, cumplido: completadosParaEsteMes >= objetivo };
    });
  }, [calendarioSemanal, items]);

  // Detectar cuando se cumple un objetivo mensual y celebrar
  useEffect(() => {
    if (!progresoMensual.length) return;
    
    progresoMensual.forEach(({ mes, cumplido }) => {
      if (cumplido && !celebratedMonths.has(mes)) {
        // Marcar como celebrado
        setCelebratedMonths(prev => new Set(Array.from(prev).concat(mes)));
        
        // Mostrar confetti
        celebrateProgress(100);
        
        // Mostrar toast de felicitación
        toast({
          title: `🎉 ¡Objetivo ${mes} Cumplido!`,
          description: `¡Excelente trabajo! Has completado todos los items del mes de ${mes}.`,
          duration: 5000,
        });
      }
    });
  }, [progresoMensual, celebratedMonths, toast]);

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
    
    return () => {
      const duration = (Date.now() - startTime) / 1000;
      analytics.logSessionDuration(duration);
    };
  }, []);

  const loadBranchData = async (branch: Branch) => {
    if (loading) return;

    setLoading(true);
    setSelectedBranch(branch);

    try {
      const branchData = branchesData?.find(b => b.id === branch);
      
      
      // Verificar qué códigos hay en los datos de la sucursal
      // Si la sucursal tiene calendario, usar los códigos del calendario
      // Si no, usar CODES de store.ts
      const calendario = getCalendarioSucursal(branch);
      const codesToUse = calendario 
        ? calendario.semanas.flatMap(s => s.items) 
        : CODES;
      
      const initializedItems = codesToUse.reduce((acc, code) => {
        const sanitizedCode = sanitizeCode(code);
        const fromSanitized = branchData?.items?.[sanitizedCode];
        const fromOriginal = branchData?.items?.[code];
        const existingItem = fromSanitized || fromOriginal;
        
        if (existingItem) {
          acc[sanitizedCode] = existingItem;
        } else {
          acc[sanitizedCode] = { completed: false, hasStock: true };
        }
        return acc;
      }, {} as Record<string, ItemState>);
      setItems(initializedItems);
      setAddedItems(branchData?.addedItems || {});
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
    const originalCode = code; // Mantener el código original para Firebase
    
    // Actualizar estado local con código sanitizado
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

      // Crear objeto para Firebase usando códigos SANITIZADOS (lowercase)
      // Esto asegura consistencia con la lógica del Dashboard
      const firebaseItems = Object.entries(newItems).reduce((acc, [sanitizedKey, value]) => {
        acc[sanitizedKey] = {
          ...value,
          lastUpdated: Date.now()
        };
        return acc;
      }, {} as Record<string, any>);

      for (const [threshold, message] of Object.entries(MOTIVATION_MESSAGES)) {
        const thresholdNum = parseInt(threshold);
        
        if (completedPercentage >= thresholdNum && lastToastProgress < thresholdNum) {
          
          // Mostrar toast de celebración
          toast({
            title: message.title,
            description: `${message.description} - ${completedPercentage}% completado`,
            variant: "success",
            duration: 10000,
          });
          
          // Actualizar el último progreso mostrado
          setLastToastProgress(thresholdNum);
          
          // Ejecutar animación de confetti inmediatamente
          celebrateProgress(thresholdNum);
          
          // Ejecutar confetti adicional después de un delay
          setTimeout(() => {
            celebrateProgress(thresholdNum);
          }, 500);
          
          // Solo procesar un umbral a la vez
          break;
        }
      }

      await storage.updateBranch(selectedBranch, {
        items: firebaseItems,
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

  const handleAddItem = async () => {
    if (!selectedBranch || !newItemCode.trim()) return;
    const code = newItemCode.trim().toUpperCase();
    const key = sanitizeCode(code);
    if (currentMonthAddedItems[key]) {
      toast({ title: "Ya existe", description: `El item ${code} ya fue agregado este mes.`, variant: "destructive" });
      return;
    }
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const newAddedItems = { ...addedItems, [key]: { code, addedAt: Date.now(), month: currentMonth } };
    setAddedItems(newAddedItems);
    setNewItemCode('');
    try {
      await storage.updateBranch(selectedBranch, { addedItems: newAddedItems });
      toast({ title: "Item agregado", description: `${code} fue agregado a la lista.` });
    } catch (error) {
      setAddedItems(addedItems);
      toast({ title: "Error", description: "No se pudo guardar.", variant: "destructive" });
    }
  };

  const handleRemoveAddedItem = async (key: string) => {
    if (!selectedBranch) return;
    const { [key]: _, ...rest } = addedItems;
    setAddedItems(rest);
    try {
      await storage.updateBranch(selectedBranch, { addedItems: Object.keys(rest).length > 0 ? rest : {} });
    } catch (error) {
      setAddedItems(addedItems);
      toast({ title: "Error", description: "No se pudo eliminar.", variant: "destructive" });
    }
  };

  const progress = useMemo(() => {
    if (!selectedBranch || Object.keys(items).length === 0) {
      return { completed: 0, noStock: 0, completedCount: 0, totalItems: 0 };
    }
    
    // Si hay calendario semanal, usar los items del calendario (260 para T.Mendoza)
    // Si no, usar los CODES generales
    let totalItems: number;
    let completedCount: number;
    let noStockCount: number;
    
    if (calendarioSemanal) {
      // Obtener todos los códigos del calendario semanal
      const codigosCalendario = calendarioSemanal.semanas.flatMap(s => s.items);
      totalItems = codigosCalendario.length;
      completedCount = codigosCalendario.filter(code => items[sanitizeCode(code)]?.completed).length;
      noStockCount = codigosCalendario.filter(code => items[sanitizeCode(code)]?.hasStock === false).length;
    } else {
      totalItems = CODES.length;
      completedCount = Object.values(items).filter(i => i.completed).length;
      noStockCount = Object.values(items).filter(i => i.hasStock === false).length;
    }
    
    const completedPercentage = totalItems > 0 ? (completedCount / totalItems) * 100 : 0;
    const noStockPercentage = totalItems > 0 ? (noStockCount / totalItems) * 100 : 0;
    
    
    
    return {
      completed: completedPercentage,
      noStock: noStockPercentage,
      completedCount,
      totalItems
    };
  }, [selectedBranch, items, calendarioSemanal]);

  return (
    <div className="space-y-4 sm:space-y-8">
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center justify-between bg-background pt-2 sm:pt-4 pb-2 sm:pb-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          {selectedBranch && (
            <Button
              variant="outline"
              onClick={() => {
                setSelectedBranch(undefined);
                setItems({});
                setAddedItems({});
                setLastToastProgress(0);
              }}
              size="sm"
              className="gap-2 w-full sm:w-auto bg-primary/5 hover:bg-primary/10 border-primary/20 hover:border-primary/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <ArrowLeft className="h-4 w-4 text-primary" />
              Volver al Dashboard
            </Button>
          )}
          
          {!selectedBranch && (
            <BranchSelector
              value={selectedBranch}
              onChange={loadBranchData}
            />
          )}
          


        </div>
        {/* Mensaje recordatorio - solo desktop */}
        <div className="hidden sm:flex items-center gap-2 p-2 sm:p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg w-full md:w-auto">
          <div className="flex-shrink-0 animate-bounce">
            <svg className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200">
            Esta herramienta actúa como recordatorio y facilita el seguimiento del progreso de cada sucursal
          </p>
        </div>
        {/* Fecha actualización - mobile: fija arriba, chica | desktop: normal */}
        {ultimaActualizacion && (
          <>
            {/* Mobile: barra fija arriba debajo del header */}
            <div className="sm:hidden fixed top-14 left-0 right-0 z-40 bg-muted/80 backdrop-blur-sm border-b px-2 py-1 flex items-center justify-center gap-1.5">
              <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-[10px] text-muted-foreground">Act:</span>
              <span className="text-[10px] font-semibold">
                {(() => {
                  const parseLocalDate = (str: string) => {
                    if (!str) return null;
                    if (str.includes(' ')) {
                      const [datePart, timePart] = str.split(' ');
                      const [y, m, d] = datePart.split('-').map(Number);
                      const [h, min] = timePart.split(':').map(Number);
                      return { date: new Date(y, m - 1, d, h, min), hasTime: true };
                    }
                    const [y, m, d] = str.split('-').map(Number);
                    return { date: new Date(y, m - 1, d), hasTime: false };
                  };
                  const costo = parseLocalDate(ultimaActualizacion.costos_fecha);
                  const venta = parseLocalDate(ultimaActualizacion.ventas_fecha);
                  const latest = costo && venta ? (costo.date > venta.date ? costo : venta) : costo || venta;
                  if (!latest) return 'Sin datos';
                  const d = latest.date;
                  const timeStr = latest.hasTime ? ` ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';
                  return `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}${timeStr}`;
                })()}
              </span>
            </div>
            {/* Desktop: bloque normal */}
            <div className="hidden sm:flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 border w-full md:w-auto">
              <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-tight">
                  {(() => {
                    const parseLocalDate = (str: string) => {
                      if (!str) return null;
                      if (str.includes(' ')) {
                        const [datePart, timePart] = str.split(' ');
                        const [y, m, d] = datePart.split('-').map(Number);
                        const [h, min] = timePart.split(':').map(Number);
                        return { date: new Date(y, m - 1, d, h, min), hasTime: true };
                      }
                      const [y, m, d] = str.split('-').map(Number);
                      return { date: new Date(y, m - 1, d), hasTime: false };
                    };
                    const costo = parseLocalDate(ultimaActualizacion.costos_fecha);
                    const venta = parseLocalDate(ultimaActualizacion.ventas_fecha);
                    const latest = costo && venta ? (costo.date > venta.date ? costo : venta) : costo || venta;
                    if (!latest) return 'Sin datos';
                    const d = latest.date;
                    const timeStr = latest.hasTime ? ` ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';
                    return `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}${timeStr}`;
                  })()}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">Última actualización</span>
                <span className="text-[9px] text-muted-foreground/70 leading-tight">Actualización automática: Lun, Mié, Vie</span>
              </div>
            </div>
          </>
        )}
      </div>

      {loading ? (
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
              {/* Calendario con objetivos mensuales para T.Mendoza */}
              {calendarioSemanal && (
                <div className="space-y-4">
                  {/* Encabezado con título */}
                  <div className="bg-yellow-300 p-2 sm:p-3 rounded-lg" data-testid="header-calendario">
                    <h3 className="text-sm sm:text-lg font-bold text-gray-800">{calendarioSemanal.totalItems} Items sobrestock y sin rotación</h3>
                    <p className="text-xs sm:text-sm text-gray-600">Selecciona los items que vayas completando - {selectedBranch}</p>
                  </div>

                  {/* Objetivos mensuales - el usuario elige cuáles items completar */}
                  {(() => {
                    // Obtener todos los códigos del calendario
                    const todosLosCodigos = calendarioSemanal.semanas.flatMap(s => s.items);
                    const itemsCompletados = todosLosCodigos.filter(code => items[sanitizeCode(code)]?.completed);
                    const totalCompletados = itemsCompletados.length;
                    
                    // Calcular objetivos dinámicamente desde el calendario
                    const mesesMap: { [key: string]: number } = {};
                    calendarioSemanal.semanas.forEach(s => {
                      mesesMap[s.mes] = (mesesMap[s.mes] || 0) + s.items.length;
                    });
                    
                    let acumuladoCalc = 0;
                    const objetivosMensuales = Object.entries(mesesMap).map(([mes, objetivo]) => {
                      acumuladoCalc += objetivo;
                      return { mes, objetivo, acumulado: acumuladoCalc };
                    });
                    
                    return (
                      <>
                        {/* Sección fija: objetivos y progreso */}
                        <div className="sticky top-16 z-10 bg-white dark:bg-background pb-3 pt-2 space-y-3 shadow-sm">
                        {/* Resumen de objetivos por mes */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3" data-testid="objetivos-mensuales">
                          {objetivosMensuales.map(({ mes, objetivo, acumulado }) => {
                            // Calcular cuántos items corresponden a este mes
                            const acumuladoAnterior = acumulado - objetivo;
                            const completadosParaEsteMes = Math.min(Math.max(totalCompletados - acumuladoAnterior, 0), objetivo);
                            const porcentajeMes = (completadosParaEsteMes / objetivo) * 100;
                            const mesCompleto = completadosParaEsteMes >= objetivo;
                            
                            return (
                              <div 
                                key={mes}
                                onClick={() => {
                                  const element = document.getElementById(`items-lista`);
                                  if (element) {
                                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  }
                                }}
                                className={`p-3 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all relative overflow-hidden ${
                                  mesCompleto ? 'bg-green-100 border-green-500 shadow-lg shadow-green-200' :
                                  completadosParaEsteMes > 0 ? 'bg-blue-50 border-blue-200' :
                                  'bg-gray-50 border-gray-200'
                                }`}
                              >
                                {/* Badge de objetivo cumplido */}
                                {mesCompleto && (
                                  <div className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-lg shadow">
                                    ✓ CUMPLIDO
                                  </div>
                                )}
                                <div className="text-[10px] sm:text-xs text-gray-500">Objetivo: {objetivo} items</div>
                                <div className={`font-bold text-sm sm:text-lg ${mesCompleto ? 'text-green-700' : ''}`}>{mes}</div>
                                <div className="text-xs sm:text-sm flex items-center gap-1">
                                  <span className={`text-base sm:text-xl font-bold ${mesCompleto ? 'text-green-600' : 'text-gray-700'}`}>
                                    {completadosParaEsteMes}
                                  </span>
                                  <span className="text-gray-400">/ {objetivo}</span>
                                  {mesCompleto && <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 ml-1" />}
                                </div>
                                <Progress 
                                  value={porcentajeMes} 
                                  className={`h-2 mt-2 ${mesCompleto ? '[&>div]:bg-green-500' : ''}`} 
                                />
                                {mesCompleto && (
                                  <div className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                                    <PartyPopper className="h-3 w-3" /> ¡Meta alcanzada!
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Indicador de progreso general */}
                        <div className="bg-gray-100 p-3 rounded-lg" data-testid="progreso-total">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">Progreso Total</span>
                            <span className="font-bold text-lg">{totalCompletados}/{todosLosCodigos.length}</span>
                          </div>
                          <Progress value={(totalCompletados / todosLosCodigos.length) * 100} className="h-2" />
                        </div>
                        
                        {/* Buscador rápido - también fijo */}
                        <div className="bg-white dark:bg-background p-2 rounded-lg border" data-testid="buscador-items">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Buscar código..."
                              value={searchFilter}
                              onChange={(e) => setSearchFilter(e.target.value)}
                              className="w-full pl-9 pr-9 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                            {searchFilter && (
                              <button
                                onClick={() => setSearchFilter('')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          {searchFilter && (
                            <p className="text-xs text-gray-500 mt-1">
                              {todosLosCodigos.filter(c => c.toLowerCase().includes(searchFilter.toLowerCase())).length} resultados
                            </p>
                          )}
                        </div>
                        </div>

                        {/* Lista de todos los items para seleccionar */}
                        <div id="items-lista" className="border rounded-lg overflow-hidden" data-testid="items-lista">
                          <div className="bg-yellow-200 p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span className="font-semibold">Todos los Items</span>
                            </div>
                            <span className="text-sm font-bold">{totalCompletados}/{todosLosCodigos.length} completados</span>
                          </div>
                          
                          <div className="p-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 max-h-[60vh] overflow-y-auto">
                            {todosLosCodigos
                              .filter(code => code.toLowerCase().includes(searchFilter.toLowerCase()))
                              .map(code => {
                              const isCompleted = items[sanitizeCode(code)]?.completed;
                              return (
                                <div
                                  key={code}
                                  onClick={() => handleToggle(code, 'completed')}
                                  className={`flex items-center justify-between p-2 rounded cursor-pointer transition-all hover:shadow-sm ${
                                    isCompleted 
                                      ? 'bg-green-100 border border-green-300' 
                                      : 'bg-white border border-gray-200 hover:border-primary hover:bg-primary/5'
                                  }`}
                                >
                                  <span className="font-mono text-sm">{code}</span>
                                  <Checkbox
                                    checked={isCompleted || false}
                                    onCheckedChange={() => handleToggle(code, 'completed')}
                                    disabled={loading}
                                    className="h-4 w-4"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Sección Items Agregados */}
              <div className="border-2 border-dashed border-blue-300 rounded-lg overflow-hidden" data-testid="items-agregados">
                <div className="bg-blue-100 dark:bg-blue-900/30 px-2 py-2 sm:p-3 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <Plus className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="font-semibold text-sm sm:text-base text-blue-800 dark:text-blue-200 truncate">Items Agregados</span>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-blue-600 whitespace-nowrap">{Object.keys(currentMonthAddedItems).length} ({new Date().toLocaleString('es-AR', { month: 'short' })})</span>
                </div>
                <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
                  <div className="flex gap-1.5 sm:gap-2">
                    <input
                      type="text"
                      placeholder="Código artículo..."
                      value={newItemCode}
                      onChange={(e) => setNewItemCode(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddItem(); }}
                      className="flex-1 min-w-0 px-2 sm:px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <Button size="sm" onClick={handleAddItem} disabled={!newItemCode.trim()} className="shrink-0 gap-1 bg-blue-600 hover:bg-blue-700 px-2 sm:px-3">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Agregar</span>
                    </Button>
                  </div>
                  {Object.keys(currentMonthAddedItems).length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
                      {Object.entries(currentMonthAddedItems).map(([key, item]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between p-1.5 sm:p-2 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                        >
                          <span className="font-mono text-xs sm:text-sm text-blue-800 dark:text-blue-200 truncate mr-1">{item.code}</span>
                          <button
                            onClick={() => handleRemoveAddedItem(key)}
                            className="text-red-400 hover:text-red-600 transition-colors p-0.5 sm:p-1 shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {Object.keys(currentMonthAddedItems).length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-2">No hay items agregados este mes. Usá el campo de arriba para agregar artículos que encuentres de más.</p>
                  )}
                </div>
              </div>

              {/* Lista completa de items (para sucursales sin calendario) */}
              {!calendarioSemanal && (
                <div className="space-y-2">
                  {CODES.map((code) => (
                    <div
                      key={code}
                      className={`flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 p-2 rounded hover:bg-accent transition-colors ${
                        items[sanitizeCode(code)]?.completed ? 'bg-primary/10' : ''
                      }`}
                    >
                      <span className="flex-1 font-mono">{code}</span>
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
              )}
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