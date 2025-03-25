import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { importExcelToFirebase } from '@/lib/import-excel';
import { LoadingMascot } from '@/components/ui/loading-mascot';

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
        description: "Los datos han sido importados correctamente.",
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
    <div className="flex flex-col items-center gap-4 p-4">
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
          <LoadingMascot size="sm" />
        ) : (
          '📄 Seleccionar archivo Excel'
        )}
      </label>
      {loading && <p className="text-sm text-muted-foreground">Importando datos...</p>}
    </div>
  );
}
