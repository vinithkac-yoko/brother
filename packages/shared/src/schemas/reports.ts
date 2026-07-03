import { z } from "zod";

export const openInquiriesPipelineParamsSchema = z.object({
  customerId: z.string().min(1).optional(),
});
export type OpenInquiriesPipelineParams = z.input<typeof openInquiriesPipelineParamsSchema>;

export const quotesExpiringParamsSchema = z.object({
  withinDays: z.number().int().positive().default(7),
});
export type QuotesExpiringParams = z.input<typeof quotesExpiringParamsSchema>;
