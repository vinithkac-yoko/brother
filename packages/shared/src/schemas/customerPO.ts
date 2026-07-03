import { z } from "zod";

// poNumber is the customer's own PO number, as written on their PO
// document — not something we generate. Contrast with JOB-0001 etc, which
// are our own generated sequence numbers.
export const recordCustomerPOSchema = z.object({
  quoteId: z.string().min(1),
  poNumber: z.string().min(1),
  poDate: z.coerce.date(),
  poFileRef: z.string().min(1).optional(),
  notes: z.string().optional(),
  partName: z.string().min(1).optional(),
});
export type RecordCustomerPOInput = z.input<typeof recordCustomerPOSchema>;
