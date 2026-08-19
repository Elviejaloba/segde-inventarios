import { z } from "zod";

export const roleSchema = z.enum(["owner", "branch"]);
export type Role = z.infer<typeof roleSchema>;

export const branchSchema = z.enum([
  "T.Mza",
  "T.SJuan", 
  "T.SLuis",
  "Crisa2",
  "T.SRafael",
  "T.SMartin",
  "T.Maipu",
  "T.Tunuyan",
  "T.Lujan",
  "T.GLLEN"
]);

export type Branch = z.infer<typeof branchSchema>;

export const itemSchema = z.object({
  completed: z.boolean().default(false),
  hasStock: z.boolean().default(true),
  lastUpdated: z.number().optional()
});

export type Item = z.infer<typeof itemSchema>;

export const branchDataSchema = z.object({
  id: branchSchema,
  totalCompleted: z.number().default(0),
  noStock: z.number().default(0),
  items: z.record(z.string(), itemSchema).default({})
});

export type BranchData = z.infer<typeof branchDataSchema>;

export const codeSchema = z.enum([
  "TI114F", "TI505", "138P", "118M", "400I", "505X", "506M", "305K",
  "605E", "605T", "510M", "506C", "TI90", "507M", "98KS00", "TI99",
  "TI125", "TI98KM", "TI150P", "90/91/92", "30P/30S", "150M/P",
  "451I", "81M/81S/81SM", "15S/15C", "COVER", "CORTINAS BLACKOUT",
  "CORTINAS DE TROPICAL", "8020P00", "710100", "54X100", "67100"
]);

export type Code = z.infer<typeof codeSchema>;

export const userSchema = z.object({
  email: z.string().email(),
  role: roleSchema,
  branch: branchSchema.optional(), 
  createdAt: z.string(),
});

export type User = z.infer<typeof userSchema>;

// Schema for adjustments/ajustes
export const ajusteSchema = z.object({
  id: z.number().optional(), // Auto-generated
  Sucursal: z.string(),
  Comprobante: z.string(),
  FechaMovimiento: z.string().optional(), // Date as string in DD/MM/YYYY format
  TipoMovimiento: z.string().optional(),
  Codigo: z.string(), // CÃ³d. ArtÃ­culo
  Articulo: z.string().optional(), // Description of the article
  Diferencia: z.number() // Cantidad
});

export type Ajuste = z.infer<typeof ajusteSchema>;

// Insert schema for creating new adjustments
export const insertAjusteSchema = ajusteSchema.omit({ id: true });
export type InsertAjuste = z.infer<typeof insertAjusteSchema>;

// Schema for inventory analysis per comprobante
export const comprobanteAnalysisSchema = z.object({
  comprobante: z.string(),
  totalPhysical: z.number(),
  totalTheoretical: z.number(),
  totalDifference: z.number(),
  differencePct: z.number(),
  rowCount: z.number(),
  avgDifference: z.number(),
  variance: z.number(),
  outliers: z.number() // count of rows with >10% diff
});

export type ComprobanteAnalysis = z.infer<typeof comprobanteAnalysisSchema>;

// Schema for inventory capture metadata
export const inventoryCaptureSchema = z.object({
  id: z.string().optional(), // Firestore doc ID
  sucursal: z.string(),
  fecha: z.string(),
  fileName: z.string(),
  fileUrl: z.string(),
  totalRows: z.number(),
  totalPhysical: z.number(),
  totalTheoretical: z.number(),
  totalDifference: z.number(),
  differencePct: z.number(),
  comprobantes: z.array(comprobanteAnalysisSchema),
  createdAt: z.any() // serverTimestamp
});

export type InventoryCapture = z.infer<typeof inventoryCaptureSchema>;

// Schema for branch-level summary (consolidated across all captures)
export const branchSummarySchema = z.object({
  sucursal: z.string(),
  totalPhysical: z.number(),
  totalTheoretical: z.number(),
  totalDifference: z.number(),
  differencePct: z.number(),
  capturesCount: z.number(),
  lastUpdated: z.any(), // serverTimestamp
  comprobantesProcessed: z.number()
});

export type BranchSummary = z.infer<typeof branchSummarySchema>;
export const checklistItemStateSchema = z.object({
  completed: z.boolean().default(false),
  hasStock: z.boolean().default(true),
  lastUpdated: z.number().optional(),
});

export type ChecklistItemState = z.infer<typeof checklistItemStateSchema>;

export const checklistPeriodStateSchema = z.object({
  items: z.record(z.string(), checklistItemStateSchema).default({}),
  lastUpdated: z.number().optional(),
});

export type ChecklistPeriodState = z.infer<typeof checklistPeriodStateSchema>;

export const checklistAddedItemSchema = z.object({
  code: z.string(),
  addedAt: z.number(),
  month: z.string().optional(),
});

export type ChecklistAddedItem = z.infer<typeof checklistAddedItemSchema>;

export const checklistBranchStateSchema = z.object({
  id: z.string(),
  totalCompleted: z.number().default(0),
  noStock: z.number().default(0),
  items: z.record(z.string(), checklistItemStateSchema).default({}),
  periods: z.record(z.string(), checklistPeriodStateSchema).optional(),
  addedItems: z.record(z.string(), checklistAddedItemSchema).optional(),
  lastUpdated: z.number().optional(),
});

export type ChecklistBranchState = z.infer<typeof checklistBranchStateSchema>;

const checklistItemPatchSchema = z.object({
  completed: z.boolean().optional(),
  hasStock: z.boolean().optional(),
  lastUpdated: z.number().optional(),
});

export const checklistSingleItemUpdateSchema = checklistItemPatchSchema.extend({
  period: z.string().optional(),
});

export const checklistAddedItemInputSchema = z.object({
  code: z.string().min(1),
  month: z.string().optional(),
  period: z.string().optional(),
  addedAt: z.number().optional(),
  createdBy: z.string().optional(),
});

export const checklistBranchPatchSchema = z.object({
  items: z.record(z.string(), checklistItemPatchSchema).optional(),
  periods: z.record(z.string(), z.object({
    items: z.record(z.string(), checklistItemPatchSchema).optional(),
    lastUpdated: z.number().optional(),
  })).optional(),
  addedItems: z.record(z.string(), checklistAddedItemSchema).optional(),
  totalCompleted: z.number().optional(),
  noStock: z.number().optional(),
});

export type ChecklistBranchPatch = z.infer<typeof checklistBranchPatchSchema>;

export const muestreoFileStatusSchema = z.enum([
  "no_visto",
  "visto",
  "analizado",
  "sin_diferencias",
  "revisar",
]);

export type MuestreoFileStatus = z.infer<typeof muestreoFileStatusSchema>;

export const muestreoFileStatusRecordSchema = z.object({
  id: z.number().optional(),
  fileId: z.string().min(1),
  filePath: z.string().nullable().optional(),
  status: muestreoFileStatusSchema,
  updatedAt: z.string().optional(),
  updatedBy: z.string().nullable().optional(),
});

export type MuestreoFileStatusRecord = z.infer<typeof muestreoFileStatusRecordSchema>;

export const muestreoFileStatusUpdateSchema = z.object({
  status: muestreoFileStatusSchema,
  path: z.string().optional(),
  updatedBy: z.string().trim().max(120).optional().nullable(),
});

export type MuestreoFileStatusUpdateInput = z.infer<typeof muestreoFileStatusUpdateSchema>;

export const rindeArticleSchema = z.object({
  code: z.string(),
  description: z.string().nullable().optional(),
  synonym: z.string().nullable().optional(),
  codigoBase: z.string().nullable().optional(),
  descripcionBase: z.string().nullable().optional(),
  hasRinde: z.boolean().optional(),
  active: z.boolean().optional(),
  anchoCm: z.number().nullable().optional(),
  metrosReferencia: z.number().nullable().optional(),
  kgPorMetro: z.number().nullable().optional(),
  referenceLabel: z.string().nullable().optional(),
});

export type RindeArticle = z.infer<typeof rindeArticleSchema>;

export const telaRindeSchema = z.object({
  id: z.number().optional(),
  articleCode: z.string(),
  anchoCm: z.number(),
  pesoReferenciaKg: z.number(),
  metrosReferencia: z.number(),
  kgPorMetro: z.number(),
  referenceLabel: z.string().nullable().optional(),
  activo: z.boolean().default(true),
  updatedAt: z.string().nullable().optional(),
  updatedBy: z.string().nullable().optional(),
});

export type TelaRinde = z.infer<typeof telaRindeSchema>;

export const telaRindeUpsertSchema = z.object({
  articleCode: z.string().min(1),
  anchoCm: z.coerce.number().positive(),
  pesoReferenciaKg: z.coerce.number().positive(),
  metrosReferencia: z.coerce.number().positive(),
  kgPorMetro: z.coerce.number().positive(),
  referenceLabel: z.string().trim().max(120).optional().nullable(),
  activo: z.boolean().default(true),
  updatedBy: z.string().trim().max(120).optional().nullable(),
});

export type TelaRindeUpsertInput = z.infer<typeof telaRindeUpsertSchema>;

export const telaRindeAuthSchema = z.object({
  password: z.string().min(1),
});

export type TelaRindeAuthInput = z.infer<typeof telaRindeAuthSchema>;

export const telaRindeResponseSchema = z.object({
  article: rindeArticleSchema,
  rinde: telaRindeSchema.nullable(),
});

export type TelaRindeResponse = z.infer<typeof telaRindeResponseSchema>;
