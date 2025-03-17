import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';

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
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    const initAndSubscribe = async () => {
      try {
        await storage.initializeData();

        // Establecer la suscripción en tiempo real
        unsubscribe = storage.subscribeToData((newData) => {
          if (isMounted) {
            console.log('Datos actualizados recibidos:', newData);
            setData(newData);
            setLoading(false);
            setError(null);
          }
        });
      } catch (error) {
        console.error('Error in Firebase sync:', error);
        if (isMounted) {
          setError('Error al sincronizar con la base de datos');
          setLoading(false);
        }
      }
    };

    initAndSubscribe();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const refetch = async () => {
    try {
      setLoading(true);
      await storage.initializeData();
      setError(null);
    } catch (error) {
      console.error('Error refetching data:', error);
      setError('Error al actualizar los datos');
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    error,
    refetch
  };
}