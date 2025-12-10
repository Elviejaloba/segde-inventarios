import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Upload, FileText, Download, ExternalLink, FolderOpen, RefreshCw, Eye, EyeOff, CheckCircle2 } from "lucide-react";
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

type FileStatus = "no_visto" | "visto" | "analizado";

const STATUS_CONFIG: Record<FileStatus, { label: string; color: string; bgColor: string; icon: typeof Eye }> = {
  no_visto: { label: "No visto", color: "text-gray-500", bgColor: "bg-gray-100 dark:bg-gray-800", icon: EyeOff },
  visto: { label: "Visto", color: "text-blue-500", bgColor: "bg-blue-100 dark:bg-blue-900/30", icon: Eye },
  analizado: { label: "Analizado", color: "text-green-500", bgColor: "bg-green-100 dark:bg-green-900/30", icon: CheckCircle2 },
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
  "T.Luis",
  "Crisa2",
  "T.S.Martin",
  "T.Tunuyan",
  "T.Lujan",
  "T.Maipu",
  "T.Srafael",
  "Ctro. de Distribucion"
];

function extractSucursalFromName(fileName: string): string | null {
  for (const branch of BRANCHES) {
    if (fileName.includes(`[${branch}]`)) {
      return branch;
    }
  }
  return null;
}

export default function MuestreosPage() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filterBranch, setFilterBranch] = useState<string>("");
  const [fileStatuses, setFileStatuses] = useState<Record<string, FileStatus>>(getFileStatuses);

  const cycleStatus = (fileId: string) => {
    const currentStatus = fileStatuses[fileId] || "no_visto";
    const nextStatus: FileStatus = currentStatus === "no_visto" ? "visto" : currentStatus === "visto" ? "analizado" : "no_visto";
    setFileStatus(fileId, nextStatus);
    setFileStatuses(prev => ({ ...prev, [fileId]: nextStatus }));
  };

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
        description: `${data.name} se ha guardado en Dropbox`,
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <TooltipProvider>
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl sm:text-2xl font-bold">Subir Archivo de Muestreo</h1>
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex-shrink-0 animate-bounce">
            <svg className="h-5 w-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Esta herramienta actúa como recordatorio y facilita el seguimiento del progreso de cada sucursal
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Subir Archivo
            </CardTitle>
            <CardDescription>
              Selecciona la sucursal y el archivo de muestreo para subir
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="branch-select">Sucursal *</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger id="branch-select" data-testid="select-branch-muestreo">
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

            <div className="space-y-2">
              <Label htmlFor="file-input">Archivo *</Label>
              <div className="flex items-center gap-2">
                <input
                  id="file-input"
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".xlsx,.xls,.pdf,.doc,.docx,.jpg,.jpeg,.png"
                  data-testid="input-muestreo-file"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('file-input')?.click()}
                  className="flex-1"
                  data-testid="button-select-file"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  {selectedFile ? selectedFile.name : "Seleccionar archivo..."}
                </Button>
              </div>
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Tamaño: {formatFileSize(selectedFile.size)}
                </p>
              )}
            </div>

            {uploadProgress > 0 && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">
                  {uploadProgress < 100 ? 'Subiendo...' : 'Completado'}
                </p>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !selectedBranch || uploadMutation.isPending}
              className="w-full"
              data-testid="button-upload-muestreo"
            >
              {uploadMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Adjunta Muestreo
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Archivos Subidos
            </CardTitle>
            <CardDescription>
              Puedes visualizar y descargar cada muestreo enviado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <Select value={filterBranch || "all"} onValueChange={(v) => setFilterBranch(v === "all" ? "" : v)}>
                <SelectTrigger className="flex-1" data-testid="select-filter-branch">
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
                  >
                    <RefreshCw className={`h-4 w-4 ${filesLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Actualizar lista de archivos</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {filesLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{filterBranch ? 'No hay archivos de esta sucursal' : 'No hay archivos subidos'}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredFiles.map((file) => {
                  const status = fileStatuses[file.id] || "no_visto";
                  const statusConfig = STATUS_CONFIG[status];
                  const StatusIcon = statusConfig.icon;
                  return (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                      data-testid={`file-item-${file.id}`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {file.sucursal && (
                              <span className="inline-flex items-center px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                                {file.sucursal}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(file.modified).toLocaleDateString('es-AR')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => cycleStatus(file.id)}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 hover:scale-105 ${statusConfig.bgColor} ${statusConfig.color}`}
                              data-testid={`button-status-${file.id}`}
                            >
                              <StatusIcon className="h-3 w-3 animate-pulse" />
                              {statusConfig.label}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Clic para cambiar estado del archivo</p>
                          </TooltipContent>
                        </Tooltip>
                        {file.sharedLink && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                  data-testid={`button-view-${file.id}`}
                                >
                                  <a href={file.sharedLink} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Ver archivo en Dropbox</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                  data-testid={`button-download-${file.id}`}
                                >
                                  <a href={file.sharedLink.replace('?raw=1', '?dl=1')} download>
                                    <Download className="h-3 w-3" />
                                  </a>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Descargar archivo</p>
                              </TooltipContent>
                            </Tooltip>
                          </>
                        )}
                      </div>
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
