import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';
import { Branch } from '@/lib/store';

interface BranchData {
  id: string;
  totalCompleted: number;
  noStock: number;
  items: Record<string, { completed: boolean; hasStock: boolean }>;
}

export function useFirebaseData() {
  const [data, setData] = useState<BranchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    try {
      // Inicializar datos si es necesario
      storage.initializeData();

      // Suscribirse a cambios en tiempo real
      const unsubscribe = storage.subscribeToData((newData) => {
        setData(newData);
        setLoading(false);
      }, (error) => {
        // Manejo silencioso de errores
        console.error("Error en la sincronización:", error);
        setLoading(false);
      });

      // Cleanup subscription
      return () => unsubscribe();
    } catch (err) {
      console.error("Error loading data:", err);
      setLoading(false);
    }
  }, []);

  const refetch = async () => {
    try {
      const branchData = await storage.getData();
      setData(branchData);
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  };

  return {
    data,
    loading,
    error,
    refetch
  };
}