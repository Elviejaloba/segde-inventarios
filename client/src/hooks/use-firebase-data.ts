import { useState, useEffect } from 'react';
import { onSnapshot, collection, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { storage } from '@/lib/storage';
import { AVAILABLE_BRANCHES } from '@/lib/store';

export function useFirebaseData() {
  const [data, setData] = useState(storage.getData());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);

    // Crear una referencia a la colección de datos
    const branchesRef = collection(db, 'branches');
    const q = query(branchesRef);

    // Suscribirse a cambios en tiempo real
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        try {
          const branchData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Actualizar el storage local y el estado
          branchData.forEach(branch => {
            storage.updateBranch(branch.id, branch);
          });

          setData(storage.getData());
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error("Error processing snapshot:", err);
          setError("Error al procesar los datos");
        }
      },
      (err) => {
        console.error("Error en snapshot:", err);
        setError("Error en la conexión en tiempo real");
        setLoading(false);
      }
    );

    // Limpiar suscripción al desmontar
    return () => unsubscribe();
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