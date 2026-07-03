import type { Actor, RecordCustomerPOInput } from "@fab-erp/shared";
import { recordCustomerPOSchema } from "@fab-erp/shared";
import { prisma } from "../lib/prisma";
import { writeAuditEvent } from "../lib/audit";
import { requireRole } from "../lib/actor";
import { generateJobNumber } from "../lib/ids";
import { BusinessRuleError, NotFoundError } from "../lib/errors";

// Records the customer's own PO against a quote, marks the quote ACCEPTED
// and the inquiry WON, and spins up the Job spine entity (Job status starts
// AWAITING_ADVANCE — see payment.ts confirmPayment for the hard rule that
// flips it to PRODUCTION_ELIGIBLE).
export async function recordCustomerPO(actor: Actor, input: RecordCustomerPOInput) {
  requireRole(actor, ["ADMIN", "ENGINEER"]);
  const { quoteId, poNumber, poDate, poFileRef, notes, partName } =
    recordCustomerPOSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({ where: { id: quoteId }, include: { inquiry: true } });
    if (!quote || quote.deletedAt) throw new NotFoundError("Quote", quoteId);
    if (quote.status !== "DRAFT" && quote.status !== "SENT") {
      throw new BusinessRuleError(
        `Quote ${quote.quoteNumber} is ${quote.status}, expected DRAFT or SENT`,
      );
    }

    const latestDrawing = await tx.drawing.findFirst({
      where: { inquiryId: quote.inquiryId, deletedAt: null },
      orderBy: { version: "desc" },
    });
    if (!latestDrawing) {
      throw new BusinessRuleError(
        `Cannot record a Customer PO: no Drawing attached to ${quote.inquiry.inquiryNumber} yet`,
      );
    }

    const customerPO = await tx.customerPO.create({
      data: {
        poNumber,
        quoteId,
        customerId: quote.inquiry.customerId,
        poDate,
        poFileRef,
        notes,
        amountPaise: quote.totalPaise,
      },
    });

    await tx.quote.update({ where: { id: quoteId }, data: { status: "ACCEPTED" } });
    await tx.inquiry.update({ where: { id: quote.inquiryId }, data: { status: "WON" } });

    const jobNumber = await generateJobNumber(tx);
    const job = await tx.job.create({
      data: {
        jobNumber,
        inquiryId: quote.inquiryId,
        customerPOId: customerPO.id,
        customerId: quote.inquiry.customerId,
        partName: partName ?? quote.inquiry.requirementDescription.slice(0, 120),
        quantity: quote.inquiry.quantity,
        material: quote.inquiry.material,
        thickness: quote.inquiry.thickness,
        drawingRef: latestDrawing.fileRef,
        deliveryDate: quote.inquiry.expectedDeliveryDate,
        status: "AWAITING_ADVANCE",
      },
    });

    await writeAuditEvent(tx, {
      actor,
      action: "customer_po.record",
      entity: "CustomerPO",
      entityId: customerPO.id,
      after: { customerPO, job },
    });
    return { customerPO, job };
  });
}
