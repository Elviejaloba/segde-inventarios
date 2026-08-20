import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Building2, Calculator, ClipboardList, Download, Lock, Pencil, Plus, Ruler, Search, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { buildApiUrl } from "@/lib/api";
import { AVAILABLE_BRANCHES, type Branch } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

type Article = {
  code: string;
  description?: string | null;
  synonym?: string | null;
  codigoBase?: string | null;
  descripcionBase?: string | null;
  active?: boolean;
  anchoCm?: number | null;
  metrosReferencia?: number | null;
  kgPorMetro?: number | null;
  referenceLabel?: string | null;
};

type RindeConfig = {
  id?: number;
  articleCode: string;
  anchoCm: number;
  pesoReferenciaKg: number;
  metrosReferencia: number;
  kgPorMetro: number;
  referenceLabel?: string | null;
  activo: boolean;
  updatedAt?: string | null;
  updatedBy?: string | null;
};

type RindeResponse = {
  article: Article;
  rinde: RindeConfig | null;
};

type AvailableRinde = {
  id?: number;
  articleCode: string;
  referenceLabel?: string | null;
  description?: string | null;
  synonym?: string | null;
  codigoBase?: string | null;
  descripcionBase?: string | null;
  anchoCm?: number | null;
  pesoReferenciaKg?: number | null;
  metrosReferencia?: number | null;
  kgPorMetro?: number | null;
  activo?: boolean;
  updatedAt?: string | null;
  updatedBy?: string | null;
};

type InventorySession = {
  id: string;
  branchCode: string;
  status: "active" | "closed";
  createdAt?: string | null;
  lastActivity?: string | null;
  closedAt?: string | null;
};

type InventoryItem = {
  id: number;
  sessionId: string;
  sortOrder: number;
  articleCode: string;
  referenceLabel: string;
  anchoCm: number;
  pesoKg: number;
  kgPorMetro: number;
  metrosReferencia: number;
  metrosAbiertos: number;
  rollosCerrados: number;
  metrosCerrados: number;
  totalMetros: number;
  observacion?: string | null;
};

type InventorySummary = {
  rowCount: number;
  openMeters: number;
  closedMeters: number;
  totalMeters: number;
  closedRolls: number;
  byReference: Array<{ referenceLabel: string; totalMeters: number }>;
};

type InventoryPayload = {
  session: InventorySession;
  items: InventoryItem[];
  summary: InventorySummary;
};

const INVENTORY_SESSION_MAP_KEY = "rindeInventorySessionsByBranch";
const INVENTORY_LAST_BRANCH_KEY = "rindeInventoryLastBranch";

const formatNumber = (value: number, digits = 2) =>
  new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
};

const parseDecimal = (value: string) => {
  const normalized = value.replace(/\s+/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const getReferenceLabel = (item?: { referenceLabel?: string | null; code?: string | null; articleCode?: string | null }) => {
  if (!item) return "";
  return item.referenceLabel?.trim() || item.code?.trim() || item.articleCode?.trim() || "";
};

const normalize = (value?: string | null) => String(value || "").trim().toUpperCase();

const toArticle = (item: AvailableRinde): Article => ({
  code: item.articleCode,
  description: item.description,
  synonym: item.synonym,
  codigoBase: item.codigoBase,
  descripcionBase: item.descripcionBase,
  active: item.activo,
  anchoCm: item.anchoCm,
  metrosReferencia: item.metrosReferencia,
  kgPorMetro: item.kgPorMetro,
  referenceLabel: item.referenceLabel,
});

const slugifyBranch = (branch: string) =>
  branch
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const createClientSessionId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const getStoredSessionMap = (): Record<string, string> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(INVENTORY_SESSION_MAP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const setStoredSessionMap = (map: Record<string, string>) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INVENTORY_SESSION_MAP_KEY, JSON.stringify(map));
};

export default function RindePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const inventorySearchInputRef = useRef<HTMLInputElement | null>(null);
  const pesoInputRef = useRef<HTMLInputElement | null>(null);
  const rollosInputRef = useRef<HTMLInputElement | null>(null);
  const inventorySearchBlurTimer = useRef<number | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [debouncedAdminSearch, setDebouncedAdminSearch] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [pesoActual, setPesoActual] = useState("");
  const [rollosCerrados, setRollosCerrados] = useState("0");
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [validatedPassword, setValidatedPassword] = useState("");
  const [updatedBy, setUpdatedBy] = useState("CDD");
  const [deleteCandidate, setDeleteCandidate] = useState<AvailableRinde | null>(null);
  const [mobileSections, setMobileSections] = useState<string[]>([]);
  const [form, setForm] = useState({
    referenceLabel: "",
    anchoCm: "",
    pesoReferenciaKg: "",
    metrosReferencia: "",
    activo: true,
  });
  const [selectedBranch, setSelectedBranch] = useState<Branch | "">("");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [inventorySearch, setInventorySearch] = useState("");
  const [debouncedInventorySearch, setDebouncedInventorySearch] = useState("");
  const [inventorySearchOpen, setInventorySearchOpen] = useState(false);
  const [inventorySelectedRinde, setInventorySelectedRinde] = useState<AvailableRinde | null>(null);
  const [inventoryPeso, setInventoryPeso] = useState("");
  const [inventoryRollos, setInventoryRollos] = useState("0");
  const [inventoryObservation, setInventoryObservation] = useState("");
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [inventoryMobileSections, setInventoryMobileSections] = useState<string[]>(["summary"]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 220);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedAdminSearch(adminSearch.trim()), 220);
    return () => window.clearTimeout(timer);
  }, [adminSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedInventorySearch(inventorySearch.trim()), 160);
    return () => window.clearTimeout(timer);
  }, [inventorySearch]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const lastBranch = window.localStorage.getItem(INVENTORY_LAST_BRANCH_KEY);
    if (lastBranch && AVAILABLE_BRANCHES.includes(lastBranch as Branch)) {
      setSelectedBranch(lastBranch as Branch);
      const map = getStoredSessionMap();
      setCurrentSessionId(map[lastBranch] || null);
    }
  }, []);

  useEffect(() => {
    if (!selectedBranch || typeof window === "undefined") return;
    window.localStorage.setItem(INVENTORY_LAST_BRANCH_KEY, selectedBranch);
    const map = getStoredSessionMap();
    setCurrentSessionId(map[selectedBranch] || null);
  }, [selectedBranch]);

  const activeRindesQuery = useQuery<AvailableRinde[]>({
    queryKey: ["rindes-activos"],
    queryFn: async () => {
      const response = await fetch(buildApiUrl("/api/rindes"));
      if (!response.ok) throw new Error("No se pudieron cargar los rindes disponibles.");
      return response.json();
    },
  });

  const adminRindesQuery = useQuery<AvailableRinde[]>({
    queryKey: ["rindes-admin"],
    enabled: adminUnlocked && adminPanelOpen,
    queryFn: async () => {
      const response = await fetch(buildApiUrl("/api/rindes?includeInactive=1"));
      if (!response.ok) throw new Error("No se pudieron cargar los rindes configurados.");
      return response.json();
    },
  });

  const rindeQuery = useQuery<RindeResponse | null>({
    queryKey: ["rinde-config", selectedArticle?.code],
    enabled: Boolean(selectedArticle?.code),
    queryFn: async () => {
      const response = await fetch(buildApiUrl(`/api/rindes/${encodeURIComponent(selectedArticle!.code)}`));
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("No se pudo cargar el rinde configurado.");
      return response.json();
    },
  });

  const inventorySessionQuery = useQuery<InventoryPayload | null>({
    queryKey: ["rinde-inventory-session", currentSessionId],
    enabled: Boolean(currentSessionId),
    queryFn: async () => {
      const response = await fetch(buildApiUrl(`/api/rinde-inventory/sessions/${encodeURIComponent(currentSessionId!)}`));
      if (response.status === 404) throw new Error("SESSION_NOT_FOUND");
      if (!response.ok) throw new Error("No se pudo cargar el inventario activo.");
      return response.json();
    },
  });

  const applyInventoryPayload = (payload: InventoryPayload | null | undefined) => {
    if (!payload) return;
    queryClient.setQueryData(["rinde-inventory-session", payload.session.id], payload);
  };
  useEffect(() => {
    if (!inventorySessionQuery.error || !selectedBranch) return;
    const message = inventorySessionQuery.error instanceof Error ? inventorySessionQuery.error.message : "";
    if (message !== "SESSION_NOT_FOUND") return;
    const map = getStoredSessionMap();
    if (map[selectedBranch] === currentSessionId) {
      delete map[selectedBranch];
      setStoredSessionMap(map);
    }
    setCurrentSessionId(null);
  }, [inventorySessionQuery.error, selectedBranch, currentSessionId]);

  useEffect(() => {
    if (inventorySessionQuery.data?.session.status === "closed" && selectedBranch) {
      const map = getStoredSessionMap();
      if (map[selectedBranch] === inventorySessionQuery.data.session.id) {
        delete map[selectedBranch];
        setStoredSessionMap(map);
      }
      setCurrentSessionId(null);
    }
  }, [inventorySessionQuery.data, selectedBranch]);

  useEffect(() => {
    if (rindeQuery.data?.rinde) {
      const rinde = rindeQuery.data.rinde;
      setForm({
        referenceLabel: rinde.referenceLabel || rinde.articleCode || "",
        anchoCm: String(rinde.anchoCm),
        pesoReferenciaKg: String(rinde.pesoReferenciaKg),
        metrosReferencia: String(rinde.metrosReferencia),
        activo: rinde.activo,
      });
      return;
    }
    if (selectedArticle) {
      setForm((current) => ({ ...current, referenceLabel: getReferenceLabel(selectedArticle) }));
      return;
    }
    setForm({ referenceLabel: "", anchoCm: "", pesoReferenciaKg: "", metrosReferencia: "", activo: true });
  }, [rindeQuery.data, selectedArticle]);

  const pesoReferencia = parseDecimal(form.pesoReferenciaKg);
  const metrosReferencia = parseDecimal(form.metrosReferencia);
  const kgPorMetro = useMemo(() => {
    if (!Number.isFinite(pesoReferencia) || !Number.isFinite(metrosReferencia) || metrosReferencia <= 0) return NaN;
    return pesoReferencia / metrosReferencia;
  }, [pesoReferencia, metrosReferencia]);

  const pesoActualNumber = parseDecimal(pesoActual || "0");
  const rollosCerradosNumber = parseDecimal(rollosCerrados || "0");
  const calculation = useMemo(() => {
    if (!selectedArticle) return { abierto: 0, cerrados: 0, total: 0, valid: false, message: "Elegí una referencia de rinde para calcular." };
    if (!rindeQuery.data?.rinde || rindeQuery.data.rinde.activo === false) return { abierto: 0, cerrados: 0, total: 0, valid: false, message: "Esta referencia todavía no tiene parámetros activos." };
    if (!Number.isFinite(kgPorMetro) || kgPorMetro <= 0) return { abierto: 0, cerrados: 0, total: 0, valid: false, message: "Los parámetros de referencia están incompletos o son inválidos." };
    if (pesoActual && (!Number.isFinite(pesoActualNumber) || pesoActualNumber <= 0)) return { abierto: 0, cerrados: 0, total: 0, valid: false, message: "Ingresá un peso mayor a 0." };
    if (rollosCerrados && (!Number.isFinite(rollosCerradosNumber) || rollosCerradosNumber < 0)) return { abierto: 0, cerrados: 0, total: 0, valid: false, message: "Ingresá una cantidad de rollos válida." };
    const abierto = pesoActualNumber > 0 ? pesoActualNumber / kgPorMetro : 0;
    const cerrados = rollosCerradosNumber > 0 ? rollosCerradosNumber * metrosReferencia : 0;
    return { abierto, cerrados, total: abierto + cerrados, valid: true, message: "Resultado estimado listo para usar." };
  }, [selectedArticle, rindeQuery.data, kgPorMetro, pesoActual, pesoActualNumber, rollosCerrados, rollosCerradosNumber, metrosReferencia]);

  const inventoryPesoNumber = parseDecimal(inventoryPeso || "0");
  const inventoryRollosNumber = Number.parseInt(String(inventoryRollos || "0"), 10);
  const inventoryCalculation = useMemo(() => {
    const rinde = inventorySelectedRinde;
    if (!rinde || !rinde.kgPorMetro || !rinde.metrosReferencia) return { openMeters: 0, closedMeters: 0, totalMeters: 0, valid: false };
    const openMeters = Number.isFinite(inventoryPesoNumber) && inventoryPesoNumber > 0 ? inventoryPesoNumber / Number(rinde.kgPorMetro) : 0;
    const rollos = Number.isFinite(inventoryRollosNumber) && inventoryRollosNumber > 0 ? inventoryRollosNumber : 0;
    const closedMeters = rollos * Number(rinde.metrosReferencia);
    return { openMeters, closedMeters, totalMeters: openMeters + closedMeters, valid: true };
  }, [inventorySelectedRinde, inventoryPesoNumber, inventoryRollosNumber]);

  const createSessionMutation = useMutation({
    mutationFn: async (branchCode: string) => {
      const sessionId = getStoredSessionMap()[branchCode] || createClientSessionId();
      const response = await fetch(buildApiUrl("/api/rinde-inventory/sessions"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchCode, sessionId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo iniciar el inventario.");
      return payload as InventoryPayload;
    },
    onSuccess: (payload) => {
      const map = getStoredSessionMap();
      map[payload.session.branchCode] = payload.session.id;
      setStoredSessionMap(map);
      setCurrentSessionId(payload.session.id);
      applyInventoryPayload(payload);
      toast({ variant: "success", title: "Inventario listo", description: `La sesión quedó activa para ${payload.session.branchCode}.` });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "No se pudo iniciar", description: error.message }),
  });

  const upsertInventoryItemMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBranch) throw new Error("Seleccioná una sucursal.");
      if (!currentSessionId) throw new Error("Iniciá un inventario para continuar.");
      if (!inventorySelectedRinde) throw new Error("Seleccioná un rinde activo.");
      if (!Number.isFinite(inventoryPesoNumber) || inventoryPesoNumber < 0) throw new Error("Ingresá un peso válido.");
      if (!Number.isFinite(inventoryRollosNumber) || inventoryRollosNumber < 0) throw new Error("Ingresá una cantidad de rollos válida.");
      const body = {
        articleCode: inventorySelectedRinde.articleCode,
        referenceLabel: getReferenceLabel(inventorySelectedRinde) || inventorySelectedRinde.articleCode,
        anchoCm: Number(inventorySelectedRinde.anchoCm || 0),
        pesoKg: inventoryPesoNumber > 0 ? inventoryPesoNumber : 0,
        kgPorMetro: Number(inventorySelectedRinde.kgPorMetro || 0),
        metrosReferencia: Number(inventorySelectedRinde.metrosReferencia || 0),
        rollosCerrados: Number.isFinite(inventoryRollosNumber) && inventoryRollosNumber > 0 ? inventoryRollosNumber : 0,
        observacion: inventoryObservation.trim() || null,
      };
      const url = editingItemId ? buildApiUrl(`/api/rinde-inventory/sessions/${encodeURIComponent(currentSessionId)}/items/${editingItemId}`) : buildApiUrl(`/api/rinde-inventory/sessions/${encodeURIComponent(currentSessionId)}/items`);
      const response = await fetch(url, { method: editingItemId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo guardar la fila.");
      return payload as InventoryPayload;
    },
    onSuccess: (payload) => {
      const editing = editingItemId;
      applyInventoryPayload(payload);
      setEditingItemId(null);
      setInventorySelectedRinde(null);
      setInventorySearch("");
      setInventoryPeso("");
      setInventoryRollos("0");
      setInventoryObservation("");
      setInventorySearchOpen(false);
      toast({ variant: "success", title: editing ? "Fila actualizada" : "Fila agregada", description: editing ? "Los metros recalculados ya quedaron guardados." : "Podés seguir cargando la siguiente tela." });
      window.setTimeout(() => {
        inventorySearchInputRef.current?.focus();
        inventorySearchInputRef.current?.select();
      }, 20);
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "No se pudo guardar", description: error.message }),
  });

  const deleteInventoryItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      if (!currentSessionId) throw new Error("No hay un inventario activo.");
      const response = await fetch(buildApiUrl(`/api/rinde-inventory/sessions/${encodeURIComponent(currentSessionId)}/items/${itemId}`), { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo eliminar la fila.");
      return payload as InventoryPayload;
    },
    onSuccess: (payload) => {
      applyInventoryPayload(payload);
      toast({ variant: "warning", title: "Fila eliminada", description: "El relevamiento sigue disponible para continuar." });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "No se pudo eliminar", description: error.message }),
  });

  const downloadInventoryExcel = (payload: InventoryPayload) => {
    const sessionDate = payload.session.createdAt ? new Date(payload.session.createdAt) : new Date();
    const dateLabel = sessionDate.toISOString().slice(0, 10);
    const inventoryRows = payload.items.map((item) => ({ Fecha: dateLabel, Sucursal: payload.session.branchCode, Referencia: item.referenceLabel, Ancho: item.anchoCm, "Peso rollo abierto": item.pesoKg, "Kg por metro": item.kgPorMetro, "Metros estimados": item.metrosAbiertos, "Rollos cerrados": item.rollosCerrados, "Metros por rollo": item.metrosReferencia, "Metros cerrados": item.metrosCerrados, Total: item.totalMetros, Observaciones: item.observacion || "" }));
    const resumenRows = [{ Sucursal: payload.session.branchCode, Fecha: dateLabel, "Cantidad registros": payload.summary.rowCount, "Total metros": payload.summary.totalMeters, "Metros abiertos": payload.summary.openMeters, "Metros cerrados": payload.summary.closedMeters, "Rollos cerrados": payload.summary.closedRolls }, {}, ...payload.summary.byReference.map((entry) => ({ Referencia: entry.referenceLabel, "Total metros": entry.totalMeters }))];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(inventoryRows.length ? inventoryRows : [{ Fecha: dateLabel, Sucursal: payload.session.branchCode }]), "INVENTARIO");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(resumenRows), "RESUMEN");
    XLSX.writeFile(workbook, `Inventario_Rindes_${slugifyBranch(payload.session.branchCode)}_${dateLabel}.xlsx`);
  };

  const finalizeInventoryMutation = useMutation({
    mutationFn: async () => {
      if (!currentSessionId) throw new Error("No hay un inventario activo.");
      const response = await fetch(buildApiUrl(`/api/rinde-inventory/sessions/${encodeURIComponent(currentSessionId)}/finalize`), { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo finalizar el inventario.");
      return payload as InventoryPayload;
    },
    onSuccess: (payload) => {
      downloadInventoryExcel(payload);
      const map = getStoredSessionMap();
      delete map[payload.session.branchCode];
      setStoredSessionMap(map);
      queryClient.removeQueries({ queryKey: ["rinde-inventory-session", payload.session.id] });
      setCurrentSessionId(null);
      setEditingItemId(null);
      setInventorySelectedRinde(null);
      setInventorySearch("");
      setInventoryPeso("");
      setInventoryRollos("0");
      setInventoryObservation("");
      toast({ variant: "success", title: "Inventario finalizado", description: "El Excel se descargó y la sesión quedó cerrada." });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "No se pudo finalizar", description: error.message }),
  });
  const authMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(buildApiUrl("/api/rindes/auth"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo validar la contraseña.");
      return payload;
    },
    onSuccess: () => {
      setValidatedPassword(password.trim());
      setAdminUnlocked(true);
      setAdminPanelOpen(true);
      setPassword("");
      toast({ variant: "success", title: "Acceso habilitado", description: "Ya podés administrar los parámetros de rinde de CDD." });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "Contraseña incorrecta", description: error.message }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!validatedPassword) throw new Error("Volvé a validar la contraseña del sector CDD antes de guardar.");
      const reference = (form.referenceLabel || getReferenceLabel(selectedArticle)).trim();
      if (!reference) throw new Error("Ingresá la referencia de rinde.");
      const anchoCm = parseDecimal(form.anchoCm);
      const pesoReferenciaKgValue = parseDecimal(form.pesoReferenciaKg);
      const metrosReferenciaValue = parseDecimal(form.metrosReferencia);
      const kgPorMetroValue = pesoReferenciaKgValue / metrosReferenciaValue;
      if (![anchoCm, pesoReferenciaKgValue, metrosReferenciaValue, kgPorMetroValue].every((value) => Number.isFinite(value) && value > 0)) throw new Error("Completá ancho, peso y metros de referencia con valores mayores a 0.");
      const currentCode = selectedArticle?.code?.trim() || "";
      const isEditingExisting = Boolean(rindeQuery.data?.rinde && currentCode);
      const url = isEditingExisting ? buildApiUrl(`/api/rindes/${encodeURIComponent(currentCode)}`) : buildApiUrl("/api/rindes");
      const response = await fetch(url, { method: isEditingExisting ? "PATCH" : "POST", headers: { "Content-Type": "application/json", "x-rinde-password": validatedPassword }, body: JSON.stringify({ articleCode: currentCode || reference, referenceLabel: reference, anchoCm, pesoReferenciaKg: pesoReferenciaKgValue, metrosReferencia: metrosReferenciaValue, kgPorMetro: kgPorMetroValue, activo: form.activo, updatedBy }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo guardar el rinde.");
      return { payload, reference, isEditingExisting };
    },
    onSuccess: async ({ payload, reference, isEditingExisting }) => {
      const nextCode = payload.articleCode || payload.article_code || selectedArticle?.code || reference;
      setSelectedArticle({ code: nextCode, referenceLabel: payload.referenceLabel || reference, active: payload.activo !== false, anchoCm: payload.anchoCm ?? null, metrosReferencia: payload.metrosReferencia ?? null, kgPorMetro: payload.kgPorMetro ?? null });
      setSearch(payload.referenceLabel || reference);
      setAdminSearch(payload.referenceLabel || reference);
      await queryClient.invalidateQueries({ queryKey: ["rindes-activos"] });
      await queryClient.invalidateQueries({ queryKey: ["rindes-admin"] });
      await queryClient.invalidateQueries({ queryKey: ["rinde-config", nextCode] });
      toast({ variant: "success", title: isEditingExisting ? "Rinde actualizado" : "Rinde guardado", description: isEditingExisting ? "Los nuevos parámetros ya están disponibles para las sucursales." : "La referencia ya quedó disponible para las sucursales." });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "No se pudo guardar", description: error.message }),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (candidate: AvailableRinde) => {
      if (!validatedPassword) throw new Error("Volvé a validar la contraseña del sector CDD antes de eliminar.");
      const response = await fetch(buildApiUrl(`/api/rindes/${encodeURIComponent(candidate.articleCode)}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-rinde-password": validatedPassword },
        body: JSON.stringify({ articleCode: candidate.articleCode, referenceLabel: candidate.referenceLabel || candidate.articleCode, anchoCm: Number(candidate.anchoCm || 0), pesoReferenciaKg: Number(candidate.pesoReferenciaKg || 0), metrosReferencia: Number(candidate.metrosReferencia || 0), kgPorMetro: Number(candidate.kgPorMetro || 0), activo: false, updatedBy }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo desactivar el rinde.");
      return payload;
    },
    onSuccess: async () => {
      setDeleteCandidate(null);
      setSelectedArticle(null);
      setPesoActual("");
      setRollosCerrados("0");
      await queryClient.invalidateQueries({ queryKey: ["rindes-activos"] });
      await queryClient.invalidateQueries({ queryKey: ["rindes-admin"] });
      toast({ variant: "warning", title: "Rinde desactivado", description: "Dejó de estar disponible para las sucursales." });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "No se pudo eliminar", description: error.message }),
  });

  const filteredAvailableRindes = useMemo(() => {
    const list = activeRindesQuery.data || [];
    const term = normalize(debouncedSearch || search);
    if (!term) return list.filter((item) => item.activo !== false);
    return list.filter((item) => item.activo !== false && [item.referenceLabel, item.articleCode].some((value) => normalize(value).includes(term)));
  }, [activeRindesQuery.data, debouncedSearch, search]);

  const filteredAdminRindes = useMemo(() => {
    const list = adminRindesQuery.data || [];
    const term = normalize(debouncedAdminSearch || adminSearch);
    if (!term) return list;
    return list.filter((item) => [item.referenceLabel, item.articleCode].some((value) => normalize(value).includes(term)));
  }, [adminRindesQuery.data, debouncedAdminSearch, adminSearch]);

  const inventorySuggestions = useMemo(() => {
    const list = activeRindesQuery.data || [];
    const term = normalize(debouncedInventorySearch || inventorySearch);
    const filtered = term ? list.filter((item) => item.activo !== false && [item.referenceLabel, item.articleCode].some((value) => normalize(value).includes(term))) : list.filter((item) => item.activo !== false);
    return filtered.slice(0, 8);
  }, [activeRindesQuery.data, debouncedInventorySearch, inventorySearch]);

  const inventoryPayload = inventorySessionQuery.data;
  const inventoryItems = inventoryPayload?.items || [];
  const inventorySummary = inventoryPayload?.summary || { rowCount: 0, openMeters: 0, closedMeters: 0, totalMeters: 0, closedRolls: 0, byReference: [] };
  const inventoryInlineError = upsertInventoryItemMutation.isError && upsertInventoryItemMutation.error instanceof Error ? upsertInventoryItemMutation.error.message : "";
  const resultSummary = calculation.valid ? `${formatNumber(calculation.total)} m estimados` : selectedArticle ? calculation.message : "Elegí una referencia para empezar";
  const renderReferenceSummary = () => {
    const rinde = rindeQuery.data?.rinde;
    if (!rinde) return "Sin parámetros activos todavía";
    return `${formatNumber(rinde.anchoCm, 0)} cm · ${formatNumber(rinde.kgPorMetro, 4)} kg/m · ${formatNumber(rinde.metrosReferencia)} m/rollo`;
  };
  const renderRindeMeta = (item: { anchoCm?: number | null; kgPorMetro?: number | null; metrosReferencia?: number | null }) => (!item.anchoCm || !item.kgPorMetro || !item.metrosReferencia) ? "Parámetros pendientes" : `${formatNumber(item.anchoCm, 0)} cm · ${formatNumber(item.kgPorMetro, 4)} kg/m · ${formatNumber(item.metrosReferencia)} m/rollo`;

  const handleSelectArticle = (article: Article, source: "main" | "admin" = "main") => {
    setSelectedArticle(article);
    const reference = getReferenceLabel(article) || article.code;
    setSearch(reference);
    setAdminSearch(reference);
    setPesoActual("");
    setRollosCerrados("0");
    if (source === "admin") setAdminPanelOpen(true);
  };
  const handleCreateNewRinde = () => {
    setSelectedArticle(null);
    setPesoActual("");
    setRollosCerrados("0");
    setForm({ referenceLabel: adminSearch.trim(), anchoCm: "", pesoReferenciaKg: "", metrosReferencia: "", activo: true });
  };
  const resetInventoryForm = () => { setEditingItemId(null); setInventorySelectedRinde(null); setInventorySearch(""); setInventoryPeso(""); setInventoryRollos("0"); setInventoryObservation(""); };
  const handleSelectInventoryRinde = (item: AvailableRinde) => { setInventorySelectedRinde(item); setInventorySearch(getReferenceLabel(item) || item.articleCode); setInventorySearchOpen(false); window.setTimeout(() => { pesoInputRef.current?.focus(); pesoInputRef.current?.select(); }, 20); };
  const handleEditInventoryItem = (item: InventoryItem) => { const match = (activeRindesQuery.data || []).find((entry) => normalize(entry.articleCode) === normalize(item.articleCode)) || ({ articleCode: item.articleCode, referenceLabel: item.referenceLabel, anchoCm: item.anchoCm, kgPorMetro: item.kgPorMetro, metrosReferencia: item.metrosReferencia, activo: true } as AvailableRinde); setEditingItemId(item.id); setInventorySelectedRinde(match); setInventorySearch(item.referenceLabel); setInventoryPeso(String(item.pesoKg).replace(".", ",")); setInventoryRollos(String(item.rollosCerrados)); setInventoryObservation(item.observacion || ""); setInventorySearchOpen(false); };
  const handleDeleteInventoryItem = (item: InventoryItem) => { if (window.confirm(`¿Eliminar la fila ${item.referenceLabel} del inventario actual?`)) deleteInventoryItemMutation.mutate(item.id); };
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 pb-28 pt-2 sm:px-4 md:gap-5 md:pb-8 md:pt-4">
      <section className="rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5 md:px-6 md:py-5">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-700 shadow-sm"><Calculator className="h-5 w-5" /></div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-950 md:text-3xl">Calculadora de Rinde</h2>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">por Jony Caro</p>
                <p className="mt-1 text-sm text-slate-600">Calculá los metros estimados de una tela según su peso.</p>
              </div>
            </div>
            <Card className="border-slate-200 shadow-none" data-tour="rinde-search">
              <CardHeader className="pb-3"><CardTitle className="text-base">Rindes disponibles</CardTitle><CardDescription>Elegí una tela ya medida y verificada por CDD.</CardDescription></CardHeader>
              <CardContent className="space-y-4 pt-0">
                <Input value={search} onChange={(event) => { const value = event.target.value; setSearch(value); if (selectedArticle && normalize(value) !== normalize(getReferenceLabel(selectedArticle)) && normalize(value) !== normalize(selectedArticle.code)) { setSelectedArticle(null); setPesoActual(""); setRollosCerrados("0"); } }} placeholder="Buscar rinde..." className="h-11 rounded-2xl border-slate-200 bg-slate-50 text-sm shadow-none" />
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {filteredAvailableRindes.map((item) => (
                    <button key={`${item.articleCode}-${item.referenceLabel || ""}`} type="button" onClick={() => handleSelectArticle(toArticle(item))} className={`w-full rounded-2xl border px-4 py-3 text-left ${normalize(item.articleCode) === normalize(selectedArticle?.code) ? "border-emerald-300 bg-emerald-50/70" : "border-slate-200 bg-white hover:bg-emerald-50/40"}`}>
                      <p className="font-semibold text-slate-900">{getReferenceLabel(item) || item.articleCode}</p>
                      <p className="mt-1 text-sm text-slate-600">{renderRindeMeta(item)}</p>
                    </button>
                  ))}
                </div>
                <div data-tour="rinde-article" className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{selectedArticle ? getReferenceLabel(selectedArticle) || selectedArticle.code : "Seleccioná una referencia"}</p>
                  <p className="mt-1 text-sm text-slate-600">{renderReferenceSummary()}</p>
                </div>
                <div className="grid gap-3 min-[390px]:grid-cols-2" data-tour="rinde-inputs">
                  <div><label className="mb-2 block text-sm font-semibold text-slate-800">Peso del rollo abierto</label><Input value={pesoActual} onChange={(event) => setPesoActual(event.target.value)} inputMode="decimal" placeholder="Ej. 6,00" className="h-11 rounded-2xl" /></div>
                  <div><label className="mb-2 block text-sm font-semibold text-slate-800">Rollos cerrados</label><Input value={rollosCerrados} onChange={(event) => setRollosCerrados(event.target.value)} inputMode="numeric" placeholder="Ej. 2" className="h-11 rounded-2xl" /></div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-4">
            <Card className="border-emerald-200 bg-emerald-50/70 shadow-none" data-tour="rinde-result">
              <CardHeader className="pb-3"><CardTitle className="text-lg text-slate-950">Resultado estimado</CardTitle><CardDescription>Buscá y seleccioná una referencia para calcular metros disponibles.</CardDescription></CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="rounded-[24px] border border-emerald-200 bg-white px-4 py-4 text-center shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Rinde estimado</p><p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{resultSummary}</p><p className="mt-2 text-sm text-slate-600">{calculation.message}</p></div>
                <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Abierto</p><p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(calculation.abierto)} m</p></div><div className="rounded-2xl border border-slate-200 bg-white px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cerrados</p><p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(calculation.cerrados)} m</p></div><div className="rounded-2xl border border-slate-200 bg-white px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p><p className="mt-1 text-lg font-semibold text-emerald-700">{formatNumber(calculation.total)} m</p></div></div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-none" data-tour="rinde-reference"><CardHeader className="pb-3"><CardTitle className="text-lg">Referencia técnica</CardTitle><CardDescription>{renderReferenceSummary()}</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ancho</p><p className="mt-1 text-lg font-semibold text-slate-900">{rindeQuery.data?.rinde ? `${formatNumber(rindeQuery.data.rinde.anchoCm, 0)} cm` : "-"}</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Última actualización</p><p className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(rindeQuery.data?.rinde?.updatedAt)}</p><p className="mt-1 text-xs text-slate-500">{rindeQuery.data?.rinde?.updatedBy || "CDD"}</p></div></CardContent></Card>
            <Card className="border-slate-200 shadow-none" data-tour="rinde-master"><CardContent className="flex flex-col gap-3 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900">Maestro de Rindes</p><p className="text-sm text-slate-500">Acceso protegido para crear, editar o desactivar referencias.</p></div><Button type="button" variant="outline" className="rounded-2xl" onClick={() => adminUnlocked ? setAdminPanelOpen((value) => !value) : setAuthDialogOpen(true)}><Lock className="mr-2 h-4 w-4" />Administrar rindes</Button></div>{adminUnlocked && adminPanelOpen ? <div className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-4"><Input value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} placeholder="Buscar referencia..." className="h-11 rounded-2xl" /><div className="grid gap-3 sm:grid-cols-2"><Input value={form.referenceLabel} onChange={(event) => setForm((current) => ({ ...current, referenceLabel: event.target.value }))} placeholder="Referencia" className="h-11 rounded-2xl sm:col-span-2" /><Input value={form.anchoCm} onChange={(event) => setForm((current) => ({ ...current, anchoCm: event.target.value }))} placeholder="Ancho" className="h-11 rounded-2xl" /><Input value={form.pesoReferenciaKg} onChange={(event) => setForm((current) => ({ ...current, pesoReferenciaKg: event.target.value }))} placeholder="Peso ref." className="h-11 rounded-2xl" /><Input value={form.metrosReferencia} onChange={(event) => setForm((current) => ({ ...current, metrosReferencia: event.target.value }))} placeholder="Metros ref." className="h-11 rounded-2xl" /><label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm"><input type="checkbox" checked={form.activo} onChange={(event) => setForm((current) => ({ ...current, activo: event.target.checked }))} />Activo</label></div><div className="flex flex-wrap gap-2"><Button type="button" className="rounded-2xl bg-emerald-600 hover:bg-emerald-700" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>{saveMutation.isPending ? "Guardando..." : "Guardar rinde"}</Button><Button type="button" variant="outline" className="rounded-2xl" onClick={handleCreateNewRinde}><Plus className="mr-2 h-4 w-4" />Nuevo</Button></div><div className="max-h-64 space-y-2 overflow-y-auto pr-1">{filteredAdminRindes.map((item) => <div key={`${item.articleCode}-${item.referenceLabel || ""}`} className="rounded-2xl border border-slate-200 px-4 py-3"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{getReferenceLabel(item) || item.articleCode}</p><p className="mt-1 text-sm text-slate-600">{renderRindeMeta(item)}</p></div><div className="flex items-center gap-2"><Button type="button" variant="ghost" size="sm" className="rounded-full px-3" onClick={() => handleSelectArticle(toArticle(item), "admin")}><Pencil className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="sm" className="rounded-full px-3 text-rose-600 hover:text-rose-700" onClick={() => setDeleteCandidate(item)}><Trash2 className="h-4 w-4" /></Button></div></div></div>)}</div></div> : null}</CardContent></Card>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5 md:px-6 md:py-5">
        <div className="space-y-3 md:space-y-4">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-3 md:p-4" data-tour="rinde-branch">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="rounded-2xl bg-sky-50 p-2.5 text-sky-700 shadow-sm"><ClipboardList className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
                    <h3 className="text-lg font-bold text-slate-950 md:text-xl">Inventario actual</h3>
                    <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">{selectedBranch ? `Inventario · ${selectedBranch}` : "Inventario · sin sucursal"}</span>
                    <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">{inventorySummary.rowCount} registros</span>
                    <span className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Total {formatNumber(inventorySummary.totalMeters)} m</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">La carga rápida queda primero; los datos técnicos y la descarga siguen accesibles sin estorbar el trabajo operativo.</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end" data-tour="rinde-inventory-export">
                <Button type="button" variant="outline" className="h-10 rounded-2xl bg-white px-4" disabled={!inventoryPayload?.items.length} onClick={() => inventoryPayload && downloadInventoryExcel(inventoryPayload)}><Download className="mr-2 h-4 w-4" />Excel</Button>
                <Button type="button" className="h-10 rounded-2xl bg-slate-900 px-4 hover:bg-slate-800" disabled={!currentSessionId || !inventoryItems.length || finalizeInventoryMutation.isPending} onClick={() => { if (window.confirm("¿Finalizar este inventario? Se descargará el Excel y la sesión dejará de estar activa.")) finalizeInventoryMutation.mutate(); }}>{finalizeInventoryMutation.isPending ? "Finalizando..." : "Finalizar"}</Button>
              </div>
            </div>
            <div className="mt-3 grid min-w-0 gap-3 xl:grid-cols-[220px_minmax(0,1fr)] xl:items-start">
              <div className="min-w-0 space-y-3 rounded-[22px] border border-slate-200 bg-white p-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sucursal</p>
                  <select value={selectedBranch} onChange={(event) => { setSelectedBranch(event.target.value as Branch | ""); resetInventoryForm(); }} className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-none outline-none focus:border-emerald-500">
                    <option value="">Seleccionar sucursal...</option>
                    {AVAILABLE_BRANCHES.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
                  </select>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                  {currentSessionId ? <>Sesión activa <span className="font-semibold text-slate-900">{currentSessionId.slice(0, 8)}</span></> : "Elegí una sucursal e iniciá un inventario activo para no mezclar relevamientos."}
                </div>
                {!currentSessionId ? <Button type="button" className="h-11 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700" disabled={!selectedBranch || createSessionMutation.isPending} onClick={() => { if (!selectedBranch) return; createSessionMutation.mutate(selectedBranch); }}>{createSessionMutation.isPending ? "Iniciando..." : "Iniciar inventario"}</Button> : null}
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5"><p className="font-semibold uppercase tracking-wide text-slate-500">Abiertos</p><p className="mt-1 text-sm font-semibold text-slate-900">{formatNumber(inventorySummary.openMeters)} m</p></div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5"><p className="font-semibold uppercase tracking-wide text-slate-500">Cerrados</p><p className="mt-1 text-sm font-semibold text-slate-900">{formatNumber(inventorySummary.closedMeters)} m</p></div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5"><p className="font-semibold uppercase tracking-wide text-slate-500">Rollos</p><p className="mt-1 text-sm font-semibold text-slate-900">{inventorySummary.closedRolls}</p></div>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5"><p className="font-semibold uppercase tracking-wide text-emerald-700">Total</p><p className="mt-1 text-sm font-semibold text-emerald-700">{formatNumber(inventorySummary.totalMeters)} m</p></div>
                </div>
              </div>
              <Card className="min-w-0 border-slate-200 shadow-none" data-tour="rinde-inventory-form">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Carga rápida</CardTitle>
                  <CardDescription>Buscá, cargá peso y seguí con la siguiente tela sin salir de esta barra operativa.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {inventoryInlineError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{inventoryInlineError}</div> : null}
                  <div className="grid gap-2.5 md:grid-cols-[minmax(0,1.7fr)_140px_120px_auto] xl:grid-cols-[minmax(0,1.9fr)_150px_120px_160px_auto]">
                    <div className="relative md:col-span-4 xl:col-span-1">
                      <Input ref={inventorySearchInputRef} value={inventorySearch} onFocus={() => setInventorySearchOpen(true)} onBlur={() => { inventorySearchBlurTimer.current = window.setTimeout(() => setInventorySearchOpen(false), 120); }} onChange={(event) => { setInventorySearch(event.target.value); setInventorySearchOpen(true); if (inventorySelectedRinde && normalize(event.target.value) !== normalize(getReferenceLabel(inventorySelectedRinde))) setInventorySelectedRinde(null); }} placeholder="Buscar rinde..." className="h-11 rounded-2xl border-slate-200 bg-white text-sm shadow-none" disabled={!currentSessionId || inventorySessionQuery.isLoading} />
                      {inventorySearchOpen && inventorySuggestions.length > 0 ? <div className="absolute z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">{inventorySuggestions.map((item) => <button key={`${item.articleCode}-${item.referenceLabel || ""}`} type="button" className="flex w-full flex-col rounded-xl px-3 py-2 text-left hover:bg-emerald-50" onMouseDown={(event) => event.preventDefault()} onClick={() => { if (inventorySearchBlurTimer.current) window.clearTimeout(inventorySearchBlurTimer.current); handleSelectInventoryRinde(item); }}><span className="font-semibold text-slate-900">{getReferenceLabel(item) || item.articleCode}</span><span className="text-xs text-slate-500">{renderRindeMeta(item)}</span></button>)}</div> : null}
                    </div>
                    <Input ref={pesoInputRef} value={inventoryPeso} onChange={(event) => setInventoryPeso(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); rollosInputRef.current?.focus(); rollosInputRef.current?.select(); } }} inputMode="decimal" placeholder="Peso kg" className="h-11 rounded-2xl" disabled={!currentSessionId || inventorySessionQuery.isLoading} />
                    <Input ref={rollosInputRef} value={inventoryRollos} onChange={(event) => setInventoryRollos(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); upsertInventoryItemMutation.mutate(); } }} inputMode="numeric" placeholder="Rollos" className="h-11 rounded-2xl" disabled={!currentSessionId || inventorySessionQuery.isLoading} />
                    <Input value={inventoryObservation} onChange={(event) => setInventoryObservation(event.target.value)} placeholder="Obs." className="h-11 rounded-2xl" disabled={!currentSessionId || inventorySessionQuery.isLoading} />
                    <div className="flex gap-2 md:col-span-4 xl:col-span-1 xl:flex-col">
                      <Button type="button" className="h-11 flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700" disabled={!currentSessionId || upsertInventoryItemMutation.isPending || !inventorySelectedRinde} onClick={() => upsertInventoryItemMutation.mutate()}>{upsertInventoryItemMutation.isPending ? "Guardando..." : editingItemId ? "Guardar" : "+ Agregar"}</Button>
                      {(editingItemId || inventorySelectedRinde || inventoryPeso || inventoryRollos !== "0" || inventoryObservation) ? <Button type="button" variant="outline" className="h-11 rounded-2xl px-3 xl:h-10" onClick={resetInventoryForm}><X className="h-4 w-4" /></Button> : null}
                    </div>
                  </div>
                  <div className="grid gap-2.5 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Referencia activa</p>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-900">{inventorySelectedRinde ? getReferenceLabel(inventorySelectedRinde) || inventorySelectedRinde.articleCode : "Elegí un rinde"}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{inventorySelectedRinde ? renderRindeMeta(inventorySelectedRinde) : "Ancho, kg/m y metros por rollo se completan automáticamente."}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Abiertos</p><p className="mt-1 text-sm font-semibold text-slate-900">{formatNumber(inventoryCalculation.openMeters)} m</p></div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Cerrados</p><p className="mt-1 text-sm font-semibold text-slate-900">{formatNumber(inventoryCalculation.closedMeters)} m</p></div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Total estimado</p><p className="mt-1 text-sm font-semibold text-emerald-700">{formatNumber(inventoryCalculation.totalMeters)} m</p></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          <Accordion type="multiple" value={inventoryMobileSections} onValueChange={setInventoryMobileSections} className="rounded-[24px] border border-slate-200 bg-white px-4 shadow-sm md:hidden" data-tour="rinde-inventory-summary-mobile"><AccordionItem value="summary"><AccordionTrigger className="py-4 text-left text-sm font-semibold text-slate-900 hover:no-underline"><div><p>{inventorySummary.rowCount} artículos · Total {formatNumber(inventorySummary.totalMeters)} m</p><p className="mt-1 text-xs font-normal text-slate-500">Abiertos {formatNumber(inventorySummary.openMeters)} m · Cerrados {formatNumber(inventorySummary.closedMeters)} m</p></div></AccordionTrigger><AccordionContent><div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"><p>{inventorySummary.closedRolls} rollos cerrados · Sesión {currentSessionId ? currentSessionId.slice(0, 8) : "sin iniciar"}</p><p>Excel y finalizar quedan disponibles arriba para cerrar el inventario cuando termines.</p></div></AccordionContent></AccordionItem></Accordion>
          {inventorySessionQuery.isLoading && currentSessionId ? <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">Cargando inventario activo...</div> : null}
          {inventorySessionQuery.isError && currentSessionId ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-700">No pudimos recuperar la sesión activa. Probá iniciar un inventario nuevo.</div> : null}
          <div className="hidden overflow-hidden rounded-[24px] border border-slate-200 bg-white md:block" data-tour="rinde-inventory-list">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>Referencia | Peso kg | Abiertos | Rollos | Cerrados | Total | Obs.</span>
              <span>{inventorySummary.rowCount} filas</span>
            </div>
            <div className="max-h-[28rem] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-white text-slate-600">
                  <tr className="border-b border-slate-200">
                    {['Referencia','Peso kg','Abiertos m','Rollos','Cerrados m','Total m','Obs.','Acciones'].map((label) => <th key={label} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide">{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {inventoryItems.length ? inventoryItems.map((item) => <tr key={item.id} className="border-b border-slate-100 align-middle hover:bg-slate-50/80"><td className="px-3 py-2.5 min-w-[240px]"><p className="font-semibold leading-tight text-slate-900">{item.referenceLabel}</p><p className="mt-0.5 text-[11px] leading-tight text-slate-500">{formatNumber(item.anchoCm, 0)} cm · {formatNumber(item.kgPorMetro, 4)} kg/m · {formatNumber(item.metrosReferencia)} m/rollo</p></td><td className="px-3 py-2.5 font-medium text-slate-700">{formatNumber(item.pesoKg)}</td><td className="px-3 py-2.5 font-medium text-slate-900">{formatNumber(item.metrosAbiertos)} m</td><td className="px-3 py-2.5 text-slate-700">{item.rollosCerrados}</td><td className="px-3 py-2.5 font-medium text-slate-900">{formatNumber(item.metrosCerrados)} m</td><td className="px-3 py-2.5 font-semibold text-emerald-700">{formatNumber(item.totalMetros)} m</td><td className="px-3 py-2.5 max-w-[180px] text-xs text-slate-600">{item.observacion || '—'}</td><td className="px-3 py-2.5"><div className="flex items-center gap-1"><Button type="button" size="sm" variant="ghost" className="h-9 w-9 rounded-full p-0" onClick={() => handleEditInventoryItem(item)}><Pencil className="h-4 w-4" /></Button><Button type="button" size="sm" variant="ghost" className="h-9 w-9 rounded-full p-0 text-rose-600 hover:text-rose-700" onClick={() => handleDeleteInventoryItem(item)}><Trash2 className="h-4 w-4" /></Button></div></td></tr>) : <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">Todavía no cargaste filas en este inventario.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <div className="space-y-2 md:hidden" data-tour="rinde-inventory-list-mobile">
            <div className="max-h-[25rem] overflow-y-auto rounded-[24px] border border-slate-200 bg-white p-2.5">
              {inventoryItems.length ? inventoryItems.map((item) => <div key={item.id} className="flex items-center justify-between gap-2 border-b border-slate-100 px-1 py-2.5 last:border-b-0"><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="truncate pr-2 text-sm font-semibold text-slate-900">{item.referenceLabel}</p><span className="shrink-0 text-sm font-semibold text-emerald-700">{formatNumber(item.totalMetros)} m</span></div><p className="mt-0.5 text-xs text-slate-500">{formatNumber(item.pesoKg)} kg · {item.rollosCerrados} rollos</p><p className="mt-0.5 text-xs text-slate-500">Abierto {formatNumber(item.metrosAbiertos)} · Cerrado {formatNumber(item.metrosCerrados)}</p>{item.observacion ? <p className="mt-0.5 truncate text-xs text-slate-400">{item.observacion}</p> : null}</div><div className="flex shrink-0 items-center gap-1"><Button type="button" size="sm" variant="ghost" className="h-11 w-11 rounded-full p-0" onClick={() => handleEditInventoryItem(item)}><Pencil className="h-4 w-4" /></Button><Button type="button" size="sm" variant="ghost" className="h-11 w-11 rounded-full p-0 text-rose-600 hover:text-rose-700" onClick={() => handleDeleteInventoryItem(item)}><Trash2 className="h-4 w-4" /></Button></div></div>) : <p className="py-6 text-center text-sm text-slate-500">Todavía no cargaste filas en este inventario.</p>}
            </div>
          </div>
        </div>
      </section>
      <Dialog open={Boolean(deleteCandidate)} onOpenChange={(open) => { if (!open) setDeleteCandidate(null); }}><DialogContent className="max-w-md rounded-[28px] border-slate-200 p-0"><div className="p-6"><DialogHeader><DialogTitle className="flex items-center gap-2 text-xl"><Trash2 className="h-5 w-5 text-rose-600" /> ¿Eliminar este rinde?</DialogTitle><DialogDescription>Dejará de estar disponible para las sucursales.</DialogDescription></DialogHeader><div className="mt-5 flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" className="rounded-2xl" onClick={() => setDeleteCandidate(null)}>Cancelar</Button><Button type="button" className="rounded-2xl bg-rose-600 hover:bg-rose-700" disabled={!deleteCandidate || deactivateMutation.isPending} onClick={() => deleteCandidate && deactivateMutation.mutate(deleteCandidate)}>{deactivateMutation.isPending ? "Eliminando..." : "Eliminar"}</Button></div></div></DialogContent></Dialog>
      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}><DialogContent className="max-w-md rounded-[28px] border-slate-200 p-0"><div className="p-6"><DialogHeader><DialogTitle className="flex items-center gap-2 text-xl"><ShieldCheck className="h-5 w-5 text-emerald-700" /> Administrar rindes</DialogTitle><DialogDescription>Ingresá la contraseña del sector CDD para editar el maestro de rinde.</DialogDescription></DialogHeader><div className="mt-5 space-y-3"><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Contraseña de CDD" className="h-12 rounded-2xl" /><Button type="button" className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700" disabled={authMutation.isPending} onClick={() => authMutation.mutate()}>{authMutation.isPending ? "Validando..." : "Validar acceso"}</Button></div></div></DialogContent></Dialog>
    </div>
  );
}

