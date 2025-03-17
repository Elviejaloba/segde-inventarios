import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';
import { AVAILABLE_BRANCHES } from '@/lib/store';

export function useFirebaseData() {
  const [data, setData] = useState([]); // Initialize empty to avoid undefined
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    try {
      // Inicializar datos si es necesario
      storage.initializeData();

      // Suscribirse a cambios en tiempo real
      storage.subscribeToData((newData) => {
        setData(newData);
        setLoading(false);
      });
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Error al cargar los datos");
      setLoading(false);
    }
  }, []);

  const refetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const branchData = await storage.getData();
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