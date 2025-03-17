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

  useEffect(() => {
    let isMounted = true;

    const initAndSubscribe = async () => {
      try {
        await storage.initializeData();
        storage.subscribeToData((newData) => {
          if (isMounted) {
            setData(newData);
            setLoading(false);
          }
        });
      } catch (error) {
        console.error('Error in Firebase sync:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAndSubscribe();

    return () => {
      isMounted = false;
    };
  }, []);

  const refetch = async () => {
    try {
      await storage.initializeData();
    } catch (error) {
      console.error('Error refetching data:', error);
    }
  };

  return {
    data,
    loading,
    error: null,
    refetch
  };
}