import { useState } from "react";
import * as XLSX from "xlsx";
import { storage, firestore } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, Download } from "lucide-react";

interface ExcelRow {
  [key: string]: string | number | null;
}

interface ProcessedData {
  preview: ExcelRow[];
  summary: {
    sucursal: string;
    comprobante: string;
    fisico: number;
    teorico: number;
    diferencia: number;
  }[];
  detected: {
    sucursalIdx: number | null;
    comprobanteIdx: number | null;
  };
}

const DEF_FISICO_COL_IDX = 8;
const DEF_TEORICO_COL_IDX = 9;
const DEF_DIF_COL_IDX = 11;

const POSSIBLE_SUC_HEADERS = ["sucursal", "sucursal/deposito", "sucursal/depósito", "deposito", "depósito"];
const POSSIBLE_COMP_HEADERS = ["comprobante", "nº comprobante", "numero de comprobante", "número de comprobante", "nro comprobante", "nro. comprobante"];

export default function ImportacionInventario() {
  const [sucursal, setSucursal] = useState("");
  const [fecha, setFecha] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sucursalIdx, setSucursalIdx] = useState("");
  const [comprobanteIdx, setComprobanteIdx] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState("");
  const [documentId, setDocumentId] = useState("");
  const { toast } = useToast();

  const detectColByHeaders = (headers: string[], candidates: string[]): number | null => {
    const normalizedHeaders = headers.map(h => String(h).trim().toLowerCase());
    for (let idx = 0; idx < normalizedHeaders.length; idx++) {
      for (const candidate of candidates) {
        if (normalizedHeaders[idx] === candidate) {
          return idx;
        }
      }
    }
    return null;
  };

  const processExcel = async (fileToProcess: File): Promise<ProcessedData> => {
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

          const headers = jsonData[0] as any[];
          const dataRows = jsonData.slice(1);

          let detectedSucursalIdx = sucursalIdx ? parseInt(sucursalIdx) : detectColByHeaders(headers, POSSIBLE_SUC_HEADERS);
          let detectedComprobanteIdx = comprobanteIdx ? parseInt(comprobanteIdx) : detectColByHeaders(headers, POSSIBLE_COMP_HEADERS);

          const preview: ExcelRow[] = dataRows.slice(0, 200).map((row: any) => {
            const obj: ExcelRow = {};
            headers.forEach((header, idx) => {
              obj[String(header) || `Col_${idx}`] = row[idx] ?? "";
            });
            return obj;
          });

          const aggregationMap = new Map<string, { fisico: number; teorico: number; diferencia: number }>();

          dataRows.forEach((row: any) => {
            const sucursalVal = detectedSucursalIdx !== null ? String(row[detectedSucursalIdx] || sucursal) : sucursal;
            const comprobanteVal = detectedComprobanteIdx !== null ? String(row[detectedComprobanteIdx] || "") : "";
            const key = `${sucursalVal}|${comprobanteVal}`;

            const fisico = parseFloat(row[DEF_FISICO_COL_IDX]) || 0;
            const teorico = parseFloat(row[DEF_TEORICO_COL_IDX]) || 0;
            const diferencia = parseFloat(row[DEF_DIF_COL_IDX]) || 0;

            if (!aggregationMap.has(key)) {
              aggregationMap.set(key, { fisico: 0, teorico: 0, diferencia: 0 });
            }
            const agg = aggregationMap.get(key)!;
            agg.fisico += fisico;
            agg.teorico += teorico;
            agg.diferencia += diferencia;
          });

          const summary = Array.from(aggregationMap.entries()).map(([key, values]) => {
            const [suc, comp] = key.split("|");
            return {
              sucursal: suc,
              comprobante: comp,
              fisico: values.fisico,
              teorico: values.teorico,
              diferencia: values.diferencia
            };
          });

          resolve({
            preview,
            summary,
            detected: {
              sucursalIdx: detectedSucursalIdx,
              comprobanteIdx: detectedComprobanteIdx
            }
          });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Error al leer el archivo"));
      reader.readAsArrayBuffer(fileToProcess);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast({ title: "Error", description: "Selecciona un archivo Excel", variant: "destructive" });
      return;
    }

    if (!sucursal || !fecha) {
      toast({ title: "Error", description: "Completa todos los campos requeridos", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setProcessedData(null);
    setUploadedFileUrl("");
    setDocumentId("");

    try {
      const processed = await processExcel(file);
      setProcessedData(processed);

      const timestamp = Date.now();
      const storagePath = `tomas_inventario/${sucursal}/${fecha}/${timestamp}_${file.name}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, file, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });

      const fileUrl = await getDownloadURL(storageRef);
      setUploadedFileUrl(fileUrl);

      const metadata = {
        sucursal,
        fecha,
        fileName: file.name,
        filePath: storagePath,
        fileUrl,
        detected: processed.detected,
        rowsSample: processed.preview.slice(0, 20),
        summary: processed.summary,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(firestore, "tomas_inventario"), metadata);
      setDocumentId(docRef.id);

      toast({
        title: "Éxito",
        description: `Archivo procesado y guardado correctamente. ID: ${docRef.id}`
      });
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al procesar el archivo",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Importación de Toma de Inventario</h1>
        <p className="text-muted-foreground mt-2">
          Suba archivos Excel con la toma de inventario para análisis y almacenamiento
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Cargar archivo Excel
          </CardTitle>
          <CardDescription>
            Complete los datos y seleccione el archivo .xlsx para procesar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sucursal">Sucursal *</Label>
                <Input
                  id="sucursal"
                  data-testid="input-sucursal"
                  value={sucursal}
                  onChange={(e) => setSucursal(e.target.value)}
                  placeholder="Ej: San Juan"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha de Toma *</Label>
                <Input
                  id="fecha"
                  data-testid="input-fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Archivo Excel (.xlsx) *</Label>
                <Input
                  id="file"
                  data-testid="input-file"
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sucursalIdx" className="text-sm text-muted-foreground">
                  Índice columna Sucursal (opcional)
                </Label>
                <Input
                  id="sucursalIdx"
                  data-testid="input-sucursal-idx"
                  value={sucursalIdx}
                  onChange={(e) => setSucursalIdx(e.target.value)}
                  placeholder="auto"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comprobanteIdx" className="text-sm text-muted-foreground">
                  Índice columna Nº Comprobante (opcional)
                </Label>
                <Input
                  id="comprobanteIdx"
                  data-testid="input-comprobante-idx"
                  value={comprobanteIdx}
                  onChange={(e) => setComprobanteIdx(e.target.value)}
                  placeholder="auto"
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="submit"
                  data-testid="button-submit"
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>Procesando...</>
                  ) : (
                    <>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Subir y Analizar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {processedData && (
        <div className="space-y-6">
          {documentId && (
            <Card className="bg-green-50 dark:bg-green-950">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Archivo guardado exitosamente</p>
                    <p className="text-sm text-muted-foreground">ID del documento: {documentId}</p>
                  </div>
                  {uploadedFileUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(uploadedFileUrl, "_blank")}
                      data-testid="button-download"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Descargar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Resumen por Sucursal / Comprobante</CardTitle>
              <CardDescription>
                Agregaciones de stock físico, teórico y diferencias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" data-testid="table-summary">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left px-3 py-2 font-semibold">Sucursal</th>
                      <th className="text-left px-3 py-2 font-semibold">Comprobante</th>
                      <th className="text-right px-3 py-2 font-semibold">Stock Físico</th>
                      <th className="text-right px-3 py-2 font-semibold">Stock Teórico</th>
                      <th className="text-right px-3 py-2 font-semibold">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedData.summary.map((row, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="px-3 py-2">{row.sucursal}</td>
                        <td className="px-3 py-2">{row.comprobante}</td>
                        <td className="px-3 py-2 text-right">{row.fisico.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{row.teorico.toFixed(2)}</td>
                        <td className={`px-3 py-2 text-right font-medium ${row.diferencia !== 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                          {row.diferencia.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vista Previa (primeras 200 filas)</CardTitle>
              <CardDescription>
                Datos del archivo Excel tal como fueron cargados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full border-collapse text-sm" data-testid="table-preview">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b">
                      {processedData.preview.length > 0 &&
                        Object.keys(processedData.preview[0]).map((col) => (
                          <th key={col} className="text-left px-2 py-1 font-semibold text-xs whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {processedData.preview.map((row, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        {Object.values(row).map((cell, cellIdx) => (
                          <td key={cellIdx} className="px-2 py-1 text-xs whitespace-nowrap">
                            {String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {processedData.detected && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Información de Detección</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs text-muted-foreground bg-muted p-4 rounded overflow-auto">
                  {JSON.stringify(
                    {
                      sucursalIdx: processedData.detected.sucursalIdx,
                      comprobanteIdx: processedData.detected.comprobanteIdx,
                      documentId,
                      fileUrl: uploadedFileUrl ? "✓ Disponible" : "No disponible"
                    },
                    null,
                    2
                  )}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
