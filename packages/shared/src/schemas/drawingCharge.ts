import { z } from "zod";

// Amount is a human judgment call, not a rate-card computation — see
// CUSTOMIZE.md §4a and claude-progress.md Decisions. The service still
// validates it's a sane positive paise integer; it just doesn't derive it.
export const createDrawingChargeSchema = z.object({
  inquiryId: z.string().min(1),
  drawingId: z.string().min(1).optional(),
  amountPaise: z.number().int().positive(),
  description: z.string().optional(),
  decidedBy: z.string().min(1),
});
export type CreateDrawingChargeInput = z.infer<typeof createDrawingChargeSchema>;

export const invoiceDrawingChargeSchema = z.object({
  drawingChargeId: z.string().min(1),
});
export type InvoiceDrawingChargeInput = z.infer<typeof invoiceDrawingChargeSchema>;

export const markDrawingChargePaidSchema = z.object({
  drawingChargeId: z.string().min(1),
});
export type MarkDrawingChargePaidInput = z.infer<typeof markDrawingChargePaidSchema>;

export const waiveDrawingChargeSchema = z.object({
  drawingChargeId: z.string().min(1),
  notes: z.string().optional(),
});
export type WaiveDrawingChargeInput = z.infer<typeof waiveDrawingChargeSchema>;
