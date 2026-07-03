import { beforeEach, describe, expect, it } from "vitest";
import { truncateAllTables } from "../../lib/testHelpers.js";
import { openInquiriesPipeline, quotesExpiringWithinDays } from "../reports.js";
import { createInquiry, markInquiryLost } from "../inquiry.js";
import { buildQuote } from "../quote.js";
import { prisma } from "../../lib/prisma.js";
import { adminActor, createTestCustomer, seedClientConfig } from "./factories.js";

beforeEach(async () => {
  await truncateAllTables();
  await seedClientConfig();
});

describe("openInquiriesPipeline", () => {
  it("excludes WON and LOST inquiries", async () => {
    const customer = await createTestCustomer();
    const open = await createInquiry(adminActor, {
      customerId: customer.id,
      requirementDescription: "open one",
      material: "MS",
      thickness: 3,
      quantity: 10,
    });
    const lost = await createInquiry(adminActor, {
      customerId: customer.id,
      requirementDescription: "lost one",
      material: "MS",
      thickness: 3,
      quantity: 10,
    });
    await markInquiryLost(adminActor, { inquiryId: lost.id, lostReason: "PRICE" });

    const rows = await openInquiriesPipeline();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.inquiryId).toBe(open.id);
  });

  it("filters by customerId when given", async () => {
    const customerA = await createTestCustomer({ name: "A" });
    const customerB = await createTestCustomer({ name: "B" });
    await createInquiry(adminActor, {
      customerId: customerA.id,
      requirementDescription: "a",
      material: "MS",
      thickness: 3,
      quantity: 1,
    });
    await createInquiry(adminActor, {
      customerId: customerB.id,
      requirementDescription: "b",
      material: "MS",
      thickness: 3,
      quantity: 1,
    });

    const rows = await openInquiriesPipeline({ customerId: customerA.id });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.customerName).toBe("A");
  });
});

describe("quotesExpiringWithinDays", () => {
  it("only returns active quotes expiring within the window", async () => {
    const customer = await createTestCustomer();
    const inquiry = await createInquiry(adminActor, {
      customerId: customer.id,
      requirementDescription: "x",
      material: "MS",
      thickness: 3,
      quantity: 1,
    });
    const quote = await buildQuote(adminActor, {
      inquiryId: inquiry.id,
      deliveryBasisNotes: "10 days",
      lineItems: [{ process: "OTHER", description: "x", qty: 1, unit: "lot", ratePaise: 1000 }],
    });
    // Force validUntil to 3 days out (default seed config validity is 15).
    await prisma.quote.update({
      where: { id: quote.id },
      data: { validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
    });

    const withinFive = await quotesExpiringWithinDays({ withinDays: 5 });
    expect(withinFive).toHaveLength(1);
    expect(withinFive[0]?.quoteId).toBe(quote.id);

    const withinOne = await quotesExpiringWithinDays({ withinDays: 1 });
    expect(withinOne).toHaveLength(0);
  });

  it("excludes SUPERSEDED quotes", async () => {
    const customer = await createTestCustomer();
    const inquiry = await createInquiry(adminActor, {
      customerId: customer.id,
      requirementDescription: "x",
      material: "MS",
      thickness: 3,
      quantity: 1,
    });
    const original = await buildQuote(adminActor, {
      inquiryId: inquiry.id,
      deliveryBasisNotes: "10 days",
      lineItems: [{ process: "OTHER", description: "x", qty: 1, unit: "lot", ratePaise: 1000 }],
    });
    const { reviseQuote } = await import("../quote.js");
    await reviseQuote(adminActor, {
      previousQuoteId: original.id,
      deliveryBasisNotes: "12 days",
      lineItems: [{ process: "OTHER", description: "x", qty: 1, unit: "lot", ratePaise: 1200 }],
    });

    const rows = await quotesExpiringWithinDays({ withinDays: 30 });
    expect(rows.every((r) => r.quoteId !== original.id)).toBe(true);
  });
});
