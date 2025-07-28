import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';
import { useSeasonStore, type Season } from '@/lib/store';

interface BranchData {
  id: string;
  totalCompleted: number;
  noStock: number;
  items: Record<string, { completed: boolean; hasStock: boolean; lastUpdated?: number }>;
  lastUpdated?: number;
}

export function useSeasonData() {
  const { currentSeason } = useSeasonStore();
  const [data, setData] = useState<BranchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    const initAndSubscribe = async () => {
      try {
        setLoading(true);
        setError(null);

        // Establecer la suscripción en tiempo real para la temporada actual
        unsubscribe = storage.subscribeToSeasonData(currentSeason, (newData) => {
          if (isMounted) {
            // Ordenar los datos por lastUpdated para mostrar los cambios más recientes
            const sortedData = [...newData].sort((a, b) => 
              (b.lastUpdated || 0) - (a.lastUpdated || 0)
            );
            setData(sortedData);
            setLoading(false);
            setError(null);
          }
        });
      } catch (error) {
        console.error('Error in Season data sync:', error);
        if (isMounted) {
          setError('Error al sincronizar con los datos de temporada');
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
  }, [currentSeason]); // Re-subscribe when season changes

  const updateSeasonBranch = async (branchId: string, data: Partial<BranchData>) => {
    try {
      await storage.updateSeasonBranch(currentSeason, branchId as any, data);
    } catch (error) {
      console.error('Error updating season branch:', error);
      throw error;
    }
  };

  const refetch = async () => {
    try {
      setLoading(true);
      // Force re-initialization by unsubscribing and resubscribing
      setError(null);
    } catch (error) {
      console.error('Error refetching season data:', error);
      setError('Error al actualizar los datos de temporada');
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    error,
    refetch,
    updateSeasonBranch,
    currentSeason
  };
}