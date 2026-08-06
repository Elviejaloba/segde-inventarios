import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Branch, SEASON_CODES_TEMPORADA_VERANO } from "@/lib/store";
import { BranchSelector } from "@/components/branch-selector";
import { ArrowLeft, PartyPopper, Trophy, Star, ArrowUp, Calendar, ChevronDown, ChevronRight, CheckCircle2, Search, X, Clock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dashboard } from "@/components/dashboard";
import { useFirebaseData } from "@/hooks/use-firebase-data";
import { getAllChecklistEntries, getCalendarioSucursal, getChecklistDisplayCode, getChecklistEntriesForMonth, getChecklistEntryKey, getChecklistItemState, getMesActualCalendario, getSemanaActual, type SemanaCalendario } from "@/lib/calendario-semanal";

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
import { buildApiUrl } from "@/lib/api";
// @ts-ignore
import confetti from 'canvas-confetti';
import { analytics } from "@/lib/analytics";



// Lista de >códigos para temporada de verano
const CODES = SEASON_CODES_TEMPORADA_VERANO;

// FunciÃ³n para sanitizar >códigos al guardar
const sanitizeCode = (code: string) => {
  return code.toLowerCase().replace(/[/.#$[\]]/g, '-');
};

// FunciÃ³n para desanitizar >códigos al mostrar
const desanitizeCode = (code: string) => {
  return CODES.find(originalCode => sanitizeCode(originalCode) === code) || code;
};

interface ItemState {
  completed: boolean;
  hasStock: boolean;
  lastUpdated?: number;
}

interface ChecklistEntry {
  code: string;
  mes: string;
  semana: string;
  periodKey?: string;
}

type ChecklistViewFilter = 'pending' | 'completed' | 'noStock' | 'all';
type ChecklistFeedbackStatus = 'saving' | 'success' | 'exiting';
type ChecklistFeedbackAction = 'completed' | 'noStock';

interface ChecklistFeedbackState {
  status: ChecklistFeedbackStatus;
  action: ChecklistFeedbackAction;
}

const buildFallbackEntries = (codes: string[]): ChecklistEntry[] => codes.map((code) => ({ code, mes: '', semana: '' }));

const getLocalItemState = (localItems: Record<string, ItemState>, code: string, periodKey?: string): ItemState => {
  const key = getChecklistEntryKey(code, periodKey);
  return localItems[key] || { completed: false, hasStock: true };
};

const MOTIVATION_MESSAGES = {
  20: {
    title: ">¡Excelente inicio!",
    description: ">¡Sigue así, vas por muy buen camino.",
    variant: "success" as const
  },
  40: {
    title: ">¡Vas muy bien!",
    description: ">¡Ya llevas casi la mitad!",
    variant: "success" as const
  },
  60: {
    title: ">¡Increíble progreso!",
    description: ">¡Mantené ese ritmo!",
    variant: "success" as const
  },
  80: {
    title: ">¡Casi llegás!",
    description: ">¡Te falta muy poco!",
    variant: "success" as const
  },
  100: {
    title: ">¡Felicitaciones!",
    description: ">¡Has completado todos los ítems!",
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
    const duration = 1500;
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
    const duration = 2000;
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
  const [expandedHistoricalMonths, setExpandedHistoricalMonths] = useState<Set<string>>(new Set());
  const [showHistoricalMonths, setShowHistoricalMonths] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [checklistViewFilter, setChecklistViewFilter] = useState<ChecklistViewFilter>('pending');
  const [celebratedMonths, setCelebratedMonths] = useState<Set<string>>(new Set());
  const [addedItems, setAddedItems] = useState<Record<string, { code: string; addedAt: number; month?: string }>>({});
  const [newItemCode, setNewItemCode] = useState('');
  const [itemFeedbackStates, setItemFeedbackStates] = useState<Record<string, ChecklistFeedbackState>>({});
  const [animatedChecklistSummary, setAnimatedChecklistSummary] = useState({ pending: 0, completed: 0, noStock: 0, total: 0 });

  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const currentCalendarMonth = useMemo(() => getMesActualCalendario(), []);

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
  const isFirebaseReadOnly = import.meta.env.DEV && import.meta.env.VITE_FIREBASE_READONLY === 'true';
  const [lastToastProgress, setLastToastProgress] = useState(0);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const { data: branchesData } = useFirebaseData();

  const { data: ultimaActualizacion } = useQuery<{ costos_fecha: string; ventas_fecha: string }>({
    queryKey: ['/api/ultima-actualizacion'],
    queryFn: async () => {
      const response = await fetch(buildApiUrl('/api/ultima-actualizacion'));
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
    if (!branchData) return;

    const calendario = getCalendarioSucursal(selectedBranch);
    const entriesToUse = calendario ? getAllChecklistEntries(calendario) : buildFallbackEntries(CODES);

    const newItems = entriesToUse.reduce((acc, entry) => {
      const itemKey = getChecklistEntryKey(entry.code, entry.periodKey);
      const existingItem = getChecklistItemState(branchData, entry.code, entry.periodKey);
      acc[itemKey] = existingItem
        ? {
            completed: existingItem.completed === true,
            hasStock: existingItem.hasStock !== false,
            lastUpdated: existingItem.lastUpdated,
          }
        : { completed: false, hasStock: true };
      return acc;
    }, {} as Record<string, ItemState>);

    const currentKeys = Object.keys(items);
    const nextKeys = Object.keys(newItems);
    const hasChanges = currentKeys.length !== nextKeys.length || nextKeys.some((key) => {
      const current = items[key];
      const updated = newItems[key];
      return !current || current.completed !== updated.completed || current.hasStock !== updated.hasStock;
    });

    if (hasChanges) {
      setItems(newItems);
    }
  }, [branchesData, selectedBranch, loading, items]);

  // Obtener calendario semanal si existe para la sucursal
  const calendarioSemanal = selectedBranch ? getCalendarioSucursal(selectedBranch) : null;
  const semanaActual = getSemanaActual();

  const allChecklistEntries = useMemo(() => {
    return calendarioSemanal ? getAllChecklistEntries(calendarioSemanal) : buildFallbackEntries(CODES);
  }, [calendarioSemanal]);

  const activeChecklistEntries = useMemo(() => {
    if (!calendarioSemanal) return buildFallbackEntries(CODES);
    const currentMonthEntries = getChecklistEntriesForMonth(calendarioSemanal, currentCalendarMonth);
    return currentMonthEntries.length > 0 ? currentMonthEntries : getAllChecklistEntries(calendarioSemanal);
  }, [calendarioSemanal, currentCalendarMonth]);

  // Calcular progreso por semana
  const progresoSemanal = useMemo(() => {
    if (!calendarioSemanal || Object.keys(items).length === 0) return [];

    return calendarioSemanal.semanas.map(semana => {
      const completados = semana.items.filter(code => getLocalItemState(items, code, semana.periodKey).completed).length;
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

  const toggleHistoricalMonth = (monthKey: string) => {
    setExpandedHistoricalMonths(prev => {
      const next = new Set(prev);
      if (next.has(monthKey)) {
        next.delete(monthKey);
      } else {
        next.add(monthKey);
      }
      return next;
    });
  };

  // Calcular progreso por mes para detectar objetivos cumplidos
  const progresoMensual = useMemo(() => {
    if (!calendarioSemanal) return [];

    const meses = Array.from(new Set(calendarioSemanal.semanas.map((semana) => semana.mes)));
    return meses.map((mes) => {
      const entries = getChecklistEntriesForMonth(calendarioSemanal, mes);
      const completados = entries.filter((entry) => getLocalItemState(items, entry.code, entry.periodKey).completed).length;
      return {
        mes,
        objetivo: entries.length,
        completados,
        cumplido: completados >= entries.length && entries.length > 0,
      };
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
        
        // Mostrar toast de felicitaciÃ³n
        toast({
          title: `Objetivo ${mes} cumplido`,
          description: `Completaste todos los ?tems planificados para ${mes}.`,
          variant: 'success',
          duration: 2600,
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
      const calendario = getCalendarioSucursal(branch);
      const entriesToUse = calendario ? getAllChecklistEntries(calendario) : buildFallbackEntries(CODES);

      const initializedItems = entriesToUse.reduce((acc, entry) => {
        const itemKey = getChecklistEntryKey(entry.code, entry.periodKey);
        const existingItem = branchData ? getChecklistItemState(branchData, entry.code, entry.periodKey) : null;

        acc[itemKey] = existingItem
          ? {
              completed: existingItem.completed === true,
              hasStock: existingItem.hasStock !== false,
              lastUpdated: existingItem.lastUpdated,
            }
          : { completed: false, hasStock: true };
        return acc;
      }, {} as Record<string, ItemState>);

      setItems(initializedItems);
      setAddedItems(branchData?.addedItems || {});
      analytics.logAction('branch_select', { branch });

      if (branchData?.totalCompleted) {
        const progress = Math.floor(branchData.totalCompleted);
        setLastToastProgress(progress);
      } else {
        setLastToastProgress(0);
      }
    } catch (error) {
      console.error("Error al cargar datos:", error);
      toast({
        title: ">Error de conexión",
        description: "No se pudieron cargar los datos. Intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (code: string, field: keyof ItemState, periodKey?: string) => {
    if (!selectedBranch || loading) return;
    if (isFirebaseReadOnly) {
      toast({
        title: 'Modo solo lectura',
        description: 'Esta sesi?n local est? en modo solo lectura. No se guardan cambios.',
      });
      return;
    }

    const itemKey = getChecklistEntryKey(code, periodKey);
    if (itemFeedbackStates[itemKey]?.status === 'saving') return;

    const currentState = items[itemKey] || { completed: false, hasStock: true };
    const nextState = field === 'completed'
      ? {
          ...currentState,
          completed: !currentState.completed,
          hasStock: true,
        }
      : {
          ...currentState,
          completed: false,
          hasStock: currentState.hasStock === false,
        };

    const newItems = {
      ...items,
      [itemKey]: nextState,
    };

    const feedbackAction: ChecklistFeedbackAction = field === 'completed' ? 'completed' : 'noStock';
    setItemFeedbackStates((prev) => ({
      ...prev,
      [itemKey]: { status: 'saving', action: feedbackAction },
    }));
    setItems(newItems);

    try {
      const totalItemsActivos = activeChecklistEntries.length > 0 ? activeChecklistEntries.length : CODES.length;
      const completedCount = activeChecklistEntries.filter((entry) => getLocalItemState(newItems, entry.code, entry.periodKey).completed).length;
      const noStockCount = activeChecklistEntries.filter((entry) => getLocalItemState(newItems, entry.code, entry.periodKey).hasStock === false).length;
      const completedPercentage = totalItemsActivos > 0 ? Math.round((completedCount / totalItemsActivos) * 100) : 0;

      for (const [threshold, message] of Object.entries(MOTIVATION_MESSAGES)) {
        const thresholdNum = parseInt(threshold);

        if (completedPercentage >= thresholdNum && lastToastProgress < thresholdNum) {
          toast({
            title: message.title,
            description: `${message.description} - ${completedPercentage}% completado`,
            variant: "success",
            duration: 5000,
          });

          setLastToastProgress(thresholdNum);
          celebrateProgress(thresholdNum);
          break;
        }
      }

      await storage.updateChecklistItem(selectedBranch, code, {
        completed: nextState.completed === true,
        hasStock: nextState.hasStock !== false,
        periodKey,
      });

      setItemFeedbackStates((prev) => ({
        ...prev,
        [itemKey]: { status: 'success', action: feedbackAction },
      }));

      toast({
        title: feedbackAction === 'completed' ? 'Art?culo completado' : 'Marcado sin stock',
        description: 'El estado se guardó correctamente.',
        variant: 'success',
        duration: 1500,
      });

      analytics.logAction('item_toggle', {
        branch: selectedBranch,
        code: itemKey,
        field,
        newValue: field === 'completed' ? nextState.completed : nextState.hasStock,
      });

      await new Promise((resolve) => window.setTimeout(resolve, 380));
      setItemFeedbackStates((prev) => ({
        ...prev,
        [itemKey]: { status: 'exiting', action: feedbackAction },
      }));
      await new Promise((resolve) => window.setTimeout(resolve, 360));
      setItemFeedbackStates((prev) => {
        const next = { ...prev };
        delete next[itemKey];
        return next;
      });
    } catch (error) {
      console.error("Error al guardar:", error);
      setItems(items);
      setItemFeedbackStates((prev) => {
        const next = { ...prev };
        delete next[itemKey];
        return next;
      });
      toast({
        title: "No se pudo guardar",
        description: "Intentalo nuevamente.",
        variant: "destructive",
        duration: 2200,
      });
    }
  };

  const handleAddItem = async () => {
    if (isFirebaseReadOnly) {
      toast({ title: 'Modo solo lectura', description: '>No se pueden agregar artículos en esta sesión local.' });
      return;
    }
    if (!selectedBranch || !newItemCode.trim()) return;
    const code = newItemCode.trim().toUpperCase();
    const key = sanitizeCode(code);
    if (currentMonthAddedItems[key]) {
      toast({ title: "Art?culo ya agregado", description: `El art?culo ${code} ya fue agregado este mes.`, variant: 'warning' });
      return;
    }
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const newAddedItems = { ...addedItems, [key]: { code, addedAt: Date.now(), month: currentMonth } };
    setAddedItems(newAddedItems);
    setNewItemCode('');
    try {
      await storage.updateBranch(selectedBranch, { addedItems: newAddedItems });
      toast({ title: "Art?culo ya agregado", description: `El art?culo ${code} ya fue agregado este mes.`, variant: 'warning' });
    } catch (error) {
      setAddedItems(addedItems);
      toast({ title: "No se pudo guardar", description: "Volv? a intentarlo en unos segundos.", variant: "destructive" });
    }
  };

  const handleRemoveAddedItem = async (key: string) => {
    if (isFirebaseReadOnly) {
      toast({ title: 'Modo solo lectura', description: '>No se pueden eliminar artículos en esta sesión local.' });
      return;
    }
    if (!selectedBranch) return;
    const { [key]: _, ...rest } = addedItems;
    setAddedItems(rest);
    try {
      await storage.updateBranch(selectedBranch, { addedItems: Object.keys(rest).length > 0 ? rest : {} });
    } catch (error) {
      setAddedItems(addedItems);
      toast({ title: "No se pudo eliminar", description: "Volv? a intentarlo en unos segundos.", variant: "destructive" });
    }
  };

  const progress = useMemo(() => {
    if (!selectedBranch || Object.keys(items).length === 0) {
      return { completed: 0, noStock: 0, completedCount: 0, totalItems: 0 };
    }

    let totalItems: number;
    let completedCount: number;
    let noStockCount: number;

    if (calendarioSemanal) {
      totalItems = activeChecklistEntries.length;
      completedCount = activeChecklistEntries.filter((entry) => getLocalItemState(items, entry.code, entry.periodKey).completed).length;
      noStockCount = activeChecklistEntries.filter((entry) => getLocalItemState(items, entry.code, entry.periodKey).hasStock === false).length;
    } else {
      totalItems = CODES.length;
      completedCount = Math.min(
        Object.values(items).filter(i => i.completed === true).length,
        totalItems
      );
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
  }, [selectedBranch, items, calendarioSemanal, activeChecklistEntries]);

  const checklistFilterLabels: Record<ChecklistViewFilter, string> = {
    pending: 'Pendientes',
    completed: 'Completados',
    noStock: 'Sin Stock',
    all: 'Todos',
  };

  const checklistSourceEntries = useMemo(() => {
    return activeChecklistEntries.length > 0 ? activeChecklistEntries : buildFallbackEntries(CODES);
  }, [activeChecklistEntries]);

  const getItemFeedbackState = (code: string, periodKey?: string) => itemFeedbackStates[getChecklistEntryKey(code, periodKey)];

  const checklistSummary = useMemo(() => {
    const total = checklistSourceEntries.length;
    const completed = checklistSourceEntries.filter((entry) => getLocalItemState(items, entry.code, entry.periodKey).completed).length;
    const noStock = checklistSourceEntries.filter((entry) => getLocalItemState(items, entry.code, entry.periodKey).hasStock === false).length;
    const pending = checklistSourceEntries.filter((entry) => {
      const state = getLocalItemState(items, entry.code, entry.periodKey);
      return state.completed !== true && state.hasStock !== false;
    }).length;

    return { pending, completed, noStock, total };
  }, [checklistSourceEntries, items]);

  useEffect(() => {
    const target = checklistSummary;
    const timer = window.setInterval(() => {
      setAnimatedChecklistSummary((current) => {
        const next = { ...current };
        let changed = false;

        (Object.keys(target) as Array<keyof typeof target>).forEach((key) => {
          const currentValue = current[key];
          const targetValue = target[key];
          if (currentValue === targetValue) return;

          const distance = targetValue - currentValue;
          const step = Math.max(1, Math.ceil(Math.abs(distance) / 4));
          next[key] = currentValue + Math.sign(distance) * Math.min(Math.abs(distance), step);
          changed = true;
        });

        return changed ? next : current;
      });
    }, 45);

    return () => window.clearInterval(timer);
  }, [checklistSummary]);

  const visibleChecklistEntries = useMemo(() => {
    const normalizedSearch = searchFilter.trim().toLowerCase();
    let entries = [...checklistSourceEntries];

    if (checklistViewFilter === 'pending') {
      const rankEntry = (entry: ChecklistEntry) => {
        const state = getLocalItemState(items, entry.code, entry.periodKey);
        if (state.completed === true) return 2;
        if (state.hasStock === false) return 1;
        return 0;
      };
      entries.sort((a, b) => rankEntry(a) - rankEntry(b));
    } else if (checklistViewFilter === 'completed') {
      entries = entries.filter((entry) => getLocalItemState(items, entry.code, entry.periodKey).completed === true || Boolean(getItemFeedbackState(entry.code, entry.periodKey)));
    } else if (checklistViewFilter === 'noStock') {
      entries = entries.filter((entry) => getLocalItemState(items, entry.code, entry.periodKey).hasStock === false || Boolean(getItemFeedbackState(entry.code, entry.periodKey)));
    }

    if (!normalizedSearch) return entries;

    return entries.filter((entry) => {
      const code = entry.code.toLowerCase();
      const displayCode = getChecklistDisplayCode(entry.code).toLowerCase();
      return code.includes(normalizedSearch) || displayCode.includes(normalizedSearch);
    });
  }, [checklistSourceEntries, checklistViewFilter, searchFilter, items, itemFeedbackStates]);

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
        {/* Fecha actualizaciÃ³n - mobile: fija arriba, chica | desktop: normal */}
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

      {isFirebaseReadOnly && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Modo solo lectura local activo: se visualizan datos reales del checklist, pero toda escritura está bloqueada.
        </div>
      )}

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
            <CardContent className="space-y-4 sm:space-y-6">
              {/* Calendario con objetivos mensuales para T.Mendoza */}
              {calendarioSemanal && (
                <div className="space-y-4">
                  {/* Encabezado con tÃ­tulo */}
                  <div className="bg-yellow-300 p-2 sm:p-3 rounded-lg" data-testid="header-calendario">
                    <h3 className="text-sm sm:text-lg font-bold text-gray-800">{activeChecklistEntries.length} Artículos solicitados para realizar inventario</h3>
                    <p className="text-xs sm:text-sm text-gray-600">Selecciona los ítems que vayas completando - {selectedBranch}</p>
                  </div>

                  {/* Objetivos mensuales - el usuario elige cuÃ¡les items completar */}
                  {(() => {
                    const todosLosCodigos = activeChecklistEntries;
                    const itemsCompletados = todosLosCodigos.filter(entry => getLocalItemState(items, entry.code, entry.periodKey).completed);
                    const totalCompletados = itemsCompletados.length;
                    const objetivosMensuales = progresoMensual;
                    
                    return (
                      <>
                        {/* Secci?n fija: objetivos y progreso */}
                        <div className="pb-3 pt-2 space-y-3">
                        {/* Resumen de objetivos por mes */}
                        <div className="space-y-3" data-testid="objetivos-mensuales">
                          {(() => {
                            const mesVigente = currentCalendarMonth;
                            const mesActual = objetivosMensuales.find(({ mes }) => mes === mesVigente);
                            const mesesHistoricos = objetivosMensuales.filter(({ mes }) => mes !== mesVigente);

                            return (
                              <>
                                {mesActual && (() => {
                                  const { mes, objetivo, completados: completadosParaEsteMes, cumplido: mesCompleto } = mesActual;
                                  const porcentajeMes = objetivo > 0 ? (completadosParaEsteMes / objetivo) * 100 : 0;

                                  return (
                                    <div className={`rounded-xl border-2 p-3 sm:p-4 transition-all ${mesCompleto ? 'border-green-500 bg-green-100' : completadosParaEsteMes > 0 ? 'border-blue-300 bg-blue-50' : 'border-amber-300 bg-amber-50/80'}`}>
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Mes vigente</div>
                                          <div className="mt-1 flex items-center gap-2">
                                            <span className="text-lg font-bold text-gray-900 sm:text-xl">{mes}</span>
                                            {mesCompleto ? <Trophy className="h-4 w-4 text-yellow-500 sm:h-5 sm:w-5" /> : null}
                                          </div>
                                          <div className="mt-1 text-sm text-gray-600">{completadosParaEsteMes}/{objetivo} ? {porcentajeMes.toFixed(0)}%</div>
                                        </div>
                                        {mesCompleto ? (
                                          <div className="rounded-full bg-green-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">Cumplido</div>
                                        ) : (
                                          <div className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-gray-600 shadow-sm">Visible</div>
                                        )}
                                      </div>
                                      <Progress value={porcentajeMes} className={`mt-3 h-2.5 ${mesCompleto ? '[&>div]:bg-green-500' : '[&>div]:bg-amber-500'}`} />
                                      <div className="mt-2 flex items-center justify-between text-xs sm:text-sm">
                                        <span className="text-gray-500">Objetivo: {objetivo} items</span>
                                        {mesCompleto ? (
                                          <span className="flex items-center gap-1 font-medium text-green-700"><PartyPopper className="h-3.5 w-3.5" />Meta alcanzada</span>
                                        ) : (
                                          <span className="font-medium text-gray-700">AGOSTO queda siempre visible</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {mesesHistoricos.length > 0 && (
                                  <div className="space-y-2">
                                    <button
                                      type="button"
                                      onClick={() => setShowHistoricalMonths((prev) => !prev)}
                                      className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                                    >
                                      <div>
                                        <div className="text-sm font-semibold text-gray-900">Meses anteriores</div>
                                        <div className="text-xs text-gray-500">Mostr? u ocult? el detalle hist?rico sin perder progreso.</div>
                                      </div>
                                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                        <span>{showHistoricalMonths ? 'Ocultar meses anteriores' : 'Mostrar meses anteriores'}</span>
                                        {showHistoricalMonths ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                      </div>
                                    </button>

                                    {showHistoricalMonths && (
                                      <div className="space-y-2">
                                        {mesesHistoricos.map(({ mes, objetivo, completados: completadosParaEsteMes, cumplido: mesCompleto }) => {
                                          const porcentajeMes = objetivo > 0 ? (completadosParaEsteMes / objetivo) * 100 : 0;
                                          const expanded = expandedHistoricalMonths.has(mes);

                                          return (
                                            <div key={mes} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                                              <button
                                                type="button"
                                                onClick={() => toggleHistoricalMonth(mes)}
                                                className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-gray-50"
                                              >
                                                <div className="min-w-0 flex-1">
                                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm sm:text-base">
                                                    <span className="font-bold text-gray-900">{mes}</span>
                                                    <span className="text-gray-500">?</span>
                                                    <span className="font-medium text-gray-700">{completadosParaEsteMes}/{objetivo}</span>
                                                    <span className="text-gray-500">?</span>
                                                    <span className={`font-semibold ${mesCompleto ? 'text-green-700' : 'text-gray-700'}`}>{porcentajeMes.toFixed(0)}%</span>
                                                  </div>
                                                </div>
                                                {expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" /> : <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />}
                                              </button>

                                              {expanded && (
                                                <div className="border-t border-gray-100 px-3 py-3 sm:px-4">
                                                  <div className={`rounded-lg border p-3 ${mesCompleto ? 'border-green-300 bg-green-50' : completadosParaEsteMes > 0 ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                                                    <div className="flex items-start justify-between gap-3">
                                                      <div>
                                                        <div className="text-xs text-gray-500">Objetivo: {objetivo} items</div>
                                                        <div className="mt-1 text-base font-bold text-gray-900">{mes}</div>
                                                        <div className="text-sm text-gray-700">{completadosParaEsteMes}/{objetivo} completados</div>
                                                      </div>
                                                      {mesCompleto ? <span className="rounded-full bg-green-500 px-2 py-1 text-[11px] font-semibold text-white">Cumplido</span> : null}
                                                    </div>
                                                    <Progress value={porcentajeMes} className={`mt-3 h-2 ${mesCompleto ? '[&>div]:bg-green-500' : '[&>div]:bg-blue-500'}`} />
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                        {/* Indicador de progreso general */}
                        <div className="bg-gray-100 p-3 rounded-lg" data-testid="progreso-total">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">Progreso Total</span>
                            <span className="font-bold text-lg">{totalCompletados}/{todosLosCodigos.length}</span>
                          </div>
                          <Progress value={(totalCompletados / todosLosCodigos.length) * 100} className="h-2" />
                        </div>
                        
                        {/* Barra de acciones y buscador */}
                        <div className="space-y-3" data-testid="acciones-checklist">
                          <div className="flex flex-wrap gap-2">
                            {([
                              { key: 'pending', label: '\u{1F7E2} Pendientes' },
                              { key: 'completed', label: '\u{1F535} Completados' },
                              { key: 'noStock', label: '\u{1F7E0} Sin Stock' },
                              { key: 'all', label: '\u26AA Todos' },
                            ] as { key: ChecklistViewFilter; label: string }[]).map((option) => (
                              <button
                                key={option.key}
                                type="button"
                                onClick={() => setChecklistViewFilter(option.key)}
                                className={`min-h-10 flex-1 rounded-full border px-3 py-2 text-sm font-medium transition-colors sm:min-h-0 sm:flex-none ${
                                  checklistViewFilter === option.key
                                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-primary/40 hover:bg-primary/5'
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" data-testid="resumen-checklist">
                            <div className="rounded-lg border bg-white px-3 py-2.5">
                              <div className="text-[11px] uppercase tracking-wide text-gray-500">Pendientes</div>
                              <div className="text-lg font-bold text-gray-900 sm:text-xl">{animatedChecklistSummary.pending}</div>
                            </div>
                            <div className="rounded-lg border bg-white px-3 py-2.5">
                              <div className="text-[11px] uppercase tracking-wide text-gray-500">Completados</div>
                              <div className="text-lg font-bold text-green-600 sm:text-xl">{animatedChecklistSummary.completed}</div>
                            </div>
                            <div className="rounded-lg border bg-white px-3 py-2.5">
                              <div className="text-[11px] uppercase tracking-wide text-gray-500">Sin Stock</div>
                              <div className="text-lg font-bold text-orange-500 sm:text-xl">{animatedChecklistSummary.noStock}</div>
                            </div>
                            <div className="rounded-lg border bg-white px-3 py-2.5">
                              <div className="text-[11px] uppercase tracking-wide text-gray-500">Total</div>
                              <div className="text-lg font-bold text-gray-900 sm:text-xl">{animatedChecklistSummary.total}</div>
                            </div>
                          </div>

                          <div className="rounded-lg border bg-white p-2.5 dark:bg-background sm:p-3" data-testid="buscador-items">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <input
                                type="text"
                                placeholder={`Buscar en ${checklistFilterLabels[checklistViewFilter].toLowerCase()}...`}
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
                            {(searchFilter || checklistViewFilter !== 'pending') && (
                              <p className="text-xs text-gray-500 mt-1">
                                {visibleChecklistEntries.length} resultados en {checklistFilterLabels[checklistViewFilter].toLowerCase()}
                              </p>
                            )}
                          </div>
                        </div>
                        </div>

                        {/* Lista de todos los items para seleccionar */}
                        <div id="items-lista" className="overflow-hidden rounded-lg border" data-testid="items-lista">
                          <div className="flex flex-col items-start justify-between gap-2 bg-yellow-200 p-3 sm:flex-row sm:items-center">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span className="font-semibold">{checklistFilterLabels[checklistViewFilter]}</span>
                            </div>
                            <span className="text-xs font-bold sm:text-sm">{visibleChecklistEntries.length} visibles · {animatedChecklistSummary.completed}/{animatedChecklistSummary.total} completados</span>
                          </div>
                          
                          <div className="grid max-h-[60vh] grid-cols-1 gap-2 overflow-y-auto p-2 sm:grid-cols-2 sm:p-3 md:grid-cols-3 lg:grid-cols-4">
                            {visibleChecklistEntries.map(entry => {
                              const state = getLocalItemState(items, entry.code, entry.periodKey);
                              const isCompleted = state.completed === true;
                              const isNoStock = state.hasStock === false;
                              const feedbackState = getItemFeedbackState(entry.code, entry.periodKey);
                              const isSaving = feedbackState?.status === 'saving';
                              const isSuccess = feedbackState?.status === 'success';
                              const isExiting = feedbackState?.status === 'exiting';
                              const itemStatusLabel = isCompleted ? 'Completado' : isNoStock ? 'Sin Stock' : 'Pendiente';
                              return (
                                <div
                                  key={getChecklistEntryKey(entry.code, entry.periodKey)}
                                  className={`flex min-h-[96px] flex-col gap-3 rounded border p-3 transition-all duration-300 ${
                                    isCompleted
                                      ? 'border-green-300 bg-green-100'
                                      : isNoStock
                                        ? 'border-orange-200 bg-orange-50'
                                        : 'border-gray-200 bg-white hover:border-primary hover:bg-primary/5 hover:shadow-sm'
                                  } ${isSaving ? 'cursor-progress opacity-90' : ''} ${isSuccess ? 'ring-2 ring-emerald-300/70 shadow-[0_0_0_1px_rgba(16,185,129,0.12)]' : ''} ${isExiting ? 'translate-y-1 scale-[0.985] opacity-0' : ''}`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <span className="block font-mono text-sm">{getChecklistDisplayCode(entry.code)}</span>
                                      <span className={`text-[11px] font-medium ${
                                        isCompleted ? 'text-green-700' : isNoStock ? 'text-orange-600' : 'text-gray-500'
                                      }`}>
                                        {itemStatusLabel}
                                      </span>
                                    </div>
                                    {isSaving ? (
                                      <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                        <Clock className="h-3.5 w-3.5 animate-spin" />
                                        <span>Guardando...</span>
                                      </div>
                                    ) : isSuccess ? (
                                      <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        <span>Guardado</span>
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:flex-col sm:items-start sm:gap-1.5">
                                    <label className="flex min-h-8 items-center gap-2.5 text-sm font-medium text-muted-foreground">
                                      <Checkbox
                                        checked={isCompleted || false}
                                        onCheckedChange={() => handleToggle(entry.code, 'completed', entry.periodKey)}
                                        disabled={loading || isFirebaseReadOnly || isSaving}
                                        className="h-5 w-5 shrink-0"
                                      />
                                      <span className="leading-none">Completado</span>
                                    </label>
                                    <label className="flex min-h-8 items-center gap-2.5 text-sm font-medium text-muted-foreground">
                                      <Checkbox
                                        checked={isNoStock || false}
                                        onCheckedChange={() => handleToggle(entry.code, 'hasStock', entry.periodKey)}
                                        disabled={loading || isFirebaseReadOnly || isSaving}
                                        className="h-5 w-5 shrink-0"
                                      />
                                      <span className="leading-none">Sin Stock</span>
                                    </label>
                                  </div>
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

              {/* SecciÃ³n Items Agregados */}
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
                    <Button size="sm" onClick={handleAddItem} disabled={isFirebaseReadOnly || !newItemCode.trim()} className="shrink-0 gap-1 bg-blue-600 hover:bg-blue-700 px-2 sm:px-3">
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
                <div className="space-y-3">
                  <div className="space-y-3" data-testid="acciones-checklist">
                    <div className="flex flex-wrap gap-2">
                      {([
                        { key: 'pending', label: '\u{1F7E2} Pendientes' },
                        { key: 'completed', label: '\u{1F535} Completados' },
                        { key: 'noStock', label: '\u{1F7E0} Sin Stock' },
                              { key: 'all', label: '\u26AA Todos' },
                      ] as { key: ChecklistViewFilter; label: string }[]).map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setChecklistViewFilter(option.key)}
                          className={`min-h-10 flex-1 rounded-full border px-3 py-2 text-sm font-medium transition-colors sm:min-h-0 sm:flex-none ${
                            checklistViewFilter === option.key
                              ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-primary/40 hover:bg-primary/5'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" data-testid="resumen-checklist">
                      <div className="rounded-lg border bg-white px-3 py-2.5">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">Pendientes</div>
                        <div className="text-lg font-bold text-gray-900 sm:text-xl">{animatedChecklistSummary.pending}</div>
                      </div>
                      <div className="rounded-lg border bg-white px-3 py-2.5">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">Completados</div>
                        <div className="text-lg font-bold text-green-600 sm:text-xl">{animatedChecklistSummary.completed}</div>
                      </div>
                      <div className="rounded-lg border bg-white px-3 py-2.5">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">Sin Stock</div>
                        <div className="text-lg font-bold text-orange-500 sm:text-xl">{animatedChecklistSummary.noStock}</div>
                      </div>
                      <div className="rounded-lg border bg-white px-3 py-2.5">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">Total</div>
                        <div className="text-lg font-bold text-gray-900 sm:text-xl">{animatedChecklistSummary.total}</div>
                      </div>
                    </div>

                    <div className="rounded-lg border bg-white p-2.5 dark:bg-background sm:p-3" data-testid="buscador-items">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder={`Buscar en ${checklistFilterLabels[checklistViewFilter].toLowerCase()}...`}
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
                      {(searchFilter || checklistViewFilter !== 'pending') && (
                        <p className="text-xs text-gray-500 mt-1">
                          {visibleChecklistEntries.length} resultados en {checklistFilterLabels[checklistViewFilter].toLowerCase()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {visibleChecklistEntries.map((entry) => {
                      const state = getLocalItemState(items, entry.code, entry.periodKey);
                      const isCompleted = state.completed === true;
                      const isNoStock = state.hasStock === false;
                      return (
                        <div
                          key={getChecklistEntryKey(entry.code, entry.periodKey)}
                          className={`flex flex-col gap-3 rounded p-2 transition-all duration-300 sm:flex-row sm:items-center sm:gap-4 ${
                            isCompleted ? 'bg-primary/10' : isNoStock ? 'bg-orange-50' : 'hover:bg-accent'
                          } ${isSaving ? 'cursor-progress opacity-90' : ''} ${isSuccess ? 'ring-1 ring-emerald-300/70' : ''} ${isExiting ? 'translate-y-1 scale-[0.99] opacity-0' : ''}`}
                        >
                          <div className="flex flex-1 items-start justify-between gap-3 min-w-0">
                            <div className="min-w-0">
                              <span className="block font-mono">{getChecklistDisplayCode(entry.code)}</span>
                              <span className={`text-xs ${isCompleted ? 'text-green-700' : isNoStock ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                {isCompleted ? 'Completado' : isNoStock ? 'Sin Stock' : 'Pendiente'}
                              </span>
                            </div>
                            {isSaving ? (
                              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                <Clock className="h-3.5 w-3.5 animate-spin" />
                                <span>Guardando...</span>
                              </div>
                            ) : isSuccess ? (
                              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Guardado</span>
                              </div>
                            ) : null}
                          </div>
                          <div className="flex w-full flex-wrap items-center gap-x-5 gap-y-2 sm:w-auto sm:flex-col sm:items-start sm:gap-2">
                            <label className="flex min-h-8 items-center gap-2.5 text-sm font-medium text-muted-foreground">
                              <Checkbox
                                checked={isCompleted}
                                onCheckedChange={() => handleToggle(entry.code, 'completed', entry.periodKey)}
                                disabled={loading || isFirebaseReadOnly || isSaving}
                                className="h-5 w-5 shrink-0"
                              />
                              <span className="leading-none">Completado</span>
                            </label>
                            <label className="flex min-h-8 items-center gap-2.5 text-sm font-medium text-muted-foreground">
                              <Checkbox
                                checked={isNoStock}
                                onCheckedChange={() => handleToggle(entry.code, 'hasStock', entry.periodKey)}
                                disabled={loading || isFirebaseReadOnly || isSaving}
                                className="h-5 w-5 shrink-0"
                              />
                              <span className="leading-none">Sin Stock</span>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {showScrollButton && (
            <Button
              variant="outline"
              size="icon"
              className="fixed bottom-20 right-4 h-12 w-12 rounded-full border-primary/20 bg-primary/10 shadow-lg transition-all duration-300 hover:scale-110 hover:border-primary/30 hover:bg-primary/20 hover:shadow-xl sm:bottom-4"
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





