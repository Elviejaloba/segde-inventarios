import { ReportsView } from "@/components/reports-view";

export default function ReportesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl sm:text-2xl font-bold">Reportes de Ajustes</h1>
        <p className="text-muted-foreground">
          Visualiza los ajustes de inventario por sucursal y período
        </p>
      </div>
      <ReportsView />
    </div>
  );
}
