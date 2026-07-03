import { z } from "zod";
import { drawingFileTypeSchema, drawingSourceSchema } from "../enums.js";

export const attachDrawingSchema = z.object({
  inquiryId: z.string().min(1),
  fileRef: z.string().min(1),
  fileType: drawingFileTypeSchema,
  source: drawingSourceSchema.default("CUSTOMER_SUPPLIED"),
});
export type AttachDrawingInput = z.infer<typeof attachDrawingSchema>;

export const reviewDrawingSchema = z.object({
  drawingId: z.string().min(1),
  reviewNotes: z.string().optional(),
  flags: z.array(z.string().min(1)).default([]),
  reviewedBy: z.string().min(1),
});
export type ReviewDrawingInput = z.infer<typeof reviewDrawingSchema>;
