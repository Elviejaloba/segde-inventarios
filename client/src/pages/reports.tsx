import { ReportsView } from "@/components/reports-view";
import { Layout } from "@/components/layout";
import { FileText } from "lucide-react";

export default function Reports() {
  return (
    <Layout hideImport hideBranchSelector>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Análisis de Ajustes por Sucursal
          </h1>
          <p className="text-muted-foreground mt-2">
            Visualización detallada de ajustes y movimientos por sucursal
          </p>
        </div>
        <ReportsView />
      </div>
    </Layout>
  );
}