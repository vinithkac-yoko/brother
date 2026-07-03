import type { Actor, CreateInquiryInput, MarkInquiryLostInput, UpdateInquiryInput } from "@fab-erp/shared";
import { createInquirySchema, markInquiryLostSchema, updateInquirySchema } from "@fab-erp/shared";
import { prisma } from "../lib/prisma.js";
import { writeAuditEvent } from "../lib/audit.js";
import { requireRole } from "../lib/actor.js";
import { generateInquiryNumber } from "../lib/ids.js";
import { BusinessRuleError, NotFoundError } from "../lib/errors.js";

export async function createInquiry(actor: Actor, input: CreateInquiryInput) {
  requireRole(actor, ["ADMIN", "ENGINEER"]);
  const data = createInquirySchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
    if (!customer || customer.deletedAt) throw new NotFoundError("Customer", data.customerId);

    const inquiryNumber = await generateInquiryNumber(tx);
    const inquiry = await tx.inquiry.create({
      data: { ...data, inquiryNumber, status: "NEW" },
    });
    await writeAuditEvent(tx, {
      actor,
      action: "inquiry.create",
      entity: "Inquiry",
      entityId: inquiry.id,
      after: inquiry,
    });
    return inquiry;
  });
}

export async function updateInquiry(actor: Actor, input: UpdateInquiryInput) {
  requireRole(actor, ["ADMIN", "ENGINEER"]);
  const { inquiryId, ...data } = updateInquirySchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const before = await tx.inquiry.findUnique({ where: { id: inquiryId } });
    if (!before || before.deletedAt) throw new NotFoundError("Inquiry", inquiryId);
    if (before.status === "WON" || before.status === "LOST") {
      throw new BusinessRuleError(
        `Inquiry ${before.inquiryNumber} is already ${before.status} and can no longer be edited`,
      );
    }
    const after = await tx.inquiry.update({ where: { id: inquiryId }, data });
    await writeAuditEvent(tx, {
      actor,
      action: "inquiry.update",
      entity: "Inquiry",
      entityId: inquiryId,
      before,
      after,
    });
    return after;
  });
}

export async function markInquiryLost(actor: Actor, input: MarkInquiryLostInput) {
  requireRole(actor, ["ADMIN", "ENGINEER"]);
  const { inquiryId, lostReason, lostReasonNotes } = markInquiryLostSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const before = await tx.inquiry.findUnique({ where: { id: inquiryId } });
    if (!before || before.deletedAt) throw new NotFoundError("Inquiry", inquiryId);
    if (before.status === "WON" || before.status === "LOST") {
      throw new BusinessRuleError(
        `Inquiry ${before.inquiryNumber} is already ${before.status}`,
      );
    }
    const after = await tx.inquiry.update({
      where: { id: inquiryId },
      data: { status: "LOST", lostReason, lostReasonNotes },
    });
    await writeAuditEvent(tx, {
      actor,
      action: "inquiry.mark_lost",
      entity: "Inquiry",
      entityId: inquiryId,
      before,
      after,
    });
    return after;
  });
}
