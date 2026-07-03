import type { Actor, AttachDrawingInput, ReviewDrawingInput } from "@fab-erp/shared";
import { attachDrawingSchema, reviewDrawingSchema } from "@fab-erp/shared";
import { prisma } from "../lib/prisma";
import { writeAuditEvent } from "../lib/audit";
import { requireRole } from "../lib/actor";
import { NotFoundError } from "../lib/errors";

export async function attachDrawing(actor: Actor, input: AttachDrawingInput) {
  requireRole(actor, ["ADMIN", "ENGINEER"]);
  const data = attachDrawingSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const inquiry = await tx.inquiry.findUnique({ where: { id: data.inquiryId } });
    if (!inquiry || inquiry.deletedAt) throw new NotFoundError("Inquiry", data.inquiryId);

    const existingCount = await tx.drawing.count({ where: { inquiryId: data.inquiryId } });
    const drawing = await tx.drawing.create({
      data: { ...data, version: existingCount + 1 },
    });

    // First drawing on a fresh inquiry moves it into review; re-attaching a
    // revision later (already past NEW) doesn't regress the pipeline stage.
    if (inquiry.status === "NEW") {
      await tx.inquiry.update({ where: { id: inquiry.id }, data: { status: "REVIEWING" } });
    }

    await writeAuditEvent(tx, {
      actor,
      action: "drawing.attach",
      entity: "Drawing",
      entityId: drawing.id,
      after: drawing,
    });
    return drawing;
  });
}

export async function reviewDrawing(actor: Actor, input: ReviewDrawingInput) {
  requireRole(actor, ["ADMIN", "ENGINEER"]);
  const { drawingId, reviewNotes, flags, reviewedBy } = reviewDrawingSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const before = await tx.drawing.findUnique({ where: { id: drawingId } });
    if (!before || before.deletedAt) throw new NotFoundError("Drawing", drawingId);
    const after = await tx.drawing.update({
      where: { id: drawingId },
      data: { reviewNotes, flags, reviewedBy, reviewedAt: new Date() },
    });
    await writeAuditEvent(tx, {
      actor,
      action: "drawing.review",
      entity: "Drawing",
      entityId: drawingId,
      before,
      after,
    });
    return after;
  });
}
