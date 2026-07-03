import { beforeEach, describe, expect, it } from "vitest";
import { truncateAllTables } from "../../lib/testHelpers";
import { createInquiry, markInquiryLost, updateInquiry } from "../inquiry";
import { BusinessRuleError, NotFoundError } from "../../lib/errors";
import { adminActor, createTestCustomer } from "./factories";

beforeEach(async () => {
  await truncateAllTables();
});

describe("createInquiry", () => {
  it("generates a sequential inquiry number and starts at status NEW", async () => {
    const customer = await createTestCustomer();
    const inquiry = await createInquiry(adminActor, {
      customerId: customer.id,
      requirementDescription: "200 pcs bracket, MS 3mm, DXF attached",
      material: "MS",
      thickness: 3,
      quantity: 200,
    });
    expect(inquiry.inquiryNumber).toBe("INQ-0001");
    expect(inquiry.status).toBe("NEW");
  });

  it("increments the sequence across inquiries", async () => {
    const customer = await createTestCustomer();
    const first = await createInquiry(adminActor, {
      customerId: customer.id,
      requirementDescription: "First",
      material: "MS",
      thickness: 3,
      quantity: 10,
    });
    const second = await createInquiry(adminActor, {
      customerId: customer.id,
      requirementDescription: "Second",
      material: "SS",
      thickness: 2,
      quantity: 5,
    });
    expect(first.inquiryNumber).toBe("INQ-0001");
    expect(second.inquiryNumber).toBe("INQ-0002");
  });

  it("throws NotFoundError for a nonexistent customer", async () => {
    await expect(
      createInquiry(adminActor, {
        customerId: "nonexistent",
        requirementDescription: "x",
        material: "MS",
        thickness: 3,
        quantity: 1,
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("markInquiryLost", () => {
  it("requires lostReasonNotes for OTHER (enforced by the shared zod schema)", async () => {
    const customer = await createTestCustomer();
    const inquiry = await createInquiry(adminActor, {
      customerId: customer.id,
      requirementDescription: "x",
      material: "MS",
      thickness: 3,
      quantity: 1,
    });
    await expect(
      markInquiryLost(adminActor, { inquiryId: inquiry.id, lostReason: "OTHER" }),
    ).rejects.toThrow();
  });

  it("sets status LOST with the given reason", async () => {
    const customer = await createTestCustomer();
    const inquiry = await createInquiry(adminActor, {
      customerId: customer.id,
      requirementDescription: "x",
      material: "MS",
      thickness: 3,
      quantity: 1,
    });
    const lost = await markInquiryLost(adminActor, {
      inquiryId: inquiry.id,
      lostReason: "PRICE",
    });
    expect(lost.status).toBe("LOST");
    expect(lost.lostReason).toBe("PRICE");
  });

  it("refuses to re-mark an already-lost inquiry", async () => {
    const customer = await createTestCustomer();
    const inquiry = await createInquiry(adminActor, {
      customerId: customer.id,
      requirementDescription: "x",
      material: "MS",
      thickness: 3,
      quantity: 1,
    });
    await markInquiryLost(adminActor, { inquiryId: inquiry.id, lostReason: "PRICE" });
    await expect(
      markInquiryLost(adminActor, { inquiryId: inquiry.id, lostReason: "NO_RESPONSE" }),
    ).rejects.toThrow(BusinessRuleError);
  });
});

describe("updateInquiry", () => {
  it("refuses to edit a WON or LOST inquiry", async () => {
    const customer = await createTestCustomer();
    const inquiry = await createInquiry(adminActor, {
      customerId: customer.id,
      requirementDescription: "x",
      material: "MS",
      thickness: 3,
      quantity: 1,
    });
    await markInquiryLost(adminActor, { inquiryId: inquiry.id, lostReason: "PRICE" });
    await expect(
      updateInquiry(adminActor, { inquiryId: inquiry.id, notes: "trying to edit" }),
    ).rejects.toThrow(BusinessRuleError);
  });
});
