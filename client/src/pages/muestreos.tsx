import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Upload, FileText, Download, ExternalLink, FolderOpen, RefreshCw, Eye, EyeOff, CheckCircle2, Loader2, AlertTriangle, ThumbsUp, Clock, Search, ChevronDown, ChevronUp, Package } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DropboxFile {
  id: string;
  name: string;
  path: string;
  size: number;
  modified: string;
  sharedLink?: string;
  sucursal?: string;
}

type FileStatus = "no_visto" | "visto" | "analizado" | "sin_diferencias" | "revisar";

const STATUS_CONFIG: Record<FileStatus, { label: string; color: string; bgColor: string; icon: typeof Eye }> = {
  no_visto: { label: "No visto", color: "text-gray-500", bgColor: "bg-gray-100 dark:bg-gray-800", icon: EyeOff },
  visto: { label: "Visto", color: "text-blue-500", bgColor: "bg-blue-100 dark:bg-blue-900/30", icon: Eye },
  analizado: { label: "Analizado", color: "text-green-500", bgColor: "bg-green-100 dark:bg-green-900/30", icon: CheckCircle2 },
  sin_diferencias: { label: "Sin diferencias", color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-900/30", icon: ThumbsUp },
  revisar: { label: "Revisar", color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30", icon: AlertTriangle },
};

function getFileStatuses(): Record<string, FileStatus> {
  try {
    const stored = localStorage.getItem('muestreos_status');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setFileStatus(fileId: string, status: FileStatus) {
  const statuses = getFileStatuses();
  statuses[fileId] = status;
  localStorage.setItem('muestreos_status', JSON.stringify(statuses));
}

const BRANCHES = [
  "T.Mendoza",
  "T.Sjuan", 
  "T.SLuis",
  "Crisa2",
  "T.S.Martin",
  "T.Tunuyan",
  "T.Lujan",
  "T.Maipu",
  "T.Srafael",
  "Ctro. de Distribucion"
];

function extractSucursalFromName(fileName: string): string | undefined {
  for (const branch of BRANCHES) {
    if (fileName.includes(`[${branch}]`)) {
      return branch;
    }
  }
  return undefined;
}

function extractCodigoFromName(fileName: string): string | null {
  const match = fileName.match(/(?:MUESTREO|muestreo)[_\s-]+(.+?)\.(?:doc|docx|pdf|xlsx?)$/i);
  if (!match) return null;
  let raw = match[1].replace(/_/g, ' ').trim();
  raw = raw.replace(/^\d{4}-\d{2}-\d{2}T[\d-]+Z[_\s]*/i, '');
  return raw || null;
}

interface FileContenido {
  codigos: { codigo: string; descripcion: string; cantidad?: string; saldo?: string; diferencia?: string }[];
  totalCodigos: number;
  comprobante?: string;
  observaciones?: string;
  sucursal?: string;
  tipoArchivo: string;
  error?: string;
}

export default function MuestreosPage() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filterBranch, setFilterBranch] = useState<string>("");
  const [fileStatuses, setFileStatuses] = useState<Record<string, FileStatus>>(getFileStatuses);
  const [loadingLinks, setLoadingLinks] = useState<Record<string, boolean>>({});
  const [cachedLinks, setCachedLinks] = useState<Record<string, string>>({});
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [loadingContenido, setLoadingContenido] = useState<Record<string, boolean>>({});
  const [cachedContenido, setCachedContenido] = useState<Record<string, FileContenido>>({});

  const { data: ultimaActualizacion } = useQuery<{ costos_fecha: string; ventas_fecha: string }>({
    queryKey: ['/api/ultima-actualizacion'],
    queryFn: async () => {
      const response = await fetch('/api/ultima-actualizacion');
      if (!response.ok) throw new Error('Error');
      return response.json();
    },
    refetchInterval: 300000,
  });

  const cycleStatus = (fileId: string) => {
    const currentStatus = fileStatuses[fileId] || "no_visto";
    const statusOrder: FileStatus[] = ["no_visto", "visto", "analizado", "sin_diferencias", "revisar"];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    setFileStatus(fileId, nextStatus);
    setFileStatuses(prev => ({ ...prev, [fileId]: nextStatus }));
  };

  const toggleContenido = useCallback(async (file: DropboxFile) => {
    if (expandedFile === file.id) {
      setExpandedFile(null);
      return;
    }

    setExpandedFile(file.id);

    if (cachedContenido[file.id]) return;

    const ext = file.name.toLowerCase().split('.').pop();
    if (!ext || !['doc', 'docx'].includes(ext)) {
      setCachedContenido(prev => ({
        ...prev,
        [file.id]: { codigos: [], totalCodigos: 0, tipoArchivo: ext || '', error: 'Solo archivos Word (.doc/.docx)' }
      }));
      return;
    }

    setLoadingContenido(prev => ({ ...prev, [file.id]: true }));
    try {
      const response = await fetch(`/api/muestreos/${file.id}/contenido?path=${encodeURIComponent(file.path)}`);
      if (!response.ok) throw new Error('Error al analizar');
      const data: FileContenido = await response.json();
      setCachedContenido(prev => ({ ...prev, [file.id]: data }));
    } catch (error) {
      setCachedContenido(prev => ({
        ...prev,
        [file.id]: { codigos: [], totalCodigos: 0, tipoArchivo: ext || '', error: 'Error al analizar el archivo' }
      }));
    } finally {
      setLoadingContenido(prev => ({ ...prev, [file.id]: false }));
    }
  }, [expandedFile, cachedContenido]);

  const openFileLink = useCallback(async (file: DropboxFile, action: 'view' | 'download') => {
    if (file.sharedLink || cachedLinks[file.id]) {
      const link = file.sharedLink || cachedLinks[file.id];
      if (action === 'download') {
        window.open(link.replace('?raw=1', '?dl=1'), '_blank');
      } else {
        window.open(link, '_blank');
      }
      return;
    }

    setLoadingLinks(prev => ({ ...prev, [file.id]: true }));
    try {
      const response = await fetch(`/api/muestreos/${file.id}/link?path=${encodeURIComponent(file.path)}`);
      if (!response.ok) throw new Error('Failed to get link');
      const { link } = await response.json();
      setCachedLinks(prev => ({ ...prev, [file.id]: link }));
      if (action === 'download') {
        window.open(link.replace('?raw=1', '?dl=1'), '_blank');
      } else {
        window.open(link, '_blank');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo obtener el enlace del archivo",
        variant: "destructive",
      });
    } finally {
      setLoadingLinks(prev => ({ ...prev, [file.id]: false }));
    }
  }, [cachedLinks, toast]);

  const { data: files = [], isLoading: filesLoading, refetch: refetchFiles } = useQuery<DropboxFile[]>({
    queryKey: ['/api/muestreos'],
    queryFn: async () => {
      const response = await fetch('/api/muestreos');
      if (!response.ok) throw new Error('Failed to fetch files');
      return response.json();
    },
  });

  const filesWithSucursal = files.map(file => ({
    ...file,
    sucursal: extractSucursalFromName(file.name)
  }));

  const filteredFiles = filterBranch 
    ? filesWithSucursal.filter(f => f.sucursal === filterBranch)
    : filesWithSucursal;

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setUploadProgress(10);
      const response = await fetch('/api/muestreos/upload', {
        method: 'POST',
        body: formData,
      });
      setUploadProgress(90);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setUploadProgress(100);
      toast({
        title: "Archivo subido exitosamente",
        description: `${data.name} se ha guardado correctamente`,
        variant: "success",
      });
      setSelectedFile(null);
      setSelectedBranch("");
      setUploadProgress(0);
      queryClient.invalidateQueries({ queryKey: ['/api/muestreos'] });
    },
    onError: (error: Error) => {
      setUploadProgress(0);
      toast({
        title: "Error al subir archivo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedBranch) {
      toast({
        title: "Selecciona una sucursal",
        description: "Debes seleccionar la sucursal antes de subir el archivo",
        variant: "destructive",
      });
      return;
    }

    if (!selectedFile) {
      toast({
        title: "Selecciona un archivo",
        description: "Debes seleccionar un archivo para subir",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('sucursal', selectedBranch);

    uploadMutation.mutate(formData);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <TooltipProvider>
    <div className="space-y-3 sm:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-base sm:text-2xl font-bold">Muestreos</h1>
        {ultimaActualizacion && (
          <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 border shrink-0">
            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-semibold leading-tight">
                {(() => {
                  const parseLocalDate = (str: string) => {
                    if (!str) return null;
                    if (str.includes(' ')) {
                      const [datePart, timePart] = str.split(' ');
                      const [y, m, d] = datePart.split('-').map(Number);
                      const [h, min] = timePart.split(':').map(Number);
                      return { date: new Date(y, m - 1, d, h, min), hasTime: true };
                    }
                    const [y, m, d] = str.split('-').map(Number);
                    return { date: new Date(y, m - 1, d), hasTime: false };
                  };
                  const costo = parseLocalDate(ultimaActualizacion.costos_fecha);
                  const venta = parseLocalDate(ultimaActualizacion.ventas_fecha);
                  const latest = costo && venta ? (costo.date > venta.date ? costo : venta) : costo || venta;
                  if (!latest) return 'Sin datos';
                  const d = latest.date;
                  const timeStr = latest.hasTime ? ` ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';
                  return `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}${timeStr}`;
                })()}
              </span>
              <span className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight">Últ. actualización</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-2">
            <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-lg">
              <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
              Subir Archivo
            </CardTitle>
            <CardDescription className="text-[11px] sm:text-sm">
              Selecciona la sucursal y el archivo de muestreo
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-2 sm:pt-4 space-y-3 sm:space-y-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="branch-select" className="text-xs sm:text-sm">Sucursal *</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger id="branch-select" data-testid="select-branch-muestreo" className="h-9 sm:h-10 text-xs sm:text-sm">
                  <SelectValue placeholder="Seleccionar sucursal..." />
                </SelectTrigger>
                <SelectContent>
                  {BRANCHES.map((branch) => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="file-input" className="text-xs sm:text-sm">Archivo *</Label>
              <div className="flex items-center gap-2">
                <input
                  id="file-input"
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".xlsx,.xls,.pdf,.doc,.docx,.jpg,.jpeg,.png"
                  data-testid="input-muestreo-file"
                  disabled={!selectedBranch}
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('file-input')?.click()}
                  className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
                  disabled={!selectedBranch}
                  data-testid="button-select-file"
                >
                  <FolderOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                  <span className="truncate">
                    {!selectedBranch ? "Primero selecciona sucursal" : selectedFile ? selectedFile.name : "Seleccionar archivo..."}
                  </span>
                </Button>
              </div>
              {!selectedBranch && (
                <p className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400">
                  Selecciona una sucursal antes de elegir el archivo
                </p>
              )}
              {selectedFile && (
                <p className="text-[11px] sm:text-sm text-muted-foreground">
                  Tamaño: {formatFileSize(selectedFile.size)}
                </p>
              )}
            </div>

            {uploadProgress > 0 && (
              <div className="space-y-1.5">
                <Progress value={uploadProgress} className="h-1.5 sm:h-2" />
                <p className="text-[11px] sm:text-sm text-muted-foreground text-center">
                  {uploadProgress < 100 ? 'Subiendo...' : 'Completado'}
                </p>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !selectedBranch || uploadMutation.isPending}
              className="w-full h-9 sm:h-10 text-xs sm:text-sm"
              data-testid="button-upload-muestreo"
            >
              {uploadMutation.isPending ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  Adjunta Muestreo
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-2">
            <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-lg">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              Archivos Subidos
            </CardTitle>
            <CardDescription className="text-[11px] sm:text-sm">
              Visualiza y descarga cada muestreo
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-2 sm:pt-4">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
              <Select value={filterBranch || "all"} onValueChange={(v) => setFilterBranch(v === "all" ? "" : v)}>
                <SelectTrigger className="flex-1 h-9 sm:h-10 text-xs sm:text-sm" data-testid="select-filter-branch">
                  <SelectValue placeholder="Filtrar por sucursal..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {BRANCHES.map((branch) => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => refetchFiles()}
                    disabled={filesLoading}
                    data-testid="button-refresh-files"
                    className="h-9 w-9 sm:h-10 sm:w-10 shrink-0"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${filesLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Actualizar lista</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {filesLoading ? (
              <div className="flex items-center justify-center py-6 sm:py-8">
                <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <FileText className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
                <p className="text-xs sm:text-sm">{filterBranch ? 'No hay archivos de esta sucursal' : 'No hay archivos subidos'}</p>
              </div>
            ) : (
              <div className="space-y-1.5 sm:space-y-2 max-h-[500px] overflow-y-auto">
                {filteredFiles.map((file) => {
                  const status = fileStatuses[file.id] || "no_visto";
                  const statusConfig = STATUS_CONFIG[status];
                  const StatusIcon = statusConfig.icon;
                  const codigoNombre = extractCodigoFromName(file.name);
                  const isExpanded = expandedFile === file.id;
                  const contenido = cachedContenido[file.id];
                  const isLoadingContenido = loadingContenido[file.id];
                  const isWord = /\.(doc|docx)$/i.test(file.name);
                  return (
                    <div
                      key={file.id}
                      className="bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                      data-testid={`file-item-${file.id}`}
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-2.5">
                        <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            {file.sucursal && (
                              <span className="inline-flex items-center px-1 sm:px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] sm:text-xs font-medium">
                                {file.sucursal}
                              </span>
                            )}
                            {codigoNombre && (
                              <span className="inline-flex items-center gap-0.5 px-1 sm:px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-[10px] sm:text-xs font-medium">
                                <Package className="h-2.5 w-2.5" />
                                {codigoNombre}
                              </span>
                            )}
                            <span className="text-[10px] sm:text-xs text-muted-foreground">
                              {new Date(file.modified).toLocaleDateString('es-AR')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                          {isWord && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleContenido(file)}
                                  className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                                >
                                  {isLoadingContenido ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : isExpanded ? (
                                    <ChevronUp className="h-3 w-3" />
                                  ) : (
                                    <Search className="h-3 w-3" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{isExpanded ? 'Ocultar artículos' : 'Ver artículos'}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => cycleStatus(file.id)}
                                className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium transition-all duration-300 active:scale-95 ${statusConfig.bgColor} ${statusConfig.color}`}
                                data-testid={`button-status-${file.id}`}
                              >
                                <StatusIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                <span className="hidden sm:inline">{statusConfig.label}</span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{statusConfig.label} — Clic para cambiar</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openFileLink(file, 'view')}
                                disabled={loadingLinks[file.id]}
                                data-testid={`button-view-${file.id}`}
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                              >
                                {loadingLinks[file.id] ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <ExternalLink className="h-3 w-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Ver archivo</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openFileLink(file, 'download')}
                                disabled={loadingLinks[file.id]}
                                data-testid={`button-download-${file.id}`}
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                              >
                                {loadingLinks[file.id] ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Download className="h-3 w-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Descargar</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-2 sm:px-3 pb-2 sm:pb-3 pt-0">
                          <div className="border-t pt-2 space-y-1.5">
                            {isLoadingContenido ? (
                              <div className="flex items-center gap-2 py-2 justify-center">
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                <span className="text-[11px] sm:text-xs text-muted-foreground">Analizando archivo...</span>
                              </div>
                            ) : contenido?.error ? (
                              <p className="text-[11px] sm:text-xs text-red-500 py-1">{contenido.error}</p>
                            ) : contenido && contenido.codigos.length > 0 ? (
                              <>
                                {(contenido.comprobante || contenido.observaciones) && (
                                  <div className="text-[10px] sm:text-xs text-muted-foreground space-y-0.5">
                                    {contenido.comprobante && <p><span className="font-medium">Comp:</span> {contenido.comprobante}</p>}
                                    {contenido.observaciones && <p><span className="font-medium">Obs:</span> {contenido.observaciones}</p>}
                                  </div>
                                )}
                                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                                  {contenido.totalCodigos} artículo{contenido.totalCodigos !== 1 ? 's' : ''}:
                                </p>
                                <div className="max-h-40 overflow-y-auto space-y-0.5">
                                  {contenido.codigos.map((c) => {
                                    const dif = c.diferencia ? parseFloat(c.diferencia.replace(',', '.')) : 0;
                                    return (
                                      <div key={c.codigo} className="flex items-center gap-1.5 text-[10px] sm:text-xs">
                                        <span className="font-mono font-medium text-blue-700 dark:text-blue-400 min-w-[70px] sm:min-w-[90px]">{c.codigo}</span>
                                        <span className="text-muted-foreground truncate flex-1">{c.descripcion}</span>
                                        {c.diferencia && (
                                          <span className={`font-mono shrink-0 ${dif < 0 ? 'text-red-600' : dif > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                                            {dif > 0 ? '+' : ''}{c.diferencia}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            ) : contenido ? (
                              <p className="text-[11px] sm:text-xs text-muted-foreground py-1">No se encontraron códigos de artículo en el archivo</p>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </TooltipProvider>
  );
}
