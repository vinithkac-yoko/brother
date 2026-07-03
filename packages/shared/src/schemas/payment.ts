import { z } from "zod";
import { paymentTypeSchema } from "../enums";

export const recordPaymentSchema = z.object({
  customerPOId: z.string().min(1),
  type: paymentTypeSchema,
  amountPaise: z.number().int().positive(),
  method: z.string().min(1).optional(),
  referenceNumber: z.string().min(1).optional(),
});
export type RecordPaymentInput = z.input<typeof recordPaymentSchema>;

export const confirmPaymentSchema = z.object({
  paymentId: z.string().min(1),
  confirmedBy: z.string().min(1),
});
export type ConfirmPaymentInput = z.input<typeof confirmPaymentSchema>;
