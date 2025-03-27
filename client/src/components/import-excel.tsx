import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { importExcelToFirebase } from '@/lib/import-excel';
import { motion } from "framer-motion";

interface ImportExcelProps {
  isHidden?: boolean;
}

export function ImportExcel({ isHidden = false }: ImportExcelProps) {
  // No renderizar nada si isHidden es true
  if (isHidden) return null;

  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      await importExcelToFirebase(file);
      toast({
        title: "¡Datos cargados!",
        description: "Los datos se han importado correctamente",
      });
    } catch (error) {
      console.error('Error al importar:', error);
      toast({
        title: "Error en la importación",
        description: "No se pudieron cargar los datos. Por favor, intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      // Limpiar el input después de la carga
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <div className="hidden">
      <input
        type="file"
        accept=".xlsx"
        onChange={handleFileUpload}
        className="hidden"
        id="excel-upload"
        disabled={loading}
      />
    </div>
  );
}