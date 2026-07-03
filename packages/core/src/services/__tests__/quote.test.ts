import { beforeEach, describe, expect, it } from "vitest";
import { truncateAllTables } from "../../lib/testHelpers";
import { buildQuote, reviseQuote } from "../quote";
import { createInquiry } from "../inquiry";
import { BusinessRuleError } from "../../lib/errors";
import { adminActor, createTestCustomer, seedClientConfig } from "./factories";

beforeEach(async () => {
  await truncateAllTables();
  await seedClientConfig();
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

describe("buildQuote", () => {
  it("computes totals from ClientConfig and moves inquiry to QUOTED", async () => {
    const inquiry = await setupInquiry();
    const quote = await buildQuote(adminActor, {
      inquiryId: inquiry.id,
      deliveryBasisNotes: "10 working days from advance + drawing approval",
      lineItems: [
        { process: "SHEET_LASER_CUTTING", description: "Cutting", qty: 20, unit: "meter", ratePaise: 1200 },
      ],
    });

    expect(quote.quoteNumber).toBe("Q-0001");
    expect(quote.version).toBe(1);
    expect(quote.status).toBe("DRAFT");
    expect(quote.subtotalPaise).toBe(24000);
    expect(quote.gstAmountPaise).toBe(4320);
    expect(quote.totalPaise).toBe(28320);
    expect(quote.lineItems).toHaveLength(1);

    const paymentTerms = quote.paymentTermsSnapshot as { advancePct: number; balancePct: number };
    expect(paymentTerms.advancePct).toBe(50);
  });

  it("refuses to quote a WON or LOST inquiry", async () => {
    const inquiry = await setupInquiry();
    const { markInquiryLost } = await import("../inquiry.js");
    await markInquiryLost(adminActor, { inquiryId: inquiry.id, lostReason: "PRICE" });

    await expect(
      buildQuote(adminActor, {
        inquiryId: inquiry.id,
        deliveryBasisNotes: "10 days",
        lineItems: [{ process: "OTHER", description: "x", qty: 1, unit: "lot", ratePaise: 100 }],
      }),
    ).rejects.toThrow(BusinessRuleError);
  });
});

describe("reviseQuote", () => {
  it("creates a new version, points supersedesId at the original, and supersedes it", async () => {
    const inquiry = await setupInquiry();
    const original = await buildQuote(adminActor, {
      inquiryId: inquiry.id,
      deliveryBasisNotes: "10 working days",
      lineItems: [
        { process: "SHEET_LASER_CUTTING", description: "Cutting", qty: 20, unit: "meter", ratePaise: 1200 },
      ],
    });

    const revised = await reviseQuote(adminActor, {
      previousQuoteId: original.id,
      deliveryBasisNotes: "12 working days",
      lineItems: [
        { process: "SHEET_LASER_CUTTING", description: "Cutting", qty: 25, unit: "meter", ratePaise: 1200 },
      ],
    });

    expect(revised.quoteNumber).toBe("Q-0001-v2");
    expect(revised.version).toBe(2);
    expect(revised.supersedesId).toBe(original.id);
    expect(revised.subtotalPaise).toBe(30000);

    const { prisma } = await import("../../lib/prisma.js");
    const originalAfter = await prisma.quote.findUniqueOrThrow({ where: { id: original.id } });
    expect(originalAfter.status).toBe("SUPERSEDED");
  });

  it("refuses to revise an already-superseded quote", async () => {
    const inquiry = await setupInquiry();
    const original = await buildQuote(adminActor, {
      inquiryId: inquiry.id,
      deliveryBasisNotes: "10 working days",
      lineItems: [{ process: "OTHER", description: "x", qty: 1, unit: "lot", ratePaise: 1000 }],
    });
    await reviseQuote(adminActor, {
      previousQuoteId: original.id,
      deliveryBasisNotes: "12 working days",
      lineItems: [{ process: "OTHER", description: "x", qty: 1, unit: "lot", ratePaise: 1200 }],
    });

    await expect(
      reviseQuote(adminActor, {
        previousQuoteId: original.id,
        deliveryBasisNotes: "14 working days",
        lineItems: [{ process: "OTHER", description: "x", qty: 1, unit: "lot", ratePaise: 1300 }],
      }),
    ).rejects.toThrow(BusinessRuleError);
  });
});
