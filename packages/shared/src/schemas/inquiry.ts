import { z } from "zod";
import { lostReasonSchema } from "../enums";

export const createInquirySchema = z.object({
  customerId: z.string().min(1),
  contactId: z.string().min(1).optional(),
  requirementDescription: z.string().min(1),
  material: z.string().min(1),
  thickness: z.number().positive(),
  quantity: z.number().int().positive(),
  expectedDeliveryDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});
export type CreateInquiryInput = z.input<typeof createInquirySchema>;

export const updateInquirySchema = z.object({
  inquiryId: z.string().min(1),
  requirementDescription: z.string().min(1).optional(),
  material: z.string().min(1).optional(),
  thickness: z.number().positive().optional(),
  quantity: z.number().int().positive().optional(),
  expectedDeliveryDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});
export type UpdateInquiryInput = z.input<typeof updateInquirySchema>;

export const markInquiryLostSchema = z
  .object({
    inquiryId: z.string().min(1),
    lostReason: lostReasonSchema,
    lostReasonNotes: z.string().optional(),
  })
  .refine((v) => v.lostReason !== "OTHER" || Boolean(v.lostReasonNotes?.trim()), {
    message: "lostReasonNotes is required when lostReason is OTHER",
    path: ["lostReasonNotes"],
  });
export type MarkInquiryLostInput = z.input<typeof markInquiryLostSchema>;
