import type {
  Actor,
  CreateDrawingChargeInput,
  InvoiceDrawingChargeInput,
  MarkDrawingChargePaidInput,
  WaiveDrawingChargeInput,
} from "@fab-erp/shared";
import {
  createDrawingChargeSchema,
  invoiceDrawingChargeSchema,
  markDrawingChargePaidSchema,
  waiveDrawingChargeSchema,
} from "@fab-erp/shared";
import { prisma } from "../lib/prisma";
import { writeAuditEvent } from "../lib/audit";
import { requireRole } from "../lib/actor";
import { BusinessRuleError, NotFoundError } from "../lib/errors";

// See CUSTOMIZE.md §4a / claude-progress.md Decisions: this charge applies
// whether or not the part is later found feasible to manufacture, and its
// amount is a human judgment call, not a rate-card computation.
export async function createDrawingCharge(actor: Actor, input: CreateDrawingChargeInput) {
  requireRole(actor, ["ADMIN", "ENGINEER"]);
  const data = createDrawingChargeSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const inquiry = await tx.inquiry.findUnique({ where: { id: data.inquiryId } });
    if (!inquiry || inquiry.deletedAt) throw new NotFoundError("Inquiry", data.inquiryId);
    if (data.drawingId) {
      const drawing = await tx.drawing.findUnique({ where: { id: data.drawingId } });
      if (!drawing || drawing.deletedAt) throw new NotFoundError("Drawing", data.drawingId);
    }
    const charge = await tx.drawingCharge.create({ data });
    await writeAuditEvent(tx, {
      actor,
      action: "drawing_charge.create",
      entity: "DrawingCharge",
      entityId: charge.id,
      after: charge,
    });
    return charge;
  });
}

export async function invoiceDrawingCharge(actor: Actor, input: InvoiceDrawingChargeInput) {
  requireRole(actor, ["ADMIN", "ENGINEER"]);
  const { drawingChargeId } = invoiceDrawingChargeSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const before = await tx.drawingCharge.findUnique({ where: { id: drawingChargeId } });
    if (!before || before.deletedAt) throw new NotFoundError("DrawingCharge", drawingChargeId);
    if (before.status !== "PENDING") {
      throw new BusinessRuleError(
        `DrawingCharge ${drawingChargeId} is ${before.status}, expected PENDING`,
      );
    }
    const after = await tx.drawingCharge.update({
      where: { id: drawingChargeId },
      data: { status: "INVOICED", invoicedAt: new Date() },
    });
    await writeAuditEvent(tx, {
      actor,
      action: "drawing_charge.invoice",
      entity: "DrawingCharge",
      entityId: drawingChargeId,
      before,
      after,
    });
    return after;
  });
}

export async function markDrawingChargePaid(actor: Actor, input: MarkDrawingChargePaidInput) {
  requireRole(actor, ["ADMIN", "ENGINEER"]);
  const { drawingChargeId } = markDrawingChargePaidSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const before = await tx.drawingCharge.findUnique({ where: { id: drawingChargeId } });
    if (!before || before.deletedAt) throw new NotFoundError("DrawingCharge", drawingChargeId);
    if (before.status !== "INVOICED") {
      throw new BusinessRuleError(
        `DrawingCharge ${drawingChargeId} is ${before.status}, expected INVOICED`,
      );
    }
    const after = await tx.drawingCharge.update({
      where: { id: drawingChargeId },
      data: { status: "PAID", paidAt: new Date() },
    });
    await writeAuditEvent(tx, {
      actor,
      action: "drawing_charge.mark_paid",
      entity: "DrawingCharge",
      entityId: drawingChargeId,
      before,
      after,
    });
    return after;
  });
}

// A per-case human call, e.g. the part turned out feasible after all and
// the owner folds the design fee into the full order instead of double
// billing — see the WAIVED status rationale in claude-progress.md.
export async function waiveDrawingCharge(actor: Actor, input: WaiveDrawingChargeInput) {
  requireRole(actor, ["ADMIN", "ENGINEER"]);
  const { drawingChargeId, notes } = waiveDrawingChargeSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const before = await tx.drawingCharge.findUnique({ where: { id: drawingChargeId } });
    if (!before || before.deletedAt) throw new NotFoundError("DrawingCharge", drawingChargeId);
    if (before.status === "PAID") {
      throw new BusinessRuleError(`DrawingCharge ${drawingChargeId} is already PAID, cannot waive`);
    }
    const after = await tx.drawingCharge.update({
      where: { id: drawingChargeId },
      data: { status: "WAIVED", notes: notes ?? before.notes },
    });
    await writeAuditEvent(tx, {
      actor,
      action: "drawing_charge.waive",
      entity: "DrawingCharge",
      entityId: drawingChargeId,
      before,
      after,
    });
    return after;
  });
}
