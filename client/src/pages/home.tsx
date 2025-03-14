import { useState } from "react";
import { Branch, Code, codeSchema } from "@shared/schema";
import { BranchSelector } from "@/components/branch-selector";
import { Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

export default function Home() {
  const [selectedBranch, setSelectedBranch] = useState<Branch>();
  const [items, setItems] = useState<Record<Code, { completed: boolean }>>({});

  const progress = {
    completed: selectedBranch
      ? (Object.values(items).filter((i) => i.completed).length / Object.keys(codeSchema.enum).length) * 100
      : 0,
  };

  const handleShare = () => {
    if (!selectedBranch) return;

    const message = encodeURIComponent(
      `Seguimiento de pedido para sucursal ${selectedBranch}\n\n` +
      "Esta es una herramienta de seguimiento. La comunicación debe realizarse " +
      "vía mail adjuntando el comprobante de toma de inventario del artículo solicitado."
    );

    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleToggle = (code: Code) => {
    setItems(prev => ({
      ...prev,
      [code]: {
        ...prev[code],
        completed: !prev[code]?.completed
      }
    }));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between sticky top-20 bg-background pt-4 pb-4 z-40">
        <BranchSelector value={selectedBranch} onChange={setSelectedBranch} />
        {selectedBranch && (
          <Button onClick={handleShare}>
            <Share className="mr-2 h-4 w-4" />
            Compartir en WhatsApp
          </Button>
        )}
      </div>

      {selectedBranch && (
        <Card>
          <CardHeader>
            <CardTitle>Checklist de {selectedBranch}</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Por favor seleccione los códigos que fueron realizados y comunicados vía mail
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="sticky top-36 bg-background pt-2 pb-4 z-30">
              <h3 className="text-sm font-medium mb-2">Progreso</h3>
              <Progress value={progress.completed} className="h-2" />
              <div className="text-sm text-muted-foreground mt-2">
                {progress.completed.toFixed(0)}% completado
              </div>
            </div>

            <div className="space-y-4">
              {Object.values(codeSchema.enum).map((code) => (
                <div key={code} className="flex items-center gap-4 p-2 rounded hover:bg-accent">
                  <span className="flex-1 font-mono">{code}</span>
                  <Checkbox
                    checked={items[code]?.completed || false}
                    onCheckedChange={() => handleToggle(code)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedBranch && (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Bienvenido al Seguimiento de Muestreos</h2>
          <p className="text-muted-foreground">Por favor seleccione una sucursal para comenzar</p>
        </div>
      )}
    </div>
  );
}