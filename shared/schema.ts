import { z } from "zod";

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

export const codeSchema = z.enum([
  "TI114F", "TI505", "138P", "118M", "400I", "505X", "506M", "305K",
  "605E", "605T", "510M", "506C", "TI90", "507M", "98KS00", "TI99",
  "TI125", "TI98KM", "TI150P", "90/91/92", "30P/30S", "150M/P",
  "451I", "81M/81S/81SM", "15S/15C", "COVER", "CORTINAS BLACKOUT",
  "CORTINAS DE TROPICAL", "8020P00", "710100", "54X100", "67100"
]);

export type Code = z.infer<typeof codeSchema>;

export interface ChecklistItem {
  code: Code;
  completed: boolean;
  communicated: boolean;
  updatedAt: number;
  updatedBy: string;
}

export interface BranchData {
  items: Record<Code, ChecklistItem>;
  totalCompleted: number;
  totalCommunicated: number;
}
