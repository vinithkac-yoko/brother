import type { Actor, BuildQuoteInput, ReviseQuoteInput } from "@fab-erp/shared";
import { buildQuoteSchema, reviseQuoteSchema } from "@fab-erp/shared";
import { prisma } from "../lib/prisma.js";
import { writeAuditEvent } from "../lib/audit.js";
import { requireRole } from "../lib/actor.js";
import { generateQuoteNumber } from "../lib/ids.js";
import { getClientConfig } from "../lib/clientConfig.js";
import { computeQuoteTotals } from "../lib/quoteMath.js";
import { BusinessRuleError, NotFoundError } from "../lib/errors.js";

export async function buildQuote(actor: Actor, input: BuildQuoteInput) {
  requireRole(actor, ["ADMIN", "ENGINEER"]);
  const { inquiryId, lineItems, deliveryBasisNotes, preparedBy } = buildQuoteSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const inquiry = await tx.inquiry.findUnique({ where: { id: inquiryId } });
    if (!inquiry || inquiry.deletedAt) throw new NotFoundError("Inquiry", inquiryId);
    if (inquiry.status === "WON" || inquiry.status === "LOST") {
      throw new BusinessRuleError(`Inquiry ${inquiry.inquiryNumber} is already ${inquiry.status}`);
    }

    const config = await getClientConfig(tx);
    const gstRatePct = Number(config.gstRatePct);
    const totals = computeQuoteTotals(lineItems, gstRatePct);
    const { quoteNumber, version } = await generateQuoteNumber(tx);

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + config.quoteValidityDays);

    const quote = await tx.quote.create({
      data: {
        quoteNumber,
        inquiryId,
        version,
        status: "DRAFT",
        subtotalPaise: totals.subtotalPaise,
        gstRatePct: config.gstRatePct,
        gstAmountPaise: totals.gstAmountPaise,
        totalPaise: totals.totalPaise,
        validityDays: config.quoteValidityDays,
        validUntil,
        paymentTermsSnapshot: {
          advancePct: config.advancePct,
          balancePct: config.balancePct,
          balanceDueAt: "before_dispatch",
        },
        deliveryBasisNotes,
        transportNote: config.transportNote,
        preparedBy,
        lineItems: {
          create: totals.lineItems.map((item, sortOrder) => ({
            process: item.process,
            description: item.description,
            qty: item.qty,
            unit: item.unit,
            ratePaise: item.ratePaise,
            amountPaise: item.amountPaise,
            sortOrder,
          })),
        },
      },
      include: { lineItems: true },
    });

    if (inquiry.status !== "QUOTED") {
      await tx.inquiry.update({ where: { id: inquiryId }, data: { status: "QUOTED" } });
    }

    await writeAuditEvent(tx, {
      actor,
      action: "quote.build",
      entity: "Quote",
      entityId: quote.id,
      after: quote,
    });
    return quote;
  });
}

export async function reviseQuote(actor: Actor, input: ReviseQuoteInput) {
  requireRole(actor, ["ADMIN", "ENGINEER"]);
  const { previousQuoteId, lineItems, deliveryBasisNotes, preparedBy } =
    reviseQuoteSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const previousQuote = await tx.quote.findUnique({ where: { id: previousQuoteId } });
    if (!previousQuote || previousQuote.deletedAt) {
      throw new NotFoundError("Quote", previousQuoteId);
    }
    if (previousQuote.status === "SUPERSEDED") {
      throw new BusinessRuleError(`Quote ${previousQuote.quoteNumber} is already superseded`);
    }
    if (previousQuote.status === "ACCEPTED") {
      throw new BusinessRuleError(
        `Quote ${previousQuote.quoteNumber} is already accepted (has a CustomerPO) and cannot be revised`,
      );
    }

    const config = await getClientConfig(tx);
    const gstRatePct = Number(config.gstRatePct);
    const totals = computeQuoteTotals(lineItems, gstRatePct);
    const { quoteNumber, version } = await generateQuoteNumber(tx, {
      previousQuoteNumber: previousQuote.quoteNumber,
    });

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + config.quoteValidityDays);

    const newQuote = await tx.quote.create({
      data: {
        quoteNumber,
        inquiryId: previousQuote.inquiryId,
        version,
        status: "DRAFT",
        subtotalPaise: totals.subtotalPaise,
        gstRatePct: config.gstRatePct,
        gstAmountPaise: totals.gstAmountPaise,
        totalPaise: totals.totalPaise,
        validityDays: config.quoteValidityDays,
        validUntil,
        paymentTermsSnapshot: {
          advancePct: config.advancePct,
          balancePct: config.balancePct,
          balanceDueAt: "before_dispatch",
        },
        deliveryBasisNotes,
        transportNote: config.transportNote,
        preparedBy,
        supersedesId: previousQuote.id,
        lineItems: {
          create: totals.lineItems.map((item, sortOrder) => ({
            process: item.process,
            description: item.description,
            qty: item.qty,
            unit: item.unit,
            ratePaise: item.ratePaise,
            amountPaise: item.amountPaise,
            sortOrder,
          })),
        },
      },
      include: { lineItems: true },
    });

    await tx.quote.update({ where: { id: previousQuote.id }, data: { status: "SUPERSEDED" } });

    await writeAuditEvent(tx, {
      actor,
      action: "quote.revise",
      entity: "Quote",
      entityId: newQuote.id,
      before: previousQuote,
      after: newQuote,
    });
    return newQuote;
  });
}
