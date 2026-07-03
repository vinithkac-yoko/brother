import type { OpenInquiriesPipelineParams, QuotesExpiringParams } from "@fab-erp/shared";
import { openInquiriesPipelineParamsSchema, quotesExpiringParamsSchema } from "@fab-erp/shared";
import { prisma } from "../lib/prisma";

export interface OpenInquiryRow {
  inquiryId: string;
  inquiryNumber: string;
  customerName: string;
  status: string;
  material: string;
  quantity: number;
  expectedDeliveryDate: Date | null;
  createdAt: Date;
  daysOpen: number;
}

// Everything not yet WON or LOST — the shop's live pipeline.
export async function openInquiriesPipeline(
  params: OpenInquiriesPipelineParams = {},
): Promise<OpenInquiryRow[]> {
  const { customerId } = openInquiriesPipelineParamsSchema.parse(params);
  const inquiries = await prisma.inquiry.findMany({
    where: {
      deletedAt: null,
      status: { notIn: ["WON", "LOST"] },
      ...(customerId ? { customerId } : {}),
    },
    include: { customer: true },
    orderBy: { createdAt: "asc" },
  });

  const now = Date.now();
  return inquiries.map((inquiry) => ({
    inquiryId: inquiry.id,
    inquiryNumber: inquiry.inquiryNumber,
    customerName: inquiry.customer.name,
    status: inquiry.status,
    material: inquiry.material,
    quantity: inquiry.quantity,
    expectedDeliveryDate: inquiry.expectedDeliveryDate,
    createdAt: inquiry.createdAt,
    daysOpen: Math.floor((now - inquiry.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
  }));
}

export interface ExpiringQuoteRow {
  quoteId: string;
  quoteNumber: string;
  inquiryNumber: string;
  customerName: string;
  totalPaise: number;
  validUntil: Date;
  daysUntilExpiry: number;
}

// Active (DRAFT/SENT) quotes whose validity window closes within N days —
// a nudge to follow up before the customer has to be re-quoted.
export async function quotesExpiringWithinDays(
  params: QuotesExpiringParams = { withinDays: 7 },
): Promise<ExpiringQuoteRow[]> {
  const { withinDays } = quotesExpiringParamsSchema.parse(params);
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + withinDays);

  const quotes = await prisma.quote.findMany({
    where: {
      deletedAt: null,
      status: { in: ["DRAFT", "SENT"] },
      validUntil: { gte: now, lte: cutoff },
    },
    include: { inquiry: { include: { customer: true } } },
    orderBy: { validUntil: "asc" },
  });

  return quotes.map((quote) => ({
    quoteId: quote.id,
    quoteNumber: quote.quoteNumber,
    inquiryNumber: quote.inquiry.inquiryNumber,
    customerName: quote.inquiry.customer.name,
    totalPaise: quote.totalPaise,
    validUntil: quote.validUntil,
    daysUntilExpiry: Math.ceil((quote.validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  }));
}
