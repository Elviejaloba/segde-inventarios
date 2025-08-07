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
  "T.Lujan"
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
  Codigo: z.string(), // Cód. Artículo
  Articulo: z.string().optional(), // Description of the article
  Diferencia: z.number() // Cantidad
});

export type Ajuste = z.infer<typeof ajusteSchema>;

// Insert schema for creating new adjustments
export const insertAjusteSchema = ajusteSchema.omit({ id: true });
export type InsertAjuste = z.infer<typeof insertAjusteSchema>;