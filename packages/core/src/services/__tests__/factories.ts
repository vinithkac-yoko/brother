import type { Actor } from "@fab-erp/shared";
import { prisma } from "../../lib/prisma.js";

export const adminActor: Actor = { type: "USER", userId: "test-admin", role: "ADMIN" };
export const engineerActor: Actor = { type: "USER", userId: "test-engineer", role: "ENGINEER" };
export const supervisorActor: Actor = { type: "USER", userId: "test-supervisor", role: "SUPERVISOR" };
export const agentActor: Actor = { type: "AGENT", conversationId: "test-conversation" };

// Matches the sample rates in CUSTOMIZE.md §4. Kept minimal — only the
// processes exercised by tests need a rate.
export async function seedClientConfig() {
  return prisma.clientConfig.upsert({
    where: { slug: "default" },
    create: {
      slug: "default",
      clientName: "Test Fabricators Pvt Ltd",
      gstRatePct: 18,
      advancePct: 50,
      balancePct: 50,
      quoteValidityDays: 15,
      approvalThresholdPaise: 0,
      transportNote: "Transport extra as applicable",
      processRates: {
        SHEET_LASER_CUTTING: { basis: "per meter", ratePaise: 1200, outsourced: false },
        BENDING: { basis: "per bend", ratePaise: 1500, outsourced: false },
      },
    },
    update: {},
  });
}

export async function createTestCustomer(overrides: Partial<{ name: string }> = {}) {
  return prisma.customer.create({
    data: { name: overrides.name ?? "Sharada Engineering" },
  });
}

export async function createTestInquiry(customerId: string, overrides: Record<string, unknown> = {}) {
  const count = await prisma.inquiry.count();
  return prisma.inquiry.create({
    data: {
      inquiryNumber: `INQ-${String(count + 1).padStart(4, "0")}`,
      customerId,
      requirementDescription: "200 pcs bracket",
      material: "MS",
      thickness: 3,
      quantity: 200,
      status: "NEW",
      ...overrides,
    },
  });
}

export async function attachTestDrawing(inquiryId: string, overrides: Record<string, unknown> = {}) {
  return prisma.drawing.create({
    data: {
      inquiryId,
      fileRef: "s3://drawings/bracket-v1.dxf",
      fileType: "DXF",
      source: "CUSTOMER_SUPPLIED",
      version: 1,
      ...overrides,
    },
  });
}
