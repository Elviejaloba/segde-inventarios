import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';
import { AVAILABLE_BRANCHES } from '@/lib/store';

export function useFirebaseData() {
  const [data, setData] = useState(storage.getData());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const branchData = storage.getData();
      setData(branchData);
      storage.startSync();
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Error al cargar los datos");
    } finally {
      setLoading(false);
    }

    return () => {
      storage.stopSync();
    };
  }, []);

  const refetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const branchData = storage.getData();
      setData(branchData);
    } catch (err) {
      console.error("Error refreshing data:", err);
      setError("Error al actualizar los datos");
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