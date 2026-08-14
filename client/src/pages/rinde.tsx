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
};

type RindeConfig = {
  id?: number;
  articleCode: string;
  anchoCm: number;
  pesoReferenciaKg: number;
  metrosReferencia: number;
  kgPorMetro: number;
  activo: boolean;
  updatedAt?: string | null;
  updatedBy?: string | null;
};

type RindeResponse = {
  article: Article;
  rinde: RindeConfig | null;
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

export default function RindePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [pesoActual, setPesoActual] = useState("");
  const [rollosCerrados, setRollosCerrados] = useState("0");
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [updatedBy, setUpdatedBy] = useState("CDD");
  const [form, setForm] = useState({
    anchoCm: "",
    pesoReferenciaKg: "",
    metrosReferencia: "",
    activo: true,
  });
  const [mobileSections, setMobileSections] = useState<string[]>(["articulo", "calculo"]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 220);
    return () => window.clearTimeout(timer);
  }, [search]);

  const articleSearch = useQuery<Article[]>({
    queryKey: ["rinde-search", debouncedSearch],
    enabled: debouncedSearch.length >= 2,
    queryFn: async () => {
      const response = await fetch(buildApiUrl(`/api/rinde-articulos?q=${encodeURIComponent(debouncedSearch)}`));
      if (!response.ok) throw new Error("No se pudo buscar artículos.");
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
      setForm({ anchoCm: "", pesoReferenciaKg: "", metrosReferencia: "", activo: true });
      return;
    }

    const rinde = rindeQuery.data.rinde;
    setForm({
      anchoCm: String(rinde.anchoCm),
      pesoReferenciaKg: String(rinde.pesoReferenciaKg),
      metrosReferencia: String(rinde.metrosReferencia),
      activo: rinde.activo,
    });
    setMobileSections((current) => (current.includes("referencia") ? current : [...current, "referencia"]));
  }, [rindeQuery.data]);

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
      return { abierto: 0, cerrados: 0, total: 0, valid: false, message: "Este artículo todavía no tiene parámetros de rinde configurados." };
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
      setAdminUnlocked(true);
      setAdminPanelOpen(true);
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
          "x-rinde-password": password,
        },
        body: JSON.stringify({
          articleCode: selectedArticle.code,
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
      await queryClient.invalidateQueries({ queryKey: ["rinde-search"] });
      toast({ variant: "success", title: "Rinde guardado", description: "Los parámetros quedaron listos para la calculadora." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "No se pudo guardar", description: error.message });
    },
  });

  const handleSelectArticle = (article: Article) => {
    setSelectedArticle(article);
    setSearch(article.code);
    setMobileSections(["calculo", "referencia"]);
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

  const showSearchResults = debouncedSearch.length >= 2
    && Boolean(articleSearch.data?.length)
    && selectedArticle?.code !== search.trim();

  const renderReferenceSummary = () => {
    const rinde = rindeQuery.data?.rinde;
    if (!rinde) return "Sin parámetros activos todavía";
    return `${formatNumber(rinde.anchoCm, 0)} cm · ${formatNumber(rinde.kgPorMetro, 4)} kg/m · ${formatNumber(rinde.metrosReferencia)} m/rollo`;
  };

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
                <h2 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">Calculadora de Rinde de Telas (por Jony Caro)</h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-600 sm:text-base">
                  Calculá metros estimados a partir del peso del rollo abierto y los rollos cerrados, usando el maestro de rinde definido por CDD.
                </p>
              </div>
            </div>

            <Card className="border-slate-200 shadow-none" data-tour="rinde-search">
              <CardContent className="p-4 sm:p-5">
                <div className="relative">
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Search className="h-4 w-4 text-emerald-600" />
                    Buscar artículo
                  </label>
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Código, sinónimo o descripción"
                    className="h-12 rounded-2xl border-slate-200 bg-slate-50 text-base shadow-none"
                  />
                  {showSearchResults && articleSearch.data && articleSearch.data.length > 0 && (
                    <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                      {articleSearch.data.map((article) => (
                        <button
                          key={article.code}
                          type="button"
                          onClick={() => handleSelectArticle(article)}
                          className="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-emerald-50"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900">{article.code}</p>
                            <p className="truncate text-sm text-slate-600">{article.description || "Sin descripción"}</p>
                            {article.synonym ? <p className="mt-1 text-xs text-slate-500">Sinónimo: {article.synonym}</p> : null}
                          </div>
                          <Badge variant="secondary" className={article.hasRinde ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                            {article.hasRinde ? "Con rinde" : "Pendiente"}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div data-tour="rinde-article">
                  {selectedArticle ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-slate-900 text-white">{selectedArticle.code}</Badge>
                        {selectedArticle.synonym ? <Badge variant="outline">Sinónimo: {selectedArticle.synonym}</Badge> : null}
                      </div>
                      <p className="mt-2 text-sm font-medium text-slate-900">{selectedArticle.description || "Sin descripción disponible"}</p>
                      {selectedArticle.descripcionBase ? <p className="mt-1 text-xs text-slate-500">Base: {selectedArticle.descripcionBase}</p> : null}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">Seleccioná una tela para ver sus parámetros y calcular el rinde estimado.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="hidden md:flex md:flex-col md:gap-4">
            <div data-tour="rinde-result">
              {resultCard}
            </div>
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
                {adminUnlocked && adminPanelOpen && (
                  <div className="grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <p className="text-sm font-medium text-emerald-900">Configuración del artículo seleccionado</p>
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
                    <Button type="button" className="rounded-2xl bg-emerald-600 hover:bg-emerald-700" disabled={!selectedArticle || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                      {saveMutation.isPending ? "Guardando..." : "Guardar parámetros"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] md:items-start">
        <div className="space-y-4">
          <div className="md:hidden">
            <Accordion type="multiple" value={mobileSections} onValueChange={setMobileSections} className="rounded-[24px] border border-slate-200 bg-white px-4 shadow-sm">
              <AccordionItem value="articulo">
                <AccordionTrigger className="text-left text-base font-semibold text-slate-900 hover:no-underline">Artículo</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-slate-600">Buscá una tela por código, sinónimo o descripción. Después podés cargar el peso y los rollos cerrados.</p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="referencia" data-tour="rinde-reference-mobile">
                <AccordionTrigger className="text-left text-base font-semibold text-slate-900 hover:no-underline">Datos de referencia</AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <p>{renderReferenceSummary()}</p>
                    <p>Última actualización: {formatDateTime(rindeQuery.data?.rinde?.updatedAt)}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="calculo" data-tour="rinde-inputs-mobile">
                <AccordionTrigger className="text-left text-base font-semibold text-slate-900 hover:no-underline">Cálculo</AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-3">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-800">Peso del rollo abierto (kg)</label>
                      <Input value={pesoActual} onChange={(event) => setPesoActual(event.target.value)} inputMode="decimal" placeholder="Ej. 6,00" className="h-12 rounded-2xl" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-800">Cantidad de rollos cerrados</label>
                      <Input value={rollosCerrados} onChange={(event) => setRollosCerrados(event.target.value)} inputMode="numeric" placeholder="Ej. 2" className="h-12 rounded-2xl" />
                    </div>
                    <Button type="button" variant="outline" className="rounded-2xl" onClick={handleClear}>Limpiar cálculo</Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <Card className="border-slate-200 shadow-none md:hidden" data-tour="rinde-master-mobile">
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Maestro de Rindes</p>
                  <p className="text-sm text-slate-500">Acceso protegido para CDD.</p>
                </div>
                <Button type="button" variant="outline" className="rounded-2xl" onClick={() => adminUnlocked ? setAdminPanelOpen((value) => !value) : setAuthDialogOpen(true)}>
                  <Lock className="mr-2 h-4 w-4" />
                  Administrar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm" data-tour="rinde-inputs">
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

      </section>

      {selectedArticle ? (
            <div className="md:hidden fixed inset-x-3 bottom-[5.35rem] z-40" data-tour="rinde-result-mobile">
        <button
          type="button"
          onClick={() => setMobileSections((current) => current.includes("calculo") ? current : [...current, "calculo"])}
          className="w-full rounded-[24px] border border-emerald-200 bg-white/95 px-4 py-3 text-left shadow-[0_18px_38px_-28px_rgba(5,150,105,0.45)] backdrop-blur"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Rinde estimado</p>
              <p className="mt-1 text-lg font-bold text-slate-950">{resultSummary}</p>
            </div>
            <div className="rounded-2xl bg-emerald-100 p-2 text-emerald-700">
              <Ruler className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
            <div className="rounded-2xl bg-slate-50 px-2 py-2">Abierto<br /><span className="font-semibold text-slate-900">{formatNumber(calculation.abierto)} m</span></div>
            <div className="rounded-2xl bg-slate-50 px-2 py-2">Cerrados<br /><span className="font-semibold text-slate-900">{formatNumber(calculation.cerrados)} m</span></div>
            <div className="rounded-2xl bg-slate-50 px-2 py-2">Total<br /><span className="font-semibold text-emerald-700">{formatNumber(calculation.total)} m</span></div>
          </div>
        </button>
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


