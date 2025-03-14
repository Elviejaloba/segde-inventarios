interface ExportData {
  timestamp: string;
  branch?: string;
  data: any;
}

export function exportToCSV(data: ExportData) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = data.branch 
    ? `reporte_${data.branch}_${timestamp}.csv`
    : `reporte_general_${timestamp}.csv`;

  let csvContent = "";

  if (data.branch) {
    // Export individual branch report
    csvContent = "Código,Completado,Sin Stock\n";
    Object.entries(data.data.items || {}).forEach(([code, status]: [string, any]) => {
      csvContent += `${code},${status.completed ? 'Sí' : 'No'},${!status.hasStock ? 'Sí' : 'No'}\n`;
    });
  } else {
    // Export general ranking report
    csvContent = "Sucursal,Progreso (%),Items Sin Stock\n";
    data.data.forEach((branch: any) => {
      csvContent += `${branch.id},${branch.totalCompleted},${branch.noStock}\n`;
    });
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
