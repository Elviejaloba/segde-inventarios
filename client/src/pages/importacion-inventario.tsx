import { useState } from "react";
import * as XLSX from "xlsx";
import { storage, firestore } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AVAILABLE_BRANCHES } from "@/lib/store";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ExcelRow {
  [key: string]: string | number | null;
}

interface ProcessedData {
  preview: ExcelRow[];
  totalRows: number;
}

const DEF_FISICO_COL_IDX = 8;
const DEF_TEORICO_COL_IDX = 9;
const DEF_DIF_COL_IDX = 11;

export default function ImportacionInventario() {
  const [sucursal, setSucursal] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const { toast } = useToast();

  const getCurrentDate = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
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

          const headers = jsonData[0] as unknown as any[];
          const dataRows = jsonData.slice(1) as unknown as any[];

          const preview: ExcelRow[] = dataRows.slice(0, 20).map((row: any) => {
            const obj: ExcelRow = {};
            headers.forEach((header, idx) => {
              obj[String(header) || `Col_${idx}`] = row[idx] ?? "";
            });
            return obj;
          });

          resolve({
            preview,
            totalRows: dataRows.length
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

    if (!sucursal) {
      toast({ title: "Error", description: "Selecciona una sucursal", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setProcessedData(null);

    try {
      const processed = await processExcel(file);
      setProcessedData(processed);

      const fecha = getCurrentDate();
      const timestamp = Date.now();
      const storagePath = `tomas_inventario/${sucursal}/${fecha.replace(/\//g, '-')}/${timestamp}_${file.name}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, file, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });

      const fileUrl = await getDownloadURL(storageRef);

      const metadata = {
        sucursal,
        fecha,
        fileName: file.name,
        filePath: storagePath,
        fileUrl,
        totalRows: processed.totalRows,
        sampleRows: processed.preview.slice(0, 10),
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(firestore, "tomas_inventario"), metadata);

      toast({
        title: "Archivo subido exitosamente",
        description: `Se procesaron ${processed.totalRows} filas para ${sucursal}`,
      });

      console.log("Documento guardado con ID:", docRef.id);
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
      setProcessedData(null);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
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
                {isProcessing ? "Procesando..." : "Subir y Analizar"}
              </Button>
            </div>
          </form>

          {/* Muestreo de datos */}
          {processedData && (
            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Muestreo de datos</h3>
                <p className="text-sm text-muted-foreground">
                  {processedData.totalRows} filas procesadas
                </p>
              </div>
              
              <div className="border rounded-lg overflow-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {processedData.preview.length > 0 && 
                        Object.keys(processedData.preview[0]).map((header, idx) => (
                          <TableHead key={idx} className="whitespace-nowrap">
                            {header}
                          </TableHead>
                        ))
                      }
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedData.preview.map((row, rowIdx) => (
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
              
              <p className="text-sm text-muted-foreground text-center">
                Mostrando las primeras 20 filas de {processedData.totalRows} totales
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
