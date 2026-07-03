import { z } from "zod";
import { riskLevelSchema } from "../enums.js";

// Structured checklist stored as FeasibilityCheck.checklist (Json). Kept as
// a named schema (not an inline z.record) so the feasibility skill and the
// feasibility_checklist artifact share one shape.
export const feasibilityChecklistSchema = z.object({
  drawingAvailable: z.boolean(),
  machineCompatible: z.boolean(),
  tubeLaserOutsourcingRequired: z.boolean(),
  tolerancesSpecified: z.boolean(),
  powderCoatColorSpecified: z.boolean(),
  notes: z.string().optional(),
});
export type FeasibilityChecklist = z.infer<typeof feasibilityChecklistSchema>;

export const createFeasibilityCheckSchema = z.object({
  inquiryId: z.string().min(1),
  checklist: feasibilityChecklistSchema,
});
export type CreateFeasibilityCheckInput = z.infer<typeof createFeasibilityCheckSchema>;

export const completeFeasibilityCheckSchema = z.object({
  feasibilityCheckId: z.string().min(1),
  riskLevel: riskLevelSchema,
  estProductionDays: z.number().int().positive(),
  missingInfo: z.array(z.string().min(1)).default([]),
  outsourcingNeeded: z.boolean().default(false),
  outsourcingNotes: z.string().optional(),
  completedBy: z.string().min(1),
});
export type CompleteFeasibilityCheckInput = z.infer<typeof completeFeasibilityCheckSchema>;
