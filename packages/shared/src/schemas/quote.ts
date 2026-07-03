import { z } from "zod";
import { quoteProcessSchema } from "../enums.js";

// amountPaise is deliberately NOT accepted as input — it's always
// qty * ratePaise, computed server-side in the quote-build service. See
// CLAUDE.md mission-critical rule 3.
export const quoteLineItemInputSchema = z.object({
  process: quoteProcessSchema,
  description: z.string().min(1),
  qty: z.number().positive(),
  unit: z.string().min(1),
  ratePaise: z.number().int().nonnegative(),
});
export type QuoteLineItemInput = z.infer<typeof quoteLineItemInputSchema>;

export const buildQuoteSchema = z.object({
  inquiryId: z.string().min(1),
  lineItems: z.array(quoteLineItemInputSchema).min(1),
  deliveryBasisNotes: z.string().min(1),
  preparedBy: z.string().min(1).optional(),
});
export type BuildQuoteInput = z.infer<typeof buildQuoteSchema>;

export const reviseQuoteSchema = z.object({
  previousQuoteId: z.string().min(1),
  lineItems: z.array(quoteLineItemInputSchema).min(1),
  deliveryBasisNotes: z.string().min(1),
  preparedBy: z.string().min(1).optional(),
});
export type ReviseQuoteInput = z.infer<typeof reviseQuoteSchema>;
