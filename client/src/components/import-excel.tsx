import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { importExcelToFirebase } from '@/lib/import-excel';
import { motion } from "framer-motion";

interface ImportExcelProps {
  isHidden?: boolean;
}

export function ImportExcel({ isHidden = false }: ImportExcelProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Si isHidden es true, no renderizar nada
  if (isHidden) return null;

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
    }
  };

  // Si no estamos en modo oculto, renderizar el componente
  return isHidden ? null : (
    <div className="fixed bottom-4 right-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <input
        type="file"
        accept=".xlsx"
        onChange={handleFileUpload}
        className="hidden"
        id="excel-upload"
        disabled={loading}
      />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Aquí está el botón que necesitamos ocultar/mostrar */}
        {!isHidden && (
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
              'Cargar datos de Excel'
            )}
          </label>
        )}
      </motion.div>
    </div>
  );
}