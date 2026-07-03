import { beforeEach, describe, expect, it } from "vitest";
import { truncateAllTables } from "../../lib/testHelpers.js";
import { prisma } from "../../lib/prisma.js";
import { attachDrawing, reviewDrawing } from "../drawing.js";
import { createInquiry } from "../inquiry.js";
import { adminActor, createTestCustomer } from "./factories.js";

beforeEach(async () => {
  await truncateAllTables();
});

async function setupInquiry() {
  const customer = await createTestCustomer();
  return createInquiry(adminActor, {
    customerId: customer.id,
    requirementDescription: "200 pcs bracket",
    material: "MS",
    thickness: 3,
    quantity: 200,
  });
}

describe("attachDrawing", () => {
  it("moves a NEW inquiry to REVIEWING", async () => {
    const inquiry = await setupInquiry();
    expect(inquiry.status).toBe("NEW");

    await attachDrawing(adminActor, {
      inquiryId: inquiry.id,
      fileRef: "s3://drawings/bracket.dxf",
      fileType: "DXF",
      source: "CUSTOMER_SUPPLIED",
    });

    const after = await prisma.inquiry.findUniqueOrThrow({ where: { id: inquiry.id } });
    expect(after.status).toBe("REVIEWING");
  });

  it("records source SHOP_DRAWN for shop-created CAD", async () => {
    const inquiry = await setupInquiry();
    const drawing = await attachDrawing(adminActor, {
      inquiryId: inquiry.id,
      fileRef: "s3://drawings/shop-drawn.dxf",
      fileType: "DXF",
      source: "SHOP_DRAWN",
    });
    expect(drawing.source).toBe("SHOP_DRAWN");
  });

  it("does not regress status when attaching a later revision", async () => {
    const inquiry = await setupInquiry();
    await attachDrawing(adminActor, {
      inquiryId: inquiry.id,
      fileRef: "v1.dxf",
      fileType: "DXF",
    });
    await prisma.inquiry.update({ where: { id: inquiry.id }, data: { status: "FEASIBILITY" } });

    const secondDrawing = await attachDrawing(adminActor, {
      inquiryId: inquiry.id,
      fileRef: "v2.dxf",
      fileType: "DXF",
    });
    expect(secondDrawing.version).toBe(2);

    const after = await prisma.inquiry.findUniqueOrThrow({ where: { id: inquiry.id } });
    expect(after.status).toBe("FEASIBILITY");
  });
});

describe("reviewDrawing", () => {
  it("records review notes and flags missing info", async () => {
    const inquiry = await setupInquiry();
    const drawing = await attachDrawing(adminActor, {
      inquiryId: inquiry.id,
      fileRef: "bracket.dxf",
      fileType: "DXF",
    });

    const reviewed = await reviewDrawing(adminActor, {
      drawingId: drawing.id,
      reviewNotes: "Tolerances look fine",
      flags: ["missing powder coat color"],
      reviewedBy: "Kasi",
    });

    expect(reviewed.flags).toEqual(["missing powder coat color"]);
    expect(reviewed.reviewedBy).toBe("Kasi");
    expect(reviewed.reviewedAt).not.toBeNull();
  });
});
