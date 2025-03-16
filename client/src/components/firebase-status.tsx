import { useState } from 'react';
import { runFirebaseDiagnostics } from '@/lib/firebase-diagnostics';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function FirebaseStatus() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof runFirebaseDiagnostics>> | null>(null);

  const checkConnection = async () => {
    setLoading(true);
    try {
      const diagnosticResult = await runFirebaseDiagnostics();
      setResult(diagnosticResult);
    } catch (error) {
      console.error('Error en diagnóstico:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle2 className="h-5 w-5 text-success" />
    ) : (
      <XCircle className="h-5 w-5 text-destructive" />
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Estado de Firebase</h2>
        <Button
          variant="outline"
          onClick={checkConnection}
          disabled={loading}
        >
          {loading ? <LoadingSpinner /> : 'Verificar Conexión'}
        </Button>
      </div>

      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {result.success ? 'Conexión Exitosa' : 'Problemas de Conexión'}
          </AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span>Configuración:</span>
                {getStatusIcon(result.details.configPresent)}
              </div>
              <div className="flex items-center justify-between">
                <span>Conexión de Red:</span>
                {getStatusIcon(result.details.networkConnected)}
              </div>
              <div className="flex items-center justify-between">
                <span>Lectura de Datos:</span>
                {getStatusIcon(result.details.readSuccess)}
              </div>
              <div className="flex items-center justify-between">
                <span>Escritura de Datos:</span>
                {getStatusIcon(result.details.writeSuccess)}
              </div>
              {result.details.errorLogs.length > 0 && (
                <div className="mt-4 text-sm">
                  <p className="font-semibold">Errores encontrados:</p>
                  <ul className="list-disc pl-4">
                    {result.details.errorLogs.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
