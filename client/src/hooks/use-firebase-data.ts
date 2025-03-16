import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AVAILABLE_BRANCHES } from '@/lib/store';

interface BranchData {
  id: string;
  totalCompleted: number;
  noStock: number;
  items: Record<string, { completed: boolean; hasStock: boolean }>;
}

// Cache implementation
const cache = new Map<string, { data: BranchData[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useFirebaseData() {
  const [data, setData] = useState<BranchData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchData = async (useCache = true) => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      if (useCache) {
        const cachedData = cache.get('branchData');
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
          setData(cachedData.data);
          setLoading(false);
          return;
        }
      }

      const branchesRef = collection(db, "branches");
      const snapshot = await getDocs(branchesRef);
      
      const branchData = snapshot.docs
        .filter(doc => AVAILABLE_BRANCHES.includes(doc.id))
        .map(doc => ({
          id: doc.id,
          totalCompleted: doc.data().totalCompleted || 0,
          noStock: doc.data().noStock || 0,
          items: doc.data().items || {}
        }));

      // Update cache
      cache.set('branchData', {
        data: branchData,
        timestamp: Date.now()
      });

      setData(branchData);
      setRetryCount(0);
    } catch (err) {
      console.error("Error fetching data:", err);
      
      if (retryCount < 3) {
        // Exponential backoff retry
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchData(false);
        }, delay);
      } else {
        setError("Error al cargar los datos. Por favor, intente nuevamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: () => fetchData(false)
  };
}
