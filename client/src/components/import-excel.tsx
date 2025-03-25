import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { importExcelToFirebase } from '@/lib/import-excel';
import { motion } from "framer-motion";

export function ImportExcel() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      await importExcelToFirebase(file);
      toast({
        title: "Importación exitosa",
        description: "Los datos han sido cargados a Firebase.",
      });
    } catch (error) {
      console.error('Error al importar:', error);
      toast({
        title: "Error en la importación",
        description: "No se pudieron importar los datos. Por favor, intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <input
        type="file"
        accept=".xlsx"
        onChange={handleFileUpload}
        className="hidden"
        id="excel-upload"
        disabled={loading}
      />
      <label
        htmlFor="excel-upload"
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer ${
          loading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {loading ? (
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"
          />
        ) : (
          'Cargar datos de prueba'
        )}
      </label>
    </div>
  );
}