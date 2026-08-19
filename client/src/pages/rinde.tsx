import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, Lock, Ruler, Search, ShieldCheck, Sparkles } from "lucide-react";
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
  const [form, setForm] = useState({
    referenceLabel: "",
    anchoCm: "",
    pesoReferenciaKg: "",
    metrosReferencia: "",
    activo: true,
  });
  const [mobileSections, setMobileSections] = useState<string[]>([]);

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
    if (!rindeQuery.data?.rinde) {
      setForm({ referenceLabel: "", anchoCm: "", pesoReferenciaKg: "", metrosReferencia: "", activo: true });
      return;
    }

    const rinde = rindeQuery.data.rinde;
    setForm({
      referenceLabel: rinde.referenceLabel || "",
      anchoCm: String(rinde.anchoCm),
      pesoReferenciaKg: String(rinde.pesoReferenciaKg),
      metrosReferencia: String(rinde.metrosReferencia),
      activo: rinde.activo,
    });
  }, [rindeQuery.data]);

  useEffect(() => {
    if (!rindeQuery.data?.article || !selectedArticle) return;
    const resolvedCode = normalize(rindeQuery.data.article.code);
    const currentCode = normalize(selectedArticle.code);
    const currentReference = normalize(getReferenceLabel(selectedArticle));
    if (resolvedCode && resolvedCode !== currentCode && resolvedCode !== currentReference) {
      setSelectedArticle((current) => current ? { ...current, ...rindeQuery.data!.article } : current);
      setAdminSearch(rindeQuery.data.article.code);
    }
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
      return { abierto: 0, cerrados: 0, total: 0, valid: false, message: "Buscá y seleccioná una tela para calcular el rinde." };
    }
    if (!rindeQuery.data?.rinde || rindeQuery.data.rinde.activo === false) {
      return { abierto: 0, cerrados: 0, total: 0, valid: false, message: "Esta referencia todavía no tiene parámetros de rinde." };
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
      message: "Resultado estimado listo para usar al lado de la balanza.",
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
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedArticle) throw new Error("Seleccioná un artículo antes de guardar.");
      if (!validatedPassword) throw new Error("Volvé a validar la contraseña del sector CDD antes de guardar.");

      const anchoCm = parseDecimal(form.anchoCm);
      const pesoReferenciaKgValue = parseDecimal(form.pesoReferenciaKg);
      const metrosReferenciaValue = parseDecimal(form.metrosReferencia);
      const kgPorMetroValue = pesoReferenciaKgValue / metrosReferenciaValue;

      if (![anchoCm, pesoReferenciaKgValue, metrosReferenciaValue, kgPorMetroValue].every((value) => Number.isFinite(value) && value > 0)) {
        throw new Error("Completá ancho, peso y metros de referencia con valores mayores a 0.");
      }

      const method = rindeQuery.data?.rinde ? "PATCH" : "POST";
      const url = method === "PATCH"
        ? buildApiUrl(`/api/rindes/${encodeURIComponent(selectedArticle.code)}`)
        : buildApiUrl("/api/rindes");

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-rinde-password": validatedPassword,
        },
        body: JSON.stringify({
          articleCode: selectedArticle.code,
          referenceLabel: form.referenceLabel.trim() || null,
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
      return payload;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rinde-config", selectedArticle?.code] });
      await queryClient.invalidateQueries({ queryKey: ["rindes-activos"] });
      await queryClient.invalidateQueries({ queryKey: ["rindes-admin"] });
      toast({ variant: "success", title: "Rinde guardado", description: "Los parámetros quedaron listos para la calculadora." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "No se pudo guardar", description: error.message });
    },
  });

  const clearSelectedArticle = ({ closeAdminPanel = false }: { closeAdminPanel?: boolean } = {}) => {
    setSelectedArticle(null);
    setForm({ referenceLabel: "", anchoCm: "", pesoReferenciaKg: "", metrosReferencia: "", activo: true });
    setPesoActual("");
    setRollosCerrados("0");
    if (closeAdminPanel) {
      setAdminPanelOpen(false);
    }
  };

  const handleSelectArticle = (article: Article, source: "main" | "admin" = "main") => {
    setSelectedArticle(article);
    setPesoActual("");
    setRollosCerrados("0");
    setSearch(source === "main" ? getReferenceLabel(article) || article.code : article.code);
    setAdminSearch(article.code);
    setMobileSections((current) => Array.from(new Set([...current, "referencia", ...(adminUnlocked ? ["maestro"] : [])])));
    if (source === "admin") {
      setAdminPanelOpen(true);
    }
  };

  const handleClear = () => {
    setPesoActual("");
    setRollosCerrados("0");
  };

  const resultSummary = calculation.valid
    ? `${formatNumber(calculation.total)} m estimados`
    : selectedArticle
      ? calculation.message
      : "Elegí una tela para empezar";

  const selectedSearchValue = selectedArticle
    ? [selectedArticle.code, getReferenceLabel(selectedArticle)].filter(Boolean).map((value) => normalize(value))
    : [];

  const shouldShowSearchPanel = debouncedSearch.length >= 1 && !selectedSearchValue.includes(normalize(search));

  const filteredAvailableRindes = useMemo(() => {
    const list = activeRindesQuery.data || [];
    const term = normalize(debouncedSearch || search);
    if (!term) return list;
    return list.filter((item) => [
      item.referenceLabel,
      item.articleCode,
      item.description,
      item.synonym,
    ].some((value) => normalize(value).includes(term)));
  }, [activeRindesQuery.data, debouncedSearch, search]);

  const filteredAdminRindes = useMemo(() => {
    const list = adminRindesQuery.data || [];
    const term = normalize(debouncedAdminSearch || adminSearch);
    if (!term) return list;
    return list.filter((item) => [
      item.referenceLabel,
      item.articleCode,
      item.description,
    ].some((value) => normalize(value).includes(term)));
  }, [adminRindesQuery.data, debouncedAdminSearch, adminSearch]);

  const shouldShowAdminSearchPanel = adminUnlocked && adminPanelOpen && normalize(adminSearch).length >= 1;

  const rindeStatusLabel = !selectedArticle
    ? "Seleccioná un rinde disponible o escribí una referencia para configurarlo."
    : rindeQuery.isFetching
      ? "Cargando parámetros..."
      : rindeQuery.data?.rinde
        ? "Rinde configurado"
        : "Esta referencia todavía no tiene parámetros de rinde.";

  const selectedArticleSummary = selectedArticle
    ? [
        { label: "Referencia CDD", value: getReferenceLabel(selectedArticle) || "Sin referencia cargada" },
        { label: "Código", value: selectedArticle.code },
        { label: "Descripción", value: selectedArticle.description || "Sin descripción disponible" },
        { label: "Sinónimo", value: selectedArticle.synonym || "Sin sinónimo" },
      ]
    : [];

  const renderReferenceSummary = () => {
    const rinde = rindeQuery.data?.rinde;
    if (!rinde) return "Sin parámetros activos todavía";
    return `${formatNumber(rinde.anchoCm, 0)} cm · ${formatNumber(rinde.kgPorMetro, 4)} kg/m · ${formatNumber(rinde.metrosReferencia)} m/rollo`;
  };

  const renderArticleOption = (article: Article, onSelect: (article: Article) => void) => {
    const displayReference = getReferenceLabel(article) || article.code;
    return (
      <button
        key={`${article.code}-${displayReference}`}
        type="button"
        onClick={() => onSelect(article)}
        className="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-emerald-50"
      >
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{displayReference}</p>
          <p className="truncate text-sm text-slate-600">
            {article.code}
            {article.description ? ` · ${article.description}` : ""}
          </p>
          <p className="mt-1 text-xs text-slate-500">Sinónimo: {article.synonym || "-"}</p>
        </div>
        <Badge variant="secondary" className={article.hasRinde ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
          {article.hasRinde ? "Con rinde" : "Pendiente"}
        </Badge>
      </button>
    );
  };

  const renderSearchPanel = (searchQuery: { isFetching: boolean; isError: boolean; data?: Article[] }, onSelect: (article: Article) => void) => {
    if (searchQuery.isFetching) {
      return <div className="px-3 py-4 text-sm text-slate-500">Buscando artículos...</div>;
    }
    if (searchQuery.isError) {
      return <div className="px-3 py-4 text-sm text-rose-600">No pudimos consultar los artículos. Intentá nuevamente.</div>;
    }
    if (searchQuery.data && searchQuery.data.length > 0) {
      return searchQuery.data.map((article) => renderArticleOption(article, onSelect));
    }
    return <div className="px-3 py-4 text-sm text-slate-500">No encontramos artículos con esa búsqueda.</div>;
  };

  const renderSelectedArticleCard = () => {
    if (!selectedArticle) {
      return <p className="text-sm text-slate-500">Seleccion? un rinde para ver sus par?metros y calcular el estimado.</p>;
    }

    return (
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-slate-900 text-white">Rinde seleccionado</Badge>
          <Badge variant="outline" className={rindeQuery.data?.rinde ? "border-emerald-200 text-emerald-700" : "border-amber-200 text-amber-700"}>
            {rindeQuery.data?.rinde ? "Rinde configurado" : "Sin rinde"}
          </Badge>
        </div>
        <div className="grid gap-2 text-sm text-slate-700">
          {selectedArticleSummary.map((item) => (
            <p key={item.label}><span className="font-semibold text-slate-900">{item.label}:</span> {item.value}</p>
          ))}
        </div>
      </div>
    );
  };
  const renderAvailableRindes = (mobile = false) => {
    if (activeRindesQuery.isLoading) {
      return <p className="text-sm text-slate-500">Cargando rindes disponibles...</p>;
    }
    if (activeRindesQuery.isError) {
      return <p className="text-sm text-rose-600">No pudimos cargar los rindes configurados.</p>;
    }
    if (!filteredAvailableRindes.length) {
      return <p className="text-sm text-slate-500">No hay rindes activos que coincidan con esa búsqueda.</p>;
    }

    return (
      <div className={`space-y-2 ${mobile ? "" : "max-h-72 overflow-y-auto pr-1"}`}>
        {filteredAvailableRindes.map((item) => renderArticleOption({
          code: item.articleCode,
          description: item.description,
          synonym: item.synonym,
          codigoBase: item.codigoBase,
          descripcionBase: item.descripcionBase,
          hasRinde: true,
          active: item.activo,
          anchoCm: item.anchoCm,
          metrosReferencia: item.metrosReferencia,
          kgPorMetro: item.kgPorMetro,
          referenceLabel: item.referenceLabel,
        }, (article) => handleSelectArticle(article, "main")))}
      </div>
    );
  };

  const renderAdminConfigurator = (mobile = false) => (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900">Buscar artículo para configurar</p>
        <p className="text-xs text-slate-500">Escribí la referencia exacta del CDD o elegí una ya configurada.</p>
      </div>

      <div className="relative">
        <Input
          value={adminSearch}
          onChange={(event) => {
            const value = event.target.value;
            setAdminSearch(value);
            if (selectedArticle && ![normalize(selectedArticle.code), normalize(getReferenceLabel(selectedArticle))].includes(normalize(value))) {
              clearSelectedArticle();
            }
          }}
          placeholder="Ej: 148L (C)"
          className="h-11 rounded-2xl border-slate-200 bg-white text-sm shadow-none"
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            const value = adminSearch.trim();
            if (!value) return;
            const existing = (adminRindesQuery.data || []).find((item) =>
              [item.articleCode, item.referenceLabel].some((candidate) => normalize(candidate) === normalize(value))
            );
            if (existing) {
              handleSelectArticle({
                code: existing.articleCode,
                description: existing.description,
                synonym: existing.synonym,
                codigoBase: existing.codigoBase,
                descripcionBase: existing.descripcionBase,
                hasRinde: true,
                active: existing.activo,
                anchoCm: existing.anchoCm,
                metrosReferencia: existing.metrosReferencia,
                kgPorMetro: existing.kgPorMetro,
                referenceLabel: existing.referenceLabel,
              }, "admin");
              return;
            }
            handleSelectArticle({ code: value, referenceLabel: value, hasRinde: false, active: true }, "admin");
          }}
        />
        {shouldShowAdminSearchPanel ? (
          <div className={`absolute left-0 z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ${mobile ? "" : ""}`}>
            {adminRindesQuery.isFetching ? (
              <div className="px-3 py-4 text-sm text-slate-500">Buscando rindes configurados...</div>
            ) : adminRindesQuery.isError ? (
              <div className="px-3 py-4 text-sm text-rose-600">No pudimos cargar los rindes configurados.</div>
            ) : filteredAdminRindes.length > 0 ? (
              filteredAdminRindes.map((item) => renderArticleOption({
                code: item.articleCode,
                description: item.description,
                synonym: item.synonym,
                codigoBase: item.codigoBase,
                descripcionBase: item.descripcionBase,
                hasRinde: true,
                active: item.activo,
                anchoCm: item.anchoCm,
                metrosReferencia: item.metrosReferencia,
                kgPorMetro: item.kgPorMetro,
                referenceLabel: item.referenceLabel,
              }, (article) => handleSelectArticle(article, "admin")))
            ) : (
              <div className="space-y-3 px-3 py-4 text-sm text-slate-500">
                <p>No encontramos un rinde cargado con esa referencia.</p>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => handleSelectArticle({ code: adminSearch.trim(), referenceLabel: adminSearch.trim(), hasRinde: false, active: true }, "admin")}
                  disabled={!adminSearch.trim()}
                >
                  Usar ?{adminSearch.trim() || "nueva referencia"}?
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
        <p className="text-sm font-medium text-emerald-900">{rindeStatusLabel}</p>
        <div className="mt-3">{renderSelectedArticleCard()}</div>
      </div>

      <fieldset disabled={!selectedArticle} className="grid gap-3 disabled:opacity-60">
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-slate-800">Referencia CDD</label>
          <Input value={form.referenceLabel} onChange={(event) => setForm((current) => ({ ...current, referenceLabel: event.target.value }))} placeholder="Ej: 148L (C)" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input value={form.anchoCm} onChange={(event) => setForm((current) => ({ ...current, anchoCm: event.target.value }))} placeholder="Ancho (cm)" />
          <Input value={form.pesoReferenciaKg} onChange={(event) => setForm((current) => ({ ...current, pesoReferenciaKg: event.target.value }))} placeholder="Peso referencia (kg)" />
          <Input value={form.metrosReferencia} onChange={(event) => setForm((current) => ({ ...current, metrosReferencia: event.target.value }))} placeholder="Metros referencia" />
          <Input value={updatedBy} onChange={(event) => setUpdatedBy(event.target.value)} placeholder="Modificado por" />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
            <input type="checkbox" checked={form.activo} onChange={(event) => setForm((current) => ({ ...current, activo: event.target.checked }))} />
            Activo
          </label>
          <span className="rounded-full bg-white px-3 py-2 text-sm">kg/m automático: {Number.isFinite(kgPorMetro) ? formatNumber(kgPorMetro, 4) : "-"}</span>
        </div>
        <Button type="button" className="h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700" disabled={!selectedArticle || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending ? "Guardando..." : "Guardar parámetros"}
        </Button>
      </fieldset>
    </div>
  );

  const resultCard = (
    <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white shadow-sm">
      <CardHeader className="space-y-2 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">Resultado estimado</CardTitle>
            <CardDescription className="mt-1 text-sm text-slate-600">{calculation.message}</CardDescription>
          </div>
          <div className="rounded-2xl bg-emerald-100 p-2 text-emerald-700">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Rinde estimado</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-700 sm:text-4xl">{formatNumber(calculation.total)} m</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Abierto</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(calculation.abierto)} m</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cerrados</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(calculation.cerrados)} m</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">kg por metro</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{Number.isFinite(kgPorMetro) ? formatNumber(kgPorMetro, 4) : "-"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 pb-28 pt-2 sm:px-4 md:gap-5 md:pb-8 md:pt-4">
      <section className="rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5 md:px-6 md:py-5">
        <div className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] md:items-start md:gap-5">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-700 shadow-sm">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <h2 className="hidden text-2xl font-bold tracking-tight text-slate-950 md:block md:text-3xl">Calculadora de Rinde de Telas (por Jony Caro)</h2>
                <h2 className="text-xl font-bold tracking-tight text-slate-950 md:hidden">Calculadora de Rinde</h2>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-emerald-700 md:hidden">por Jony Caro</p>
                <p className="mt-1 max-w-2xl text-sm text-slate-600 md:hidden">Calculá los metros estimados de una tela según su peso.</p>
                <p className="mt-1 hidden max-w-2xl text-sm text-slate-600 sm:text-base md:block">
                  Calculá metros estimados a partir del peso del rollo abierto y los rollos cerrados, usando el maestro de rinde definido por CDD.
                </p>
              </div>
            </div>
            <Card className="border-slate-200 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Rindes disponibles</CardTitle>
                <CardDescription>Elegí una referencia ya configurada para cargar sus parámetros al instante.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {renderAvailableRindes(false)}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-none" data-tour="rinde-search">
              <CardContent className="p-3 sm:p-5">
                <div className="relative">
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Search className="h-4 w-4 text-emerald-600" />
                    Buscar rinde configurado
                  </label>
                  <Input
                    value={search}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSearch(value);
                      if (selectedArticle && ![normalize(selectedArticle.code), normalize(getReferenceLabel(selectedArticle))].includes(normalize(value))) {
                        clearSelectedArticle({ closeAdminPanel: true });
                      }
                    }}
                    placeholder="Referencia, código, sinónimo o descripción"
                    className="h-11 rounded-2xl border-slate-200 bg-slate-50 text-sm shadow-none sm:h-12 sm:text-base"
                  />
                  {shouldShowSearchPanel ? (
                    <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                      {activeRindesQuery.isLoading ? (
                        <div className="px-3 py-4 text-sm text-slate-500">Cargando rindes disponibles...</div>
                      ) : activeRindesQuery.isError ? (
                        <div className="px-3 py-4 text-sm text-rose-600">No pudimos cargar los rindes configurados.</div>
                      ) : filteredAvailableRindes.length > 0 ? (
                        filteredAvailableRindes.map((item) => renderArticleOption({
                          code: item.articleCode,
                          description: item.description,
                          synonym: item.synonym,
                          codigoBase: item.codigoBase,
                          descripcionBase: item.descripcionBase,
                          hasRinde: true,
                          active: item.activo,
                          anchoCm: item.anchoCm,
                          metrosReferencia: item.metrosReferencia,
                          kgPorMetro: item.kgPorMetro,
                          referenceLabel: item.referenceLabel,
                        }, (article) => handleSelectArticle(article, "main")))
                      ) : (
                        <div className="px-3 py-4 text-sm text-slate-500">No encontramos rindes configurados con esa búsqueda.</div>
                      )}
                    </div>
                  ) : null}
                </div>

                <div data-tour="rinde-article" className="mt-4 hidden md:block">
                  {renderSelectedArticleCard()}
                </div>
              </CardContent>
            </Card>

            <Card className="hidden border-slate-200 shadow-sm md:block" data-tour="rinde-inputs">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Cálculo</CardTitle>
                <CardDescription>Ingresá el peso del rollo abierto y cuántos rollos cerrados tenés para estimar los metros totales.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">Peso del rollo abierto (kg)</label>
                  <Input value={pesoActual} onChange={(event) => setPesoActual(event.target.value)} inputMode="decimal" placeholder="Ej. 6,00" className="h-12 rounded-2xl" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">Cantidad de rollos cerrados</label>
                  <Input value={rollosCerrados} onChange={(event) => setRollosCerrados(event.target.value)} inputMode="numeric" placeholder="Ej. 2" className="h-12 rounded-2xl" />
                </div>
                <div className="sm:col-span-2 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="rounded-2xl" onClick={handleClear}>Limpiar</Button>
                  <Badge variant="secondary" className="rounded-full bg-slate-100 px-3 py-2 text-slate-700">Fórmula: metros abiertos = peso actual ÷ kg/m</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="hidden md:flex md:flex-col md:gap-4">
            <div data-tour="rinde-result">{resultCard}</div>

            <Card className="border-slate-200 shadow-none" data-tour="rinde-reference">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Datos de referencia</CardTitle>
                <CardDescription>{renderReferenceSummary()}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ancho</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{rindeQuery.data?.rinde ? `${formatNumber(rindeQuery.data.rinde.anchoCm, 0)} cm` : "-"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Última actualización</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(rindeQuery.data?.rinde?.updatedAt)}</p>
                  <p className="mt-1 text-xs text-slate-500">{rindeQuery.data?.rinde?.updatedBy || "CDD"}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-none" data-tour="rinde-master">
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Maestro de Rindes</p>
                    <p className="text-sm text-slate-500">Acceso protegido para CDD.</p>
                  </div>
                  <Button type="button" variant="outline" className="rounded-2xl" onClick={() => adminUnlocked ? setAdminPanelOpen((value) => !value) : setAuthDialogOpen(true)}>
                    <Lock className="mr-2 h-4 w-4" />
                    Administrar rindes
                  </Button>
                </div>
                {adminUnlocked && adminPanelOpen ? renderAdminConfigurator(false) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <div className="space-y-4">
          <div className="space-y-3 md:hidden">
            <Card className="border-slate-200 shadow-none md:hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Rindes disponibles</CardTitle>
                <CardDescription>Elegí una referencia configurada para empezar más rápido.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="max-h-64 overflow-y-auto">{renderAvailableRindes(true)}</div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-none" data-tour="rinde-search-mobile">
              <CardContent className="p-3">
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Search className="h-4 w-4 text-emerald-600" />
                  Buscar rinde configurado
                </label>
                <Input
                  value={search}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSearch(value);
                    if (selectedArticle && ![normalize(selectedArticle.code), normalize(getReferenceLabel(selectedArticle))].includes(normalize(value))) {
                      clearSelectedArticle({ closeAdminPanel: true });
                    }
                  }}
                  placeholder="Referencia, código, sinónimo o descripción"
                  className="h-11 rounded-2xl border-slate-200 bg-slate-50 text-sm shadow-none"
                />
                {shouldShowSearchPanel ? (
                  <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                    {activeRindesQuery.isLoading ? (
                      <div className="px-3 py-4 text-sm text-slate-500">Cargando rindes disponibles...</div>
                    ) : activeRindesQuery.isError ? (
                      <div className="px-3 py-4 text-sm text-rose-600">No pudimos cargar los rindes configurados.</div>
                    ) : filteredAvailableRindes.length > 0 ? (
                      filteredAvailableRindes.map((item) => renderArticleOption({
                        code: item.articleCode,
                        description: item.description,
                        synonym: item.synonym,
                        codigoBase: item.codigoBase,
                        descripcionBase: item.descripcionBase,
                        hasRinde: true,
                        active: item.activo,
                        anchoCm: item.anchoCm,
                        metrosReferencia: item.metrosReferencia,
                        kgPorMetro: item.kgPorMetro,
                        referenceLabel: item.referenceLabel,
                      }, (article) => handleSelectArticle(article, "main")))
                    ) : (
                      <div className="px-3 py-4 text-sm text-slate-500">No encontramos rindes configurados con esa búsqueda.</div>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
            {selectedArticle ? (
              <Card className="border-slate-200 shadow-none" data-tour="rinde-article">
                <CardContent className="space-y-4 p-3">
                  {renderSelectedArticleCard()}
                  <div className="grid gap-3 min-[390px]:grid-cols-2" data-tour="rinde-inputs-mobile">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-800">Peso del rollo abierto</label>
                      <div className="relative">
                        <Input value={pesoActual} onChange={(event) => setPesoActual(event.target.value)} inputMode="decimal" placeholder="Ej. 6,00" className="h-11 rounded-2xl pr-12" />
                        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-slate-500">kg</span>
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-800">Rollos cerrados</label>
                      <div className="relative">
                        <Input value={rollosCerrados} onChange={(event) => setRollosCerrados(event.target.value)} inputMode="numeric" placeholder="Ej. 2" className="h-11 rounded-2xl pr-16" />
                        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-slate-500">rollos</span>
                      </div>
                    </div>
                  </div>
                  <Button type="button" variant="outline" className="h-10 rounded-2xl px-4" onClick={handleClear}>Limpiar cálculo</Button>
                </CardContent>
              </Card>
            ) : null}

            <Accordion type="multiple" value={mobileSections} onValueChange={setMobileSections} className="rounded-[24px] border border-slate-200 bg-white px-4 shadow-sm">
              <AccordionItem value="referencia" data-tour="rinde-reference-mobile">
                <AccordionTrigger className="py-4 text-left text-sm font-semibold text-slate-900 hover:no-underline">
                  <div className="min-w-0">
                    <p>Datos de referencia</p>
                    <p className="mt-1 truncate text-xs font-normal text-slate-500">{renderReferenceSummary()}</p>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <p>{renderReferenceSummary()}</p>
                    <p>Última actualización: {formatDateTime(rindeQuery.data?.rinde?.updatedAt)}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="maestro" data-tour="rinde-master-mobile">
                <AccordionTrigger className="py-4 text-left text-sm font-semibold text-slate-900 hover:no-underline">
                  <div>
                    <p>Maestro de Rindes · Solo CDD</p>
                    <p className="mt-1 text-xs font-normal text-slate-500">Acceso protegido para administrar parámetros.</p>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <Button type="button" variant="outline" className="h-10 rounded-2xl px-4" onClick={() => adminUnlocked ? setAdminPanelOpen((value) => !value) : setAuthDialogOpen(true)}>
                      <Lock className="mr-2 h-4 w-4" />
                      {adminUnlocked ? (adminPanelOpen ? "Ocultar edición" : "Administrar") : "Administrar"}
                    </Button>
                    {adminUnlocked && adminPanelOpen ? renderAdminConfigurator(true) : null}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {selectedArticle ? (
        <div className="fixed inset-x-3 bottom-[5.15rem] z-40 md:hidden" data-tour="rinde-result-mobile">
          <div className="w-full rounded-[22px] border border-emerald-200 bg-white/95 px-4 py-3 shadow-[0_18px_38px_-28px_rgba(5,150,105,0.45)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">Rinde estimado</p>
                <p className="mt-1 text-base font-bold text-slate-950">{resultSummary}</p>
              </div>
              <div className="rounded-2xl bg-emerald-100 p-2 text-emerald-700">
                <Ruler className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-600">
              <div className="rounded-2xl bg-slate-50 px-2 py-2">Abierto<br /><span className="font-semibold text-slate-900">{formatNumber(calculation.abierto)} m</span></div>
              <div className="rounded-2xl bg-slate-50 px-2 py-2">Cerrados<br /><span className="font-semibold text-slate-900">{formatNumber(calculation.cerrados)} m</span></div>
              <div className="rounded-2xl bg-slate-50 px-2 py-2">Total<br /><span className="font-semibold text-emerald-700">{formatNumber(calculation.total)} m</span></div>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent className="max-w-md rounded-[28px] border-slate-200 p-0">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl"><ShieldCheck className="h-5 w-5 text-emerald-700" /> Administrar rindes</DialogTitle>
              <DialogDescription>Ingresá la contraseña del sector CDD para editar el maestro de rinde.</DialogDescription>
            </DialogHeader>
            <div className="mt-5 space-y-3">
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Contraseña de CDD" className="h-12 rounded-2xl" />
              <Button type="button" className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700" disabled={authMutation.isPending} onClick={() => authMutation.mutate()}>
                {authMutation.isPending ? "Validando..." : "Validar acceso"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
