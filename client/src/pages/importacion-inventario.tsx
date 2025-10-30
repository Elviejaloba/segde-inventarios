import { useState } from "react";
import * as XLSX from "xlsx";
import { storage, firestore } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AVAILABLE_BRANCHES } from "@/lib/store";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ComprobanteAnalysis } from "@shared/schema";

interface ExcelRow {
  [key: string]: string | number | null;
}

interface AnalysisResult {
  preview: ExcelRow[];
  totalRows: number;
  totalPhysical: number;
  totalTheoretical: number;
  totalDifference: number;
  differencePct: number;
  comprobantes: ComprobanteAnalysis[];
}

const DEF_FISICO_COL_IDX = 8;   // Columna I
const DEF_TEORICO_COL_IDX = 9;  // Columna J
const DEF_DIF_COL_IDX = 11;     // Columna L

const POSSIBLE_COMP_HEADERS = ["comprobante", "nº comprobante", "numero de comprobante", "número de comprobante", "nro comprobante", "nro. comprobante", "n° comprobante"];

export default function ImportacionInventario() {
  const [sucursal, setSucursal] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const getCurrentDate = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const detectComprobanteColumn = (headers: string[]): number | null => {
    const normalizedHeaders = headers.map(h => String(h).trim().toLowerCase());
    for (let idx = 0; idx < normalizedHeaders.length; idx++) {
      for (const candidate of POSSIBLE_COMP_HEADERS) {
        if (normalizedHeaders[idx] === candidate) {
          return idx;
        }
      }
    }
    return null;
  };

  const calculateStats = (values: number[]): { avg: number; variance: number } => {
    if (values.length === 0) return { avg: 0, variance: 0 };
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    return { avg, variance };
  };

  const processExcelWithAnalysis = async (fileToProcess: File): Promise<AnalysisResult> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any;

          if (jsonData.length === 0) {
            reject(new Error("El archivo está vacío"));
            return;
          }

          const headers = jsonData[0] as unknown as any[];
          const dataRows = jsonData.slice(1) as unknown as any[];

          // Detectar columna de comprobante
          const comprobanteIdx = detectComprobanteColumn(headers);

          // Preview de filas
          const preview: ExcelRow[] = dataRows.slice(0, 20).map((row: any) => {
            const obj: ExcelRow = {};
            headers.forEach((header, idx) => {
              obj[String(header) || `Col_${idx}`] = row[idx] ?? "";
            });
            return obj;
          });

          // Análisis por comprobante
          const comprobanteMap = new Map<string, {
            physical: number[];
            theoretical: number[];
            differences: number[];
          }>();

          let totalPhysical = 0;
          let totalTheoretical = 0;
          let totalDifference = 0;

          dataRows.forEach((row: any) => {
            const comprobante = comprobanteIdx !== null ? String(row[comprobanteIdx] || "Sin comprobante") : "Sin comprobante";
            const fisico = parseFloat(row[DEF_FISICO_COL_IDX]) || 0;
            const teorico = parseFloat(row[DEF_TEORICO_COL_IDX]) || 0;
            const diferencia = parseFloat(row[DEF_DIF_COL_IDX]) || 0;

            if (!comprobanteMap.has(comprobante)) {
              comprobanteMap.set(comprobante, {
                physical: [],
                theoretical: [],
                differences: []
              });
            }

            const compData = comprobanteMap.get(comprobante)!;
            compData.physical.push(fisico);
            compData.theoretical.push(teorico);
            compData.differences.push(diferencia);

            totalPhysical += fisico;
            totalTheoretical += teorico;
            totalDifference += diferencia;
          });

          // Calcular análisis por comprobante
          const comprobantes: ComprobanteAnalysis[] = Array.from(comprobanteMap.entries()).map(([comprobante, data]) => {
            const sumPhysical = data.physical.reduce((a, b) => a + b, 0);
            const sumTheoretical = data.theoretical.reduce((a, b) => a + b, 0);
            const sumDifference = data.differences.reduce((a, b) => a + b, 0);
            const { avg: avgDifference, variance } = calculateStats(data.differences);
            
            // Contar outliers (diferencias >10% del teórico)
            const outliers = data.differences.filter((diff, idx) => {
              const teorico = data.theoretical[idx];
              return teorico > 0 && Math.abs(diff / teorico) > 0.1;
            }).length;

            const differencePct = sumTheoretical !== 0 ? (sumDifference / sumTheoretical) * 100 : 0;

            return {
              comprobante,
              totalPhysical: sumPhysical,
              totalTheoretical: sumTheoretical,
              totalDifference: sumDifference,
              differencePct,
              rowCount: data.physical.length,
              avgDifference,
              variance,
              outliers
            };
          });

          const differencePct = totalTheoretical !== 0 ? (totalDifference / totalTheoretical) * 100 : 0;

          resolve({
            preview,
            totalRows: dataRows.length,
            totalPhysical,
            totalTheoretical,
            totalDifference,
            differencePct,
            comprobantes
          });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Error al leer el archivo"));
      reader.readAsArrayBuffer(fileToProcess);
    });
  };

  const updateBranchSummary = async (sucursal: string, analysis: AnalysisResult) => {
    const { runTransaction } = await import("firebase/firestore");
    const summaryRef = doc(firestore, "branch_summaries", sucursal);

    try {
      await runTransaction(firestore, async (transaction) => {
        const summaryDoc = await transaction.get(summaryRef);

        if (summaryDoc.exists()) {
          const existing = summaryDoc.data();
          const newTotalPhysical = existing.totalPhysical + analysis.totalPhysical;
          const newTotalTheoretical = existing.totalTheoretical + analysis.totalTheoretical;
          const newTotalDifference = existing.totalDifference + analysis.totalDifference;
          const newDifferencePct = newTotalTheoretical !== 0 
            ? (newTotalDifference / newTotalTheoretical) * 100 
            : 0;

          transaction.update(summaryRef, {
            totalPhysical: newTotalPhysical,
            totalTheoretical: newTotalTheoretical,
            totalDifference: newTotalDifference,
            differencePct: newDifferencePct,
            capturesCount: existing.capturesCount + 1,
            comprobantesProcessed: existing.comprobantesProcessed + analysis.comprobantes.length,
            lastUpdated: serverTimestamp()
          });
        } else {
          transaction.set(summaryRef, {
            sucursal,
            totalPhysical: analysis.totalPhysical,
            totalTheoretical: analysis.totalTheoretical,
            totalDifference: analysis.totalDifference,
            differencePct: analysis.differencePct,
            capturesCount: 1,
            comprobantesProcessed: analysis.comprobantes.length,
            lastUpdated: serverTimestamp()
          });
        }
      });
    } catch (error) {
      console.error("Error actualizando resumen de sucursal:", error);
      throw new Error("No se pudo actualizar el consolidado. Intenta nuevamente.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast({ title: "Error", description: "Selecciona un archivo Excel", variant: "destructive" });
      return;
    }

    if (!sucursal) {
      toast({ title: "Error", description: "Selecciona una sucursal", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setAnalysisResult(null);

    try {
      const analysis = await processExcelWithAnalysis(file);
      setAnalysisResult(analysis);

      const fecha = getCurrentDate();
      const timestamp = Date.now();
      const storagePath = `tomas_inventario/${sucursal}/${fecha.replace(/\//g, '-')}/${timestamp}_${file.name}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, file, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });

      const fileUrl = await getDownloadURL(storageRef);

      const inventoryData = {
        sucursal,
        fecha,
        fileName: file.name,
        fileUrl,
        totalRows: analysis.totalRows,
        totalPhysical: analysis.totalPhysical,
        totalTheoretical: analysis.totalTheoretical,
        totalDifference: analysis.totalDifference,
        differencePct: analysis.differencePct,
        comprobantes: analysis.comprobantes,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(firestore, "inventory_analysis"), inventoryData);

      // Actualizar resumen de sucursal
      await updateBranchSummary(sucursal, analysis);

      toast({
        title: "Análisis completado",
        description: `Se procesaron ${analysis.totalRows} filas con ${analysis.comprobantes.length} comprobantes`,
      });

      console.log("Análisis guardado con ID:", docRef.id);
    } catch (error) {
      console.error("Error procesando archivo:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al procesar el archivo",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx')) {
        toast({
          title: "Formato incorrecto",
          description: "Solo se permiten archivos .xlsx",
          variant: "destructive"
        });
        return;
      }
      setFile(selectedFile);
      setAnalysisResult(null);
    }
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-6 w-6" />
            Cargar archivo Excel
          </CardTitle>
          <CardDescription>
            Complete los datos y seleccione el archivo .xlsx para procesar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Sucursal */}
              <div className="space-y-2">
                <Label htmlFor="sucursal">
                  Sucursal <span className="text-red-500">*</span>
                </Label>
                <Select value={sucursal} onValueChange={setSucursal}>
                  <SelectTrigger id="sucursal" data-testid="select-sucursal">
                    <SelectValue placeholder="Ej: San Juan" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_BRANCHES.map((branch) => (
                      <SelectItem key={branch} value={branch} data-testid={`option-sucursal-${branch}`}>
                        {branch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fecha de Toma (solo lectura) */}
              <div className="space-y-2">
                <Label htmlFor="fecha">
                  Fecha de Toma <span className="text-red-500">*</span>
                </Label>
                <div 
                  className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
                  data-testid="text-fecha"
                >
                  {getCurrentDate()}
                </div>
              </div>

              {/* Archivo Excel */}
              <div className="space-y-2">
                <Label htmlFor="file">
                  Archivo Excel (.xlsx) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <input
                    id="file"
                    type="file"
                    accept=".xlsx"
                    onChange={handleFileChange}
                    className="hidden"
                    data-testid="input-file"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('file')?.click()}
                    className="w-full justify-start text-left font-normal"
                    data-testid="button-select-file"
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    {file ? file.name : "Seleccionar archivo"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Botón de Subir */}
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isProcessing || !file || !sucursal}
                className="w-full md:w-auto"
                data-testid="button-submit"
              >
                {isProcessing ? "Analizando..." : "Subir y Analizar"}
              </Button>
            </div>
          </form>

          {/* Análisis de resultados */}
          {analysisResult && (
            <div className="mt-8 space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Stock Físico</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="kpi-physical">
                      {analysisResult.totalPhysical.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Stock Teórico</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="kpi-theoretical">
                      {analysisResult.totalTheoretical.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Diferencia</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <div className={`text-2xl font-bold ${analysisResult.totalDifference >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="kpi-difference">
                        {analysisResult.totalDifference.toLocaleString()}
                      </div>
                      {analysisResult.totalDifference >= 0 ? <TrendingUp className="h-5 w-5 text-green-600" /> : <TrendingDown className="h-5 w-5 text-red-600" />}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>% Diferencia</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${analysisResult.differencePct >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="kpi-percentage">
                      {analysisResult.differencePct.toFixed(2)}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráfico de comprobantes */}
              {analysisResult.comprobantes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Análisis por Comprobante
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analysisResult.comprobantes}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="comprobante" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="totalPhysical" fill="#10b981" name="Físico" />
                        <Bar dataKey="totalTheoretical" fill="#3b82f6" name="Teórico" />
                        <Bar dataKey="totalDifference" fill="#f59e0b" name="Diferencia" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Tabla de comprobantes */}
              {analysisResult.comprobantes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Detalle por Comprobante</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Comprobante</TableHead>
                            <TableHead className="text-right">Físico</TableHead>
                            <TableHead className="text-right">Teórico</TableHead>
                            <TableHead className="text-right">Diferencia</TableHead>
                            <TableHead className="text-right">% Dif</TableHead>
                            <TableHead className="text-right">Filas</TableHead>
                            <TableHead className="text-right">Outliers</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analysisResult.comprobantes.map((comp, idx) => (
                            <TableRow key={idx} data-testid={`row-comprobante-${idx}`}>
                              <TableCell className="font-medium">{comp.comprobante}</TableCell>
                              <TableCell className="text-right">{comp.totalPhysical.toLocaleString()}</TableCell>
                              <TableCell className="text-right">{comp.totalTheoretical.toLocaleString()}</TableCell>
                              <TableCell className={`text-right ${comp.totalDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {comp.totalDifference.toLocaleString()}
                              </TableCell>
                              <TableCell className={`text-right ${comp.differencePct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {comp.differencePct.toFixed(2)}%
                              </TableCell>
                              <TableCell className="text-right">{comp.rowCount}</TableCell>
                              <TableCell className="text-right">
                                {comp.outliers > 0 && (
                                  <span className="text-amber-600 font-semibold">{comp.outliers}</span>
                                )}
                                {comp.outliers === 0 && <span className="text-muted-foreground">0</span>}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Muestreo de datos */}
              <Card>
                <CardHeader>
                  <CardTitle>Muestreo de datos</CardTitle>
                  <CardDescription>
                    Mostrando las primeras 20 filas de {analysisResult.totalRows} totales
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-auto max-h-96">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          {analysisResult.preview.length > 0 && 
                            Object.keys(analysisResult.preview[0]).map((header, idx) => (
                              <TableHead key={idx} className="whitespace-nowrap bg-background">
                                {header}
                              </TableHead>
                            ))
                          }
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysisResult.preview.map((row, rowIdx) => (
                          <TableRow key={rowIdx}>
                            {Object.values(row).map((cell, cellIdx) => (
                              <TableCell key={cellIdx} className="whitespace-nowrap">
                                {String(cell || "")}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
