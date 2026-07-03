import { beforeEach, describe, expect, it } from "vitest";
import { truncateAllTables } from "../../lib/testHelpers";
import { prisma } from "../../lib/prisma";
import { completeFeasibilityCheck, createFeasibilityCheck } from "../feasibility";
import { createInquiry } from "../inquiry";
import { BusinessRuleError } from "../../lib/errors";
import { adminActor, createTestCustomer } from "./factories";

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

describe("createFeasibilityCheck", () => {
  it("moves the inquiry to FEASIBILITY status", async () => {
    const inquiry = await setupInquiry();
    await createFeasibilityCheck(adminActor, {
      inquiryId: inquiry.id,
      checklist: {
        drawingAvailable: true,
        machineCompatible: true,
        tubeLaserOutsourcingRequired: false,
        tolerancesSpecified: true,
        powderCoatColorSpecified: false,
      },
    });
    const after = await prisma.inquiry.findUniqueOrThrow({ where: { id: inquiry.id } });
    expect(after.status).toBe("FEASIBILITY");
  });
});

describe("completeFeasibilityCheck", () => {
  it("sets risk level, est. days, and completion metadata", async () => {
    const inquiry = await setupInquiry();
    const check = await createFeasibilityCheck(adminActor, {
      inquiryId: inquiry.id,
      checklist: {
        drawingAvailable: true,
        machineCompatible: true,
        tubeLaserOutsourcingRequired: true,
        tolerancesSpecified: false,
        powderCoatColorSpecified: false,
      },
    });

    const completed = await completeFeasibilityCheck(adminActor, {
      feasibilityCheckId: check.id,
      riskLevel: "MEDIUM",
      estProductionDays: 10,
      missingInfo: ["powder coat color", "tolerance spec"],
      outsourcingNeeded: true,
      outsourcingNotes: "Tube laser cutting via vendor",
      completedBy: "Kasi",
    });

    expect(completed.isComplete).toBe(true);
    expect(completed.riskLevel).toBe("MEDIUM");
    expect(completed.missingInfo).toEqual(["powder coat color", "tolerance spec"]);
    expect(completed.completedAt).not.toBeNull();
  });

  it("refuses to complete an already-complete check", async () => {
    const inquiry = await setupInquiry();
    const check = await createFeasibilityCheck(adminActor, {
      inquiryId: inquiry.id,
      checklist: {
        drawingAvailable: true,
        machineCompatible: true,
        tubeLaserOutsourcingRequired: false,
        tolerancesSpecified: true,
        powderCoatColorSpecified: true,
      },
    });
    await completeFeasibilityCheck(adminActor, {
      feasibilityCheckId: check.id,
      riskLevel: "LOW",
      estProductionDays: 5,
      completedBy: "Kasi",
    });

    await expect(
      completeFeasibilityCheck(adminActor, {
        feasibilityCheckId: check.id,
        riskLevel: "LOW",
        estProductionDays: 5,
        completedBy: "Kasi",
      }),
    ).rejects.toThrow(BusinessRuleError);
  });
});
