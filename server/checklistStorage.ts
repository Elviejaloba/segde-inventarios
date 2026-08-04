import { neon } from "@neondatabase/serverless";
import {
  checklistBranchPatchSchema,
  type ChecklistAddedItem,
  type ChecklistBranchPatch,
  type ChecklistBranchState,
  type ChecklistItemState,
  type ChecklistPeriodState,
} from "@shared/schema";
import {
  AGOSTO_2026_PERIOD_KEY,
  getAllChecklistEntries,
  getCalendarioSucursal,
  getChecklistDisplayCode,
  getChecklistEntriesForMonth,
  getChecklistItemState,
  getMesActualCalendario,
  sanitizeChecklistCode,
} from "@shared/calendario-semanal";

const databaseUrl = process.env.DATABASE_URL;
const sql: any = databaseUrl
  ? neon(databaseUrl)
  : (async (..._args: any[]) => []);

const CHECKLIST_BRANCHES = [
  "T.Mendoza",
  "T.Sjuan",
  "T.SLuis",
  "Crisa2",
  "T.S.Martin",
  "T.Tunuyan",
  "T.Lujan",
  "T.Maipu",
  "T.Srafael",
  "T.GLLEN",
] as const;

const BASE_PERIOD_SCOPE = "__base__";
const BASE_PERIOD_PREFIX = "BASE-";
const FIREBASE_BRANCHES_URL = "https://check-d1753-default-rtdb.firebaseio.com/branches.json";

let definitionsReadyPromise: Promise<void> | null = null;

function getPeriodScope(periodKey?: string | null) {
  return periodKey && periodKey.trim().length > 0 ? periodKey.trim() : BASE_PERIOD_SCOPE;
}

function getCatalogPeriodKey(monthName: string, explicitPeriodKey?: string | null) {
  if (explicitPeriodKey && explicitPeriodKey.trim().length > 0) return explicitPeriodKey.trim();
  return `${BASE_PERIOD_PREFIX}${monthName.toUpperCase()}`;
}

function parsePeriodMeta(periodKey: string, monthNameFallback?: string) {
  if (/^\d{4}-\d{2}$/.test(periodKey)) {
    const [yearText, monthText] = periodKey.split("-");
    const month = Number(monthText);
    const year = Number(yearText);
    const monthName = monthNameFallback || new Date(year, month - 1, 1).toLocaleString("es-AR", { month: "long" }).toUpperCase();
    return { monthName, year, month };
  }

  const monthName = (monthNameFallback || periodKey.replace(BASE_PERIOD_PREFIX, "")).toUpperCase();
  return { monthName, year: null as number | null, month: null as number | null };
}

function toMillis(value: unknown): number | undefined {
  if (!value) return undefined;
  if (typeof value === "number") return value;
  const parsed = new Date(String(value)).getTime();
  return Number.isNaN(parsed) ? undefined : parsed;
}

function normalizeBranchId(branchId: string): string {
  const normalized = branchId.trim();
  if (normalized === "T.Luis") return "T.SLuis";
  if (normalized === "T.SJuan") return "T.Sjuan";
  if (normalized === "T.SRafael") return "T.Srafael";
  if (normalized === "T.Glen") return "T.GLLEN";
  return normalized;
}

function emptyBranchState(branchId: string): ChecklistBranchState {
  return {
    id: branchId,
    totalCompleted: 0,
    noStock: 0,
    items: {},
    periods: {},
    addedItems: {},
  };
}

function getEntriesForProgress(branchId: string, periodKey?: string | null) {
  const calendario = getCalendarioSucursal(branchId);
  if (!calendario) return [] as Array<{ code: string; mes: string; semana: string; periodKey?: string }>;

  if (periodKey) {
    return getAllChecklistEntries(calendario).filter((entry) => (entry.periodKey || null) === periodKey);
  }

  const activeMonth = getMesActualCalendario();
  const activeEntries = getChecklistEntriesForMonth(calendario, activeMonth);
  return activeEntries.length > 0 ? activeEntries : getAllChecklistEntries(calendario);
}

function computeBranchMetrics(branchData: ChecklistBranchState, periodKey?: string | null): ChecklistBranchState {
  const entries = getEntriesForProgress(branchData.id, periodKey);
  if (entries.length === 0) {
    const fallbackItems = Object.values(branchData.items || {});
    const completedCount = fallbackItems.filter((item) => item.completed === true).length;
    const noStockCount = fallbackItems.filter((item) => item.hasStock === false).length;
    return {
      ...branchData,
      totalCompleted: fallbackItems.length > 0 ? Math.round((completedCount / fallbackItems.length) * 100) : 0,
      noStock: noStockCount,
    };
  }

  const completedCount = entries.filter((entry) => getChecklistItemState(branchData, entry.code, entry.periodKey)?.completed === true).length;
  const noStockCount = entries.filter((entry) => getChecklistItemState(branchData, entry.code, entry.periodKey)?.hasStock === false).length;

  return {
    ...branchData,
    totalCompleted: Math.round((completedCount / entries.length) * 100),
    noStock: noStockCount,
  };
}

async function ensureChecklistBranchCatalog() {
  for (const [index, branchCode] of CHECKLIST_BRANCHES.entries()) {
    await sql`
      INSERT INTO checklist_branches (branch_code, branch_name, display_order)
      VALUES (${branchCode}, ${branchCode}, ${index + 1})
      ON CONFLICT (branch_code) DO UPDATE SET
        branch_name = EXCLUDED.branch_name,
        display_order = EXCLUDED.display_order,
        active = TRUE,
        updated_at = NOW()
    `;
  }
}

async function upsertChecklistPeriod(periodKey: string, monthNameFallback?: string) {
  const meta = parsePeriodMeta(periodKey, monthNameFallback);

  await sql`
    INSERT INTO checklist_periods (period_key, month_name, year, month)
    VALUES (${periodKey}, ${meta.monthName}, ${meta.year}, ${meta.month})
    ON CONFLICT (period_key) DO UPDATE SET
      month_name = EXCLUDED.month_name,
      year = EXCLUDED.year,
      month = EXCLUDED.month,
      active = TRUE,
      updated_at = NOW()
  `;
}

async function upsertCatalogItem(itemCode: string) {
  await sql`
    INSERT INTO checklist_catalog_items (item_code, display_code)
    VALUES (${itemCode}, ${getChecklistDisplayCode(itemCode)})
    ON CONFLICT (item_code) DO UPDATE SET
      display_code = EXCLUDED.display_code,
      active = TRUE,
      updated_at = NOW()
  `;
}

async function seedChecklistDefinitions() {
  if (!databaseUrl) return;

  await ensureChecklistBranchCatalog();

  for (const branchCode of CHECKLIST_BRANCHES) {
    const calendario = getCalendarioSucursal(branchCode);
    if (!calendario) continue;

    for (const [weekIndex, semana] of calendario.semanas.entries()) {
      const catalogPeriodKey = getCatalogPeriodKey(semana.mes, semana.periodKey ?? null);
      const periodScope = getPeriodScope(semana.periodKey ?? null);

      await upsertChecklistPeriod(catalogPeriodKey, semana.mes);

      for (const [itemIndex, itemCode] of semana.items.entries()) {
        await upsertCatalogItem(itemCode);

        const itemOrder = weekIndex * 1000 + itemIndex;
        await sql`
          INSERT INTO checklist_branch_period_items (
            branch_code,
            period_key,
            period_scope,
            month_name,
            week_label,
            item_code,
            item_order
          )
          VALUES (
            ${branchCode},
            ${catalogPeriodKey},
            ${periodScope},
            ${semana.mes},
            ${semana.semana},
            ${itemCode},
            ${itemOrder}
          )
          ON CONFLICT (branch_code, period_key, week_label, item_code)
          DO UPDATE SET
            month_name = EXCLUDED.month_name,
            period_scope = EXCLUDED.period_scope,
            item_order = EXCLUDED.item_order,
            updated_at = NOW()
        `;
      }
    }
  }
}

async function ensureChecklistDefinitions() {
  if (!databaseUrl) return;
  if (!definitionsReadyPromise) {
    definitionsReadyPromise = seedChecklistDefinitions().catch((error) => {
      definitionsReadyPromise = null;
      throw error;
    });
  }
  await definitionsReadyPromise;
}

function deriveMonthKey(timestamp: number | string | undefined) {
  const date = timestamp ? new Date(Number(timestamp)) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function resolveAddedItemTarget(monthOrPeriod?: string) {
  const normalized = String(monthOrPeriod || "").trim();
  if (!normalized) {
    const currentPeriod = deriveMonthKey(Date.now());
    return {
      periodKey: currentPeriod,
      periodScope: currentPeriod,
      month: currentPeriod,
    };
  }

  if (/^\d{4}-\d{2}$/.test(normalized)) {
    return {
      periodKey: normalized,
      periodScope: normalized,
      month: normalized,
    };
  }

  const monthName = normalized.toUpperCase();
  return {
    periodKey: `${BASE_PERIOD_PREFIX}${monthName}`,
    periodScope: BASE_PERIOD_SCOPE,
    month: monthName,
  };
}

async function upsertChecklistState(branchCode: string, itemCode: string, periodKey: string | null, itemState: Partial<ChecklistItemState>) {
  const normalizedCode = String(itemCode).trim();
  const lastUpdated = Number(itemState.lastUpdated || Date.now());
  const completed = itemState.completed === true;
  const hasStock = itemState.hasStock !== false;
  const periodScope = getPeriodScope(periodKey);

  await upsertCatalogItem(normalizedCode);
  if (periodKey) {
    await upsertChecklistPeriod(periodKey);
  }

  await sql`
    INSERT INTO checklist_item_states (branch_code, period_key, period_scope, item_code, completed, has_stock, last_updated)
    VALUES (
      ${branchCode},
      ${periodKey},
      ${periodScope},
      ${normalizedCode},
      ${completed},
      ${hasStock},
      TO_TIMESTAMP(${lastUpdated} / 1000.0)
    )
    ON CONFLICT (branch_code, period_scope, item_code)
    DO UPDATE SET
      completed = EXCLUDED.completed,
      has_stock = EXCLUDED.has_stock,
      last_updated = EXCLUDED.last_updated
  `;
}

function filterBranchForPeriod(branchData: ChecklistBranchState, periodKey?: string | null) {
  if (!periodKey) return branchData;

  const filteredAddedItems = Object.fromEntries(
    Object.entries(branchData.addedItems || {}).filter(([, value]) => value.month === periodKey)
  );

  return {
    ...branchData,
    periods: branchData.periods?.[periodKey] ? { [periodKey]: branchData.periods[periodKey] } : {},
    addedItems: filteredAddedItems,
  };
}

export async function bootstrapChecklistPostgres(options?: { importFirebase?: boolean }) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL es requerida para bootstrapChecklistPostgres");
  }

  await seedChecklistDefinitions();

  if (options?.importFirebase === false) {
    return;
  }

  const res = await fetch(process.env.CHECKLIST_FIREBASE_IMPORT_URL || FIREBASE_BRANCHES_URL, {
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    throw new Error(`No se pudo importar Firebase branches.json: ${res.status}`);
  }

  const payload = await res.json();
  const sourceBranches = Array.isArray(payload) ? payload : [];

  for (const rawBranch of sourceBranches) {
    if (!rawBranch?.id) continue;
    const branchCode = normalizeBranchId(String(rawBranch.id));
    if (!CHECKLIST_BRANCHES.includes(branchCode as (typeof CHECKLIST_BRANCHES)[number])) continue;

    const itemEntries = Object.entries(rawBranch.items || {}) as Array<[string, any]>;
    for (const [itemCode, itemState] of itemEntries) {
      await upsertChecklistState(branchCode, itemCode, null, itemState);
    }

    const periodEntries = Object.entries(rawBranch.periods || {}) as Array<[string, any]>;
    for (const [periodKey, periodData] of periodEntries) {
      await upsertChecklistPeriod(periodKey);
      const periodItemEntries = Object.entries(periodData?.items || {}) as Array<[string, any]>;
      for (const [itemCode, itemState] of periodItemEntries) {
        await upsertChecklistState(branchCode, itemCode, periodKey, itemState);
      }
    }

    const addedItems = Object.entries(rawBranch.addedItems || {}) as Array<[string, any]>;
    if (addedItems.length > 0) {
      await sql`DELETE FROM checklist_added_items WHERE branch_code = ${branchCode}`;
      for (const [, addedItem] of addedItems) {
        if (!addedItem?.code) continue;
        const target = resolveAddedItemTarget(String(addedItem.month || deriveMonthKey(addedItem.addedAt)));
        await upsertCatalogItem(String(addedItem.code));
        await upsertChecklistPeriod(target.periodKey, target.month);
        await sql`
          INSERT INTO checklist_added_items (branch_code, period_key, period_scope, item_code, added_at, month)
          VALUES (
            ${branchCode},
            ${target.periodKey},
            ${target.periodScope},
            ${String(addedItem.code)},
            TO_TIMESTAMP(${Number(addedItem.addedAt || Date.now())} / 1000.0),
            ${target.month}
          )
          ON CONFLICT (branch_code, period_scope, item_code)
          DO UPDATE SET
            added_at = EXCLUDED.added_at,
            month = EXCLUDED.month
        `;
      }
    }
  }
}

export async function getChecklistBranches(options?: { period?: string | null }): Promise<ChecklistBranchState[]> {
  await ensureChecklistDefinitions();

  const branchRows = await sql`
    SELECT branch_code, updated_at
    FROM checklist_branches
    WHERE active = TRUE
    ORDER BY display_order, branch_code
  `;

  const stateRows = await sql`
    SELECT branch_code, period_key, period_scope, item_code, completed, has_stock, last_updated
    FROM checklist_item_states
  `;

  const addedRows = await sql`
    SELECT branch_code, period_key, item_code, added_at, month
    FROM checklist_added_items
  `;

  const branchMap = new Map<string, ChecklistBranchState>();

  for (const row of branchRows) {
    const branchCode = String(row.branch_code);
    branchMap.set(branchCode, {
      ...emptyBranchState(branchCode),
      lastUpdated: toMillis(row.updated_at),
    });
  }

  for (const branchCode of CHECKLIST_BRANCHES) {
    if (!branchMap.has(branchCode)) {
      branchMap.set(branchCode, emptyBranchState(branchCode));
    }
  }

  for (const row of stateRows) {
    const branchCode = normalizeBranchId(String(row.branch_code));
    const branchData = branchMap.get(branchCode) || emptyBranchState(branchCode);
    const itemState: ChecklistItemState = {
      completed: row.completed === true,
      hasStock: row.has_stock !== false,
      lastUpdated: toMillis(row.last_updated),
    };
    const itemCode = sanitizeChecklistCode(String(row.item_code));

    if (row.period_key) {
      const periodKey = String(row.period_key);
      const periods = branchData.periods || {};
      const periodData: ChecklistPeriodState = periods[periodKey] || { items: {} };
      periodData.items[itemCode] = itemState;
      periodData.lastUpdated = Math.max(periodData.lastUpdated || 0, itemState.lastUpdated || 0);
      branchData.periods = {
        ...periods,
        [periodKey]: periodData,
      };
    } else {
      branchData.items[itemCode] = itemState;
    }

    branchData.lastUpdated = Math.max(branchData.lastUpdated || 0, itemState.lastUpdated || 0);
    branchMap.set(branchCode, branchData);
  }

  for (const row of addedRows) {
    const branchCode = normalizeBranchId(String(row.branch_code));
    const branchData = branchMap.get(branchCode) || emptyBranchState(branchCode);
    const itemCode = String(row.item_code);
    const key = sanitizeChecklistCode(itemCode);
    const addedAt = toMillis(row.added_at) || Date.now();
    const addedItem: ChecklistAddedItem = {
      code: itemCode,
      addedAt,
      month: row.month ? String(row.month) : undefined,
    };

    branchData.addedItems = {
      ...(branchData.addedItems || {}),
      [key]: addedItem,
    };
    branchData.lastUpdated = Math.max(branchData.lastUpdated || 0, addedAt);
    branchMap.set(branchCode, branchData);
  }

  return CHECKLIST_BRANCHES
    .map((branchCode) => branchMap.get(branchCode) || emptyBranchState(branchCode))
    .map((branchData) => filterBranchForPeriod(branchData, options?.period || null))
    .map((branchData) => computeBranchMetrics(branchData, options?.period || null));
}

export async function getChecklistBranch(branchId: string, options?: { period?: string | null }): Promise<ChecklistBranchState | null> {
  const branchCode = normalizeBranchId(branchId);
  const branches = await getChecklistBranches(options);
  return branches.find((branch) => branch.id === branchCode) || null;
}

export async function updateChecklistBranch(branchId: string, patch: ChecklistBranchPatch): Promise<ChecklistBranchState | null> {
  const branchCode = normalizeBranchId(branchId);
  const parsedPatch = checklistBranchPatchSchema.parse(patch);

  await ensureChecklistDefinitions();

  await sql`
    UPDATE checklist_branches
    SET updated_at = NOW()
    WHERE branch_code = ${branchCode}
  `;

  if (parsedPatch.items) {
    for (const [itemCode, state] of Object.entries(parsedPatch.items)) {
      await upsertChecklistState(branchCode, itemCode, null, state);
    }
  }

  if (parsedPatch.periods) {
    for (const [periodKey, periodData] of Object.entries(parsedPatch.periods)) {
      await upsertChecklistPeriod(periodKey);
      for (const [itemCode, state] of Object.entries(periodData.items || {})) {
        await upsertChecklistState(branchCode, itemCode, periodKey, state);
      }
    }
  }

  if (parsedPatch.addedItems !== undefined) {
    await sql`DELETE FROM checklist_added_items WHERE branch_code = ${branchCode}`;

    for (const addedItem of Object.values(parsedPatch.addedItems)) {
      const target = resolveAddedItemTarget(addedItem.month);
      await upsertCatalogItem(addedItem.code);
      await upsertChecklistPeriod(target.periodKey, target.month);
      await sql`
        INSERT INTO checklist_added_items (branch_code, period_key, period_scope, item_code, added_at, month)
        VALUES (
          ${branchCode},
          ${target.periodKey},
          ${target.periodScope},
          ${addedItem.code},
          TO_TIMESTAMP(${addedItem.addedAt} / 1000.0),
          ${target.month}
        )
        ON CONFLICT (branch_code, period_scope, item_code)
        DO UPDATE SET
          added_at = EXCLUDED.added_at,
          month = EXCLUDED.month
      `;
    }
  }

  return getChecklistBranch(branchCode);
}

export async function updateChecklistItem(
  branchId: string,
  itemCode: string,
  payload: { completed?: boolean; hasStock?: boolean; lastUpdated?: number; period?: string | null }
) {
  const branchCode = normalizeBranchId(branchId);
  const periodKey = payload.period && payload.period.trim().length > 0 ? payload.period.trim() : null;
  await ensureChecklistDefinitions();
  await upsertChecklistState(branchCode, itemCode, periodKey, payload);
  return getChecklistBranch(branchCode, { period: periodKey });
}

export async function addChecklistItem(
  branchId: string,
  payload: { code: string; month?: string; period?: string; addedAt?: number; createdBy?: string }
) {
  const branchCode = normalizeBranchId(branchId);
  const itemCode = String(payload.code).trim();
  const target = resolveAddedItemTarget(payload.period || payload.month);
  const addedAt = Number(payload.addedAt || Date.now());

  await ensureChecklistDefinitions();
  await upsertCatalogItem(itemCode);
  await upsertChecklistPeriod(target.periodKey, target.month);

  await sql`
    INSERT INTO checklist_added_items (branch_code, period_key, period_scope, item_code, added_at, month, created_by)
    VALUES (
      ${branchCode},
      ${target.periodKey},
      ${target.periodScope},
      ${itemCode},
      TO_TIMESTAMP(${addedAt} / 1000.0),
      ${target.month},
      ${payload.createdBy || null}
    )
    ON CONFLICT (branch_code, period_scope, item_code)
    DO UPDATE SET
      added_at = EXCLUDED.added_at,
      month = EXCLUDED.month,
      created_by = EXCLUDED.created_by
  `;

  return getChecklistBranch(branchCode, { period: target.periodScope === BASE_PERIOD_SCOPE ? null : target.periodKey });
}

export async function deleteChecklistAddedItem(branchId: string, itemCode: string, periodOrMonth?: string) {
  const branchCode = normalizeBranchId(branchId);
  const target = resolveAddedItemTarget(periodOrMonth);

  await ensureChecklistDefinitions();
  await sql`
    DELETE FROM checklist_added_items
    WHERE branch_code = ${branchCode}
      AND period_scope = ${target.periodScope}
      AND item_code = ${String(itemCode).trim()}
  `;

  return getChecklistBranch(branchCode, { period: target.periodScope === BASE_PERIOD_SCOPE ? null : target.periodKey });
}

export async function getChecklistRanking(periodKey = AGOSTO_2026_PERIOD_KEY) {
  const branches = await getChecklistBranches({ period: periodKey });

  const ranking = branches.map((branch) => {
    const entries = getEntriesForProgress(branch.id, periodKey);
    const totalItems = entries.length;
    const completedItems = entries.filter((entry) => getChecklistItemState(branch, entry.code, entry.periodKey)?.completed === true).length;
    const noStockItems = entries.filter((entry) => getChecklistItemState(branch, entry.code, entry.periodKey)?.hasStock === false).length;
    const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return {
      position: 0,
      branchId: branch.id,
      period: periodKey,
      totalItems,
      completedItems,
      noStockItems,
      progressPercent,
      lastUpdated: branch.lastUpdated || null,
    };
  }).sort((a, b) => {
    if (b.progressPercent !== a.progressPercent) return b.progressPercent - a.progressPercent;
    if (b.completedItems !== a.completedItems) return b.completedItems - a.completedItems;
    return a.branchId.localeCompare(b.branchId);
  }).map((row, index) => ({ ...row, position: index + 1 }));

  return ranking;
}