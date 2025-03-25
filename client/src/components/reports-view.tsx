import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { AVAILABLE_BRANCHES } from "@/lib/store";
import { useFirebaseData } from "@/hooks/use-firebase-data";

export function ReportsView() {
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const { data, loading } = useFirebaseData();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"/>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Seleccionar Sucursal" />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_BRANCHES.map((branch) => (
              <SelectItem key={branch} value={branch}>
                {branch}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" className="gap-2">
          <FileDown className="h-4 w-4" />
          Exportar Reporte
        </Button>
      </div>

      {selectedBranch && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total de Comprobantes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {data?.find(b => b.id === selectedBranch)?.totalCompleted || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Códigos con Mayor Diferencia</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Aquí irá el gráfico de códigos con mayor diferencia */}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comparativa de Diferencias</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Aquí irá el gráfico de comparativa */}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}