import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, Lock, Pencil, Plus, Ruler, Search, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { buildApiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type Article = {
  code: string;
  description?: string | null;
  synonym?: string | null;
  codigoBase?: string | null;
  descripcionBase?: string | null;
  hasRinde?: boolean;
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
  hasRinde: item.activo !== false,
  active: item.activo,
  anchoCm: item.anchoCm,
  metrosReferencia: item.metrosReferencia,
  kgPorMetro: item.kgPorMetro,
  referenceLabel: item.referenceLabel,
});

export default function RindePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 220);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedAdminSearch(adminSearch.trim());
    }, 220);
    return () => window.clearTimeout(timer);
  }, [adminSearch]);

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
      setForm((current) => ({
        ...current,
        referenceLabel: getReferenceLabel(selectedArticle),
      }));
      return;
    }

    setForm({
      referenceLabel: "",
      anchoCm: "",
      pesoReferenciaKg: "",
      metrosReferencia: "",
      activo: true,
    });
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
    if (!selectedArticle) {
      return { abierto: 0, cerrados: 0, total: 0, valid: false, message: "Elegí una referencia de rinde para calcular." };
    }
    if (!rindeQuery.data?.rinde || rindeQuery.data.rinde.activo === false) {
      return { abierto: 0, cerrados: 0, total: 0, valid: false, message: "Esta referencia todavía no tiene parámetros activos." };
    }
    if (!Number.isFinite(kgPorMetro) || kgPorMetro <= 0) {
      return { abierto: 0, cerrados: 0, total: 0, valid: false, message: "Los parámetros de referencia están incompletos o tienen valores inválidos." };
    }
    if (pesoActual && (!Number.isFinite(pesoActualNumber) || pesoActualNumber <= 0)) {
      return { abierto: 0, cerrados: 0, total: 0, valid: false, message: "Ingresá un peso mayor a 0." };
    }
    if (rollosCerrados && (!Number.isFinite(rollosCerradosNumber) || rollosCerradosNumber < 0)) {
      return { abierto: 0, cerrados: 0, total: 0, valid: false, message: "Ingresá una cantidad de rollos válida." };
    }

    const abierto = pesoActualNumber > 0 ? pesoActualNumber / kgPorMetro : 0;
    const cerrados = rollosCerradosNumber > 0 ? rollosCerradosNumber * metrosReferencia : 0;
    return {
      abierto,
      cerrados,
      total: abierto + cerrados,
      valid: true,
      message: "Resultado estimado listo para usar.",
    };
  }, [selectedArticle, rindeQuery.data, kgPorMetro, pesoActual, pesoActualNumber, rollosCerrados, rollosCerradosNumber, metrosReferencia]);

  const authMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(buildApiUrl("/api/rindes/auth"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo validar la contraseña.");
      return payload;
    },
    onSuccess: () => {
      setValidatedPassword(password.trim());
      setAdminUnlocked(true);
      setAdminPanelOpen(true);
      setPassword("");
      setMobileSections((current) => Array.from(new Set([...current, "maestro", "referencia"])));
      setAuthDialogOpen(false);
      toast({ variant: "success", title: "Acceso habilitado", description: "Ya podés administrar los parámetros de rinde de CDD." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Contraseña incorrecta", description: error.message });
    },
  });

  const clearSelectedArticle = ({ closeAdminPanel = false }: { closeAdminPanel?: boolean } = {}) => {
    setSelectedArticle(null);
    setPesoActual("");
    setRollosCerrados("0");
    if (closeAdminPanel) {
      setAdminPanelOpen(false);
    }
  };

  const handleSelectArticle = (article: Article, source: "main" | "admin" = "main") => {
    setSelectedArticle(article);
    const reference = getReferenceLabel(article) || article.code;
    setSearch(reference);
    setAdminSearch(reference);
    setPesoActual("");
    setRollosCerrados("0");
    setMobileSections((current) => Array.from(new Set([...current, "referencia", ...(adminUnlocked ? ["maestro"] : [])])));
    if (source === "admin") {
      setAdminPanelOpen(true);
    }
  };

  const handleCreateNewRinde = () => {
    const seed = adminSearch.trim();
    setSelectedArticle(null);
    setPesoActual("");
    setRollosCerrados("0");
    setForm({
      referenceLabel: seed,
      anchoCm: "",
      pesoReferenciaKg: "",
      metrosReferencia: "",
      activo: true,
    });
    setMobileSections((current) => Array.from(new Set([...current, "maestro"])));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!validatedPassword) throw new Error("Volvé a validar la contraseña del sector CDD antes de guardar.");

      const reference = (form.referenceLabel || getReferenceLabel(selectedArticle)).trim();
      if (!reference) throw new Error("Ingresá la referencia de rinde.");

      const anchoCm = parseDecimal(form.anchoCm);
      const pesoReferenciaKgValue = parseDecimal(form.pesoReferenciaKg);
      const metrosReferenciaValue = parseDecimal(form.metrosReferencia);
      const kgPorMetroValue = pesoReferenciaKgValue / metrosReferenciaValue;

      if (![anchoCm, pesoReferenciaKgValue, metrosReferenciaValue, kgPorMetroValue].every((value) => Number.isFinite(value) && value > 0)) {
        throw new Error("Completá ancho, peso y metros de referencia con valores mayores a 0.");
      }

      const currentCode = selectedArticle?.code?.trim() || "";
      const isEditingExisting = Boolean(rindeQuery.data?.rinde && currentCode);
      const url = isEditingExisting ? buildApiUrl(`/api/rindes/${encodeURIComponent(currentCode)}`) : buildApiUrl("/api/rindes");

      const response = await fetch(url, {
        method: isEditingExisting ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-rinde-password": validatedPassword,
        },
        body: JSON.stringify({
          articleCode: currentCode || reference,
          referenceLabel: reference,
          anchoCm,
          pesoReferenciaKg: pesoReferenciaKgValue,
          metrosReferencia: metrosReferenciaValue,
          kgPorMetro: kgPorMetroValue,
          activo: form.activo,
          updatedBy,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo guardar el rinde.");
      return { payload, reference, isEditingExisting };
    },
    onSuccess: async ({ payload, reference, isEditingExisting }) => {
      const nextCode = payload.articleCode || payload.article_code || selectedArticle?.code || reference;
      setSelectedArticle({
        code: nextCode,
        referenceLabel: payload.referenceLabel || reference,
        hasRinde: payload.activo !== false,
        active: payload.activo !== false,
        anchoCm: payload.anchoCm ?? null,
        metrosReferencia: payload.metrosReferencia ?? null,
        kgPorMetro: payload.kgPorMetro ?? null,
      });
      setSearch(payload.referenceLabel || reference);
      setAdminSearch(payload.referenceLabel || reference);
      await queryClient.invalidateQueries({ queryKey: ["rindes-activos"] });
      await queryClient.invalidateQueries({ queryKey: ["rindes-admin"] });
      await queryClient.invalidateQueries({ queryKey: ["rinde-config", nextCode] });
      toast({ variant: "success", title: isEditingExisting ? "Rinde actualizado" : "Rinde guardado", description: isEditingExisting ? "Los nuevos parámetros ya están disponibles para las sucursales." : "La referencia ya quedó disponible para las sucursales." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "No se pudo guardar", description: error.message });
    },
  });
  const deactivateMutation = useMutation({
    mutationFn: async (candidate: AvailableRinde) => {
      if (!validatedPassword) throw new Error("Volvé a validar la contraseña del sector CDD antes de eliminar.");
      const response = await fetch(buildApiUrl(`/api/rindes/${encodeURIComponent(candidate.articleCode)}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-rinde-password": validatedPassword,
        },
        body: JSON.stringify({
          articleCode: candidate.articleCode,
          referenceLabel: candidate.referenceLabel || candidate.articleCode,
          anchoCm: Number(candidate.anchoCm || 0),
          pesoReferenciaKg: Number(candidate.pesoReferenciaKg || 0),
          metrosReferencia: Number(candidate.metrosReferencia || 0),
          kgPorMetro: Number(candidate.kgPorMetro || 0),
          activo: false,
          updatedBy,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo desactivar el rinde.");
      return payload;
    },
    onSuccess: async () => {
      setDeleteCandidate(null);
      clearSelectedArticle();
      await queryClient.invalidateQueries({ queryKey: ["rindes-activos"] });
      await queryClient.invalidateQueries({ queryKey: ["rindes-admin"] });
      toast({ variant: "warning", title: "Rinde desactivado", description: "Dejó de estar disponible para las sucursales." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "No se pudo eliminar", description: error.message });
    },
  });

  const handleClear = () => {
    setPesoActual("");
    setRollosCerrados("0");
  };

  const selectedSearchValue = selectedArticle ? [selectedArticle.code, getReferenceLabel(selectedArticle)].filter(Boolean).map((value) => normalize(value)) : [];

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

  const resultSummary = calculation.valid ? `${formatNumber(calculation.total)} m estimados` : selectedArticle ? calculation.message : "Elegí una referencia para empezar";

  const renderReferenceSummary = () => {
    const rinde = rindeQuery.data?.rinde;
    if (!rinde) return "Sin parámetros activos todavía";
    return `${formatNumber(rinde.anchoCm, 0)} cm · ${formatNumber(rinde.kgPorMetro, 4)} kg/m · ${formatNumber(rinde.metrosReferencia)} m/rollo`;
  };

  const renderRindeMeta = (item: { anchoCm?: number | null; kgPorMetro?: number | null; metrosReferencia?: number | null }) => {
    if (!item.anchoCm || !item.kgPorMetro || !item.metrosReferencia) return "Parámetros pendientes";
    return `${formatNumber(item.anchoCm, 0)} cm · ${formatNumber(item.kgPorMetro, 4)} kg/m · ${formatNumber(item.metrosReferencia)} m/rollo`;
  };

  const renderSelectedArticleCard = () => {
    if (!selectedArticle) {
      return <p className="text-sm text-slate-500">Seleccioná una referencia para ver sus parámetros y calcular el estimado.</p>;
    }

    return (
      <div data-tour="rinde-article" className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-semibold text-slate-950">✓ {getReferenceLabel(selectedArticle) || selectedArticle.code}</p>
            <p className="mt-1 text-sm text-slate-600">{renderReferenceSummary()}</p>
          </div>
          <Badge className="rounded-full bg-emerald-100 text-emerald-700">Seleccionado</Badge>
        </div>
      </div>
    );
  };

  const renderAvailableRindes = (mobile = false) => {
    if (activeRindesQuery.isLoading) return <p className="text-sm text-slate-500">Cargando rindes disponibles...</p>;
    if (activeRindesQuery.isError) return <p className="text-sm text-rose-600">No pudimos cargar los rindes configurados.</p>;
    if (!filteredAvailableRindes.length) return <p className="text-sm text-slate-500">No hay rindes activos que coincidan con esa búsqueda.</p>;

    return (
      <div className={`space-y-2 ${mobile ? "" : "max-h-80 overflow-y-auto pr-1"}`}>
        {filteredAvailableRindes.map((item) => {
          const reference = getReferenceLabel(item) || item.articleCode;
          const selected = normalize(reference) === normalize(getReferenceLabel(selectedArticle)) || normalize(item.articleCode) === normalize(selectedArticle?.code);
          return (
            <button key={`${item.articleCode}-${reference}`} type="button" onClick={() => handleSelectArticle(toArticle(item), "main")} className={`flex w-full items-start justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition ${selected ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/50"}`}>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{selected ? `✓ ${reference}` : reference}</p>
                <p className="mt-1 text-sm text-slate-600">{renderRindeMeta(item)}</p>
              </div>
              <Badge variant="outline" className={selected ? "border-emerald-300 text-emerald-700" : "border-slate-200 text-slate-600"}>{selected ? "Activo" : "Elegir"}</Badge>
            </button>
          );
        })}
      </div>
    );
  };

  const renderAdminConfigurator = () => {
    const editingExisting = Boolean(rindeQuery.data?.rinde && selectedArticle?.code);
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">Maestro de Rindes</p>
            <p className="text-xs text-slate-500">Creá, editá o desactivá referencias administradas por CDD.</p>
          </div>
          <Button type="button" variant="outline" className="rounded-2xl" onClick={handleCreateNewRinde}><Plus className="mr-2 h-4 w-4" />Nuevo rinde</Button>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-800">Rindes configurados</label>
          <Input value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} placeholder="Buscar referencia..." className="h-11 rounded-2xl border-slate-200 bg-white text-sm shadow-none" />
        </div>
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">{editingExisting ? "Editar rinde" : "Nuevo rinde"}</p>
            <p className="text-xs text-slate-500">Nombre con el que las sucursales encontrarán esta tela.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="mb-2 block text-sm font-semibold text-slate-800">Referencia de rinde</label><Input value={form.referenceLabel} onChange={(event) => setForm((current) => ({ ...current, referenceLabel: event.target.value }))} placeholder="Ej: 148L (C)" className="h-11 rounded-2xl" /></div>
            <div><label className="mb-2 block text-sm font-semibold text-slate-800">Ancho</label><div className="relative"><Input value={form.anchoCm} onChange={(event) => setForm((current) => ({ ...current, anchoCm: event.target.value }))} inputMode="decimal" placeholder="160" className="h-11 rounded-2xl pr-12" /><span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-slate-500">cm</span></div></div>
            <div><label className="mb-2 block text-sm font-semibold text-slate-800">Peso de referencia</label><div className="relative"><Input value={form.pesoReferenciaKg} onChange={(event) => setForm((current) => ({ ...current, pesoReferenciaKg: event.target.value }))} inputMode="decimal" placeholder="12" className="h-11 rounded-2xl pr-12" /><span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-slate-500">kg</span></div></div>
            <div><label className="mb-2 block text-sm font-semibold text-slate-800">Metros de referencia</label><div className="relative"><Input value={form.metrosReferencia} onChange={(event) => setForm((current) => ({ ...current, metrosReferencia: event.target.value }))} inputMode="decimal" placeholder="24" className="h-11 rounded-2xl pr-10" /><span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-slate-500">m</span></div></div>
            <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rinde calculado</p><p className="mt-1 text-lg font-semibold text-emerald-700">{Number.isFinite(kgPorMetro) && kgPorMetro > 0 ? `${formatNumber(kgPorMetro, 4)} kg/m` : "-"}</p></div>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.activo} onChange={(event) => setForm((current) => ({ ...current, activo: event.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />Activo</label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="rounded-2xl bg-emerald-600 hover:bg-emerald-700" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>{saveMutation.isPending ? "Guardando..." : editingExisting ? "Guardar cambios" : "Guardar rinde"}</Button>
            <Button type="button" variant="outline" className="rounded-2xl" onClick={() => { clearSelectedArticle(); setForm({ referenceLabel: "", anchoCm: "", pesoReferenciaKg: "", metrosReferencia: "", activo: true }); }}>Limpiar</Button>
          </div>
        </div>
        <div className="space-y-2">
          {adminRindesQuery.isLoading ? <p className="text-sm text-slate-500">Cargando rindes configurados...</p> : null}
          {adminRindesQuery.isError ? <p className="text-sm text-rose-600">No pudimos cargar los rindes configurados.</p> : null}
          {!adminRindesQuery.isLoading && !filteredAdminRindes.length ? <p className="text-sm text-slate-500">No encontramos referencias con esa búsqueda.</p> : null}
          {filteredAdminRindes.map((item) => {
            const selected = normalize(item.articleCode) === normalize(selectedArticle?.code) || normalize(getReferenceLabel(item)) === normalize(getReferenceLabel(selectedArticle));
            return <div key={`${item.articleCode}-${item.referenceLabel || ""}`} className={`rounded-2xl border px-4 py-3 ${selected ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200 bg-white"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-slate-900">{getReferenceLabel(item) || item.articleCode}</p><p className="mt-1 text-sm text-slate-600">{renderRindeMeta(item)}</p><p className="mt-1 text-xs text-slate-500">{item.activo === false ? "Inactivo" : `Actualizado ${formatDateTime(item.updatedAt)}`}</p></div><div className="flex items-center gap-2"><Button type="button" variant="ghost" size="sm" className="rounded-full px-3 text-slate-600 hover:text-slate-900" onClick={() => handleSelectArticle(toArticle(item), "admin")}><Pencil className="mr-2 h-4 w-4" />Editar</Button><Button type="button" variant="ghost" size="sm" className="rounded-full px-3 text-rose-600 hover:text-rose-700" onClick={() => setDeleteCandidate(item)}><Trash2 className="mr-2 h-4 w-4" />Eliminar</Button></div></div></div>;
          })}
        </div>
      </div>
    );
  };

  const resultCard = <Card className="border-emerald-200 bg-emerald-50/70 shadow-none" data-tour="rinde-result"><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-lg text-slate-950">Resultado estimado</CardTitle><CardDescription>Buscá y seleccioná una referencia para calcular metros disponibles.</CardDescription></div><div className="rounded-2xl bg-white p-2 text-emerald-700 shadow-sm"><Sparkles className="h-5 w-5" /></div></div></CardHeader><CardContent className="space-y-4 pt-0"><div className="rounded-[24px] border border-emerald-200 bg-white px-4 py-4 text-center shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Rinde estimado</p><p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{resultSummary}</p><p className="mt-2 text-sm text-slate-600">{calculation.message}</p></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Abierto</p><p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(calculation.abierto)} m</p></div><div className="rounded-2xl border border-slate-200 bg-white px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cerrados</p><p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(calculation.cerrados)} m</p></div><div className="rounded-2xl border border-slate-200 bg-white px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p><p className="mt-1 text-lg font-semibold text-emerald-700">{formatNumber(calculation.total)} m</p></div></div></CardContent></Card>;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 pb-28 pt-2 sm:px-4 md:gap-5 md:pb-8 md:pt-4">
      <section className="rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5 md:px-6 md:py-5">
        <div className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] md:items-start md:gap-5">
          <div className="space-y-4"><div className="flex items-start gap-3"><div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-700 shadow-sm"><Calculator className="h-5 w-5" /></div><div><h2 className="hidden text-2xl font-bold tracking-tight text-slate-950 md:block md:text-3xl">Calculadora de Rinde</h2><h2 className="text-xl font-bold tracking-tight text-slate-950 md:hidden">Calculadora de Rinde</h2><p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">por Jony Caro</p><p className="mt-1 max-w-2xl text-sm text-slate-600">Calculá los metros estimados de una tela según su peso.</p></div></div>
            <Card className="hidden border-slate-200 shadow-none md:block" data-tour="rinde-search"><CardHeader className="pb-3"><CardTitle className="text-base">Rindes disponibles</CardTitle><CardDescription>Elegí una tela ya medida y verificada por CDD.</CardDescription></CardHeader><CardContent className="space-y-4 pt-0"><div><label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"><Search className="h-4 w-4 text-emerald-600" />Buscar o seleccionar rinde</label><Input value={search} onChange={(event) => { const value = event.target.value; setSearch(value); if (selectedArticle && !selectedSearchValue.includes(normalize(value))) { clearSelectedArticle({ closeAdminPanel: true }); } }} placeholder="Buscar rinde..." className="h-11 rounded-2xl border-slate-200 bg-slate-50 text-sm shadow-none sm:h-12 sm:text-base" /></div>{renderAvailableRindes(false)}{renderSelectedArticleCard()}</CardContent></Card>
            <Card className="hidden border-slate-200 shadow-sm md:block" data-tour="rinde-inputs"><CardHeader className="pb-3"><CardTitle className="text-lg">Cálculo</CardTitle><CardDescription>Ingresá el peso del rollo abierto y, si corresponde, los rollos cerrados.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><div><label className="mb-2 block text-sm font-semibold text-slate-800">Peso del rollo abierto (kg)</label><Input value={pesoActual} onChange={(event) => setPesoActual(event.target.value)} inputMode="decimal" placeholder="Ej. 6,00" className="h-12 rounded-2xl" /></div><div><label className="mb-2 block text-sm font-semibold text-slate-800">Rollos cerrados</label><Input value={rollosCerrados} onChange={(event) => setRollosCerrados(event.target.value)} inputMode="numeric" placeholder="Ej. 2" className="h-12 rounded-2xl" /></div><div className="sm:col-span-2 flex flex-wrap gap-2"><Button type="button" variant="outline" className="rounded-2xl" onClick={handleClear}>Limpiar cálculo</Button><Badge variant="secondary" className="rounded-full bg-slate-100 px-3 py-2 text-slate-700">Referencia CDD: {renderReferenceSummary()}</Badge></div></CardContent></Card>
            <div className="space-y-3 md:hidden"><Card className="border-slate-200 shadow-none" data-tour="rinde-search-mobile"><CardHeader className="pb-3"><CardTitle className="text-base">Rindes disponibles</CardTitle><CardDescription>Elegí una tela ya medida y verificada por CDD.</CardDescription></CardHeader><CardContent className="space-y-4 pt-0"><label className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Search className="h-4 w-4 text-emerald-600" />Buscar o seleccionar rinde</label><Input value={search} onChange={(event) => { const value = event.target.value; setSearch(value); if (selectedArticle && !selectedSearchValue.includes(normalize(value))) { clearSelectedArticle({ closeAdminPanel: true }); } }} placeholder="Buscar rinde..." className="h-11 rounded-2xl border-slate-200 bg-slate-50 text-sm shadow-none" /><div className="max-h-64 overflow-y-auto">{renderAvailableRindes(true)}</div>{selectedArticle ? <div className="space-y-4">{renderSelectedArticleCard()}<div className="grid gap-3 min-[390px]:grid-cols-2" data-tour="rinde-inputs-mobile"><div><label className="mb-2 block text-sm font-semibold text-slate-800">Peso del rollo abierto</label><div className="relative"><Input value={pesoActual} onChange={(event) => setPesoActual(event.target.value)} inputMode="decimal" placeholder="Ej. 6,00" className="h-11 rounded-2xl pr-12" /><span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-slate-500">kg</span></div></div><div><label className="mb-2 block text-sm font-semibold text-slate-800">Rollos cerrados</label><div className="relative"><Input value={rollosCerrados} onChange={(event) => setRollosCerrados(event.target.value)} inputMode="numeric" placeholder="Ej. 2" className="h-11 rounded-2xl pr-16" /><span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-slate-500">rollos</span></div></div></div><Button type="button" variant="outline" className="h-10 rounded-2xl px-4" onClick={handleClear}>Limpiar cálculo</Button></div> : null}</CardContent></Card><Accordion type="multiple" value={mobileSections} onValueChange={setMobileSections} className="rounded-[24px] border border-slate-200 bg-white px-4 shadow-sm"><AccordionItem value="referencia" data-tour="rinde-reference-mobile"><AccordionTrigger className="py-4 text-left text-sm font-semibold text-slate-900 hover:no-underline"><div className="min-w-0"><p>Referencia técnica</p><p className="mt-1 truncate text-xs font-normal text-slate-500">{renderReferenceSummary()}</p></div></AccordionTrigger><AccordionContent><div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"><p>{renderReferenceSummary()}</p><p>Última actualización: {formatDateTime(rindeQuery.data?.rinde?.updatedAt)}</p></div></AccordionContent></AccordionItem><AccordionItem value="maestro" data-tour="rinde-master-mobile"><AccordionTrigger className="py-4 text-left text-sm font-semibold text-slate-900 hover:no-underline"><div><p>Maestro de Rindes · Solo CDD</p><p className="mt-1 text-xs font-normal text-slate-500">Acceso protegido para administrar referencias.</p></div></AccordionTrigger><AccordionContent><div className="space-y-3"><Button type="button" variant="outline" className="h-10 rounded-2xl px-4" onClick={() => adminUnlocked ? setAdminPanelOpen((value) => !value) : setAuthDialogOpen(true)}><Lock className="mr-2 h-4 w-4" />{adminUnlocked ? (adminPanelOpen ? "Ocultar edición" : "Administrar") : "Administrar"}</Button>{adminUnlocked && adminPanelOpen ? renderAdminConfigurator() : null}</div></AccordionContent></AccordionItem></Accordion></div>
          </div><div className="hidden md:flex md:flex-col md:gap-4">{resultCard}<Card className="border-slate-200 shadow-none" data-tour="rinde-reference"><CardHeader className="pb-3"><CardTitle className="text-lg">Referencia técnica</CardTitle><CardDescription>{renderReferenceSummary()}</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ancho</p><p className="mt-1 text-lg font-semibold text-slate-900">{rindeQuery.data?.rinde ? `${formatNumber(rindeQuery.data.rinde.anchoCm, 0)} cm` : "-"}</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Última actualización</p><p className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(rindeQuery.data?.rinde?.updatedAt)}</p><p className="mt-1 text-xs text-slate-500">{rindeQuery.data?.rinde?.updatedBy || "CDD"}</p></div></CardContent></Card><Card className="border-slate-200 shadow-none" data-tour="rinde-master"><CardContent className="flex flex-col gap-3 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900">Maestro de Rindes</p><p className="text-sm text-slate-500">Acceso protegido para crear, editar o desactivar referencias.</p></div><Button type="button" variant="outline" className="rounded-2xl" onClick={() => adminUnlocked ? setAdminPanelOpen((value) => !value) : setAuthDialogOpen(true)}><Lock className="mr-2 h-4 w-4" />Administrar rindes</Button></div>{adminUnlocked && adminPanelOpen ? renderAdminConfigurator() : null}</CardContent></Card></div></div></section>
      {selectedArticle ? <div className="fixed inset-x-3 bottom-[5.15rem] z-40 md:hidden" data-tour="rinde-result-mobile"><div className="w-full rounded-[22px] border border-emerald-200 bg-white/95 px-4 py-3 shadow-[0_18px_38px_-28px_rgba(5,150,105,0.45)] backdrop-blur"><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">Rinde estimado</p><p className="mt-1 text-base font-bold text-slate-950">{resultSummary}</p></div><div className="rounded-2xl bg-emerald-100 p-2 text-emerald-700"><Ruler className="h-5 w-5" /></div></div><div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-600"><div className="rounded-2xl bg-slate-50 px-2 py-2">Abierto<br /><span className="font-semibold text-slate-900">{formatNumber(calculation.abierto)} m</span></div><div className="rounded-2xl bg-slate-50 px-2 py-2">Cerrados<br /><span className="font-semibold text-slate-900">{formatNumber(calculation.cerrados)} m</span></div><div className="rounded-2xl bg-slate-50 px-2 py-2">Total<br /><span className="font-semibold text-emerald-700">{formatNumber(calculation.total)} m</span></div></div></div></div> : null}
      <Dialog open={Boolean(deleteCandidate)} onOpenChange={(open) => { if (!open) setDeleteCandidate(null); }}><DialogContent className="max-w-md rounded-[28px] border-slate-200 p-0"><div className="p-6"><DialogHeader><DialogTitle className="flex items-center gap-2 text-xl"><Trash2 className="h-5 w-5 text-rose-600" /> ¿Eliminar este rinde?</DialogTitle><DialogDescription>Dejará de estar disponible para las sucursales.</DialogDescription></DialogHeader><div className="mt-5 flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" className="rounded-2xl" onClick={() => setDeleteCandidate(null)}>Cancelar</Button><Button type="button" className="rounded-2xl bg-rose-600 hover:bg-rose-700" disabled={!deleteCandidate || deactivateMutation.isPending} onClick={() => deleteCandidate && deactivateMutation.mutate(deleteCandidate)}>{deactivateMutation.isPending ? "Eliminando..." : "Eliminar"}</Button></div></div></DialogContent></Dialog>
      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}><DialogContent className="max-w-md rounded-[28px] border-slate-200 p-0"><div className="p-6"><DialogHeader><DialogTitle className="flex items-center gap-2 text-xl"><ShieldCheck className="h-5 w-5 text-emerald-700" /> Administrar rindes</DialogTitle><DialogDescription>Ingresá la contraseña del sector CDD para editar el maestro de rinde.</DialogDescription></DialogHeader><div className="mt-5 space-y-3"><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Contraseña de CDD" className="h-12 rounded-2xl" /><Button type="button" className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700" disabled={authMutation.isPending} onClick={() => authMutation.mutate()}>{authMutation.isPending ? "Validando..." : "Validar acceso"}</Button></div></div></DialogContent></Dialog>
    </div>
  );
}
