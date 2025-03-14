import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useState } from "react";

interface ExportButtonProps {
  onExport: () => Promise<void>;
  variant?: "outline" | "default";
}

export function ExportButton({ onExport, variant = "outline" }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant={variant}
      onClick={handleExport}
      disabled={isExporting}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      {isExporting ? "Exportando..." : "Exportar Reporte"}
    </Button>
  );
}
