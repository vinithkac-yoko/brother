// Seeds: ClientConfig (sample INR rates from CUSTOMIZE.md), 3 customers,
// 2 vendors, materials (MS/SS sheets + tube sections), and 4 inquiries
// spanning different lifecycle stages, built through the real core
// services (not raw prisma.create) wherever a service exists — so the
// seeded data comes with a realistic AuditEvent trail, exactly like
// production writes would.
import { prisma } from "../src/lib/prisma.js";
import { createCustomer, addContact } from "../src/services/customer.js";
import { createInquiry } from "../src/services/inquiry.js";
import { attachDrawing, reviewDrawing } from "../src/services/drawing.js";
import { createFeasibilityCheck, completeFeasibilityCheck } from "../src/services/feasibility.js";
import { buildQuote } from "../src/services/quote.js";
import { recordCustomerPO } from "../src/services/customerPO.js";
import { recordPayment, confirmPayment } from "../src/services/payment.js";
import type { Actor } from "@fab-erp/shared";

const seedActor: Actor = { type: "USER", userId: "seed-script", role: "ADMIN" };

async function main() {
  console.log("Seeding ClientConfig...");
  await prisma.clientConfig.upsert({
    where: { slug: "default" },
    create: {
      slug: "default",
      clientName: "Stylique Fabricators (sample)",
      gstRatePct: 18,
      advancePct: 50,
      balancePct: 50,
      quoteValidityDays: 15,
      approvalThresholdPaise: 0,
      transportNote: "Transport extra as applicable",
      processRates: {
        RAW_MATERIAL_MS: { basis: "per kg", ratePaise: 6500, outsourced: false },
        RAW_MATERIAL_SS: { basis: "per kg", ratePaise: 21000, outsourced: false },
        SHEET_LASER_CUTTING: { basis: "per meter of cut path", ratePaise: 1200, outsourced: false },
        TUBE_LASER_CUTTING: { basis: "per meter of cut path", ratePaise: 1800, outsourced: true },
        BENDING: { basis: "per bend", ratePaise: 1500, outsourced: false },
        MIG_WELDING: { basis: "per joint", ratePaise: 2500, outsourced: false },
        BANDSAW_CUTTING: { basis: "per cut", ratePaise: 2000, outsourced: false },
        LASER_WELDING: { basis: "per meter", ratePaise: 3000, outsourced: false },
        GRINDING: { basis: "per piece", ratePaise: 1000, outsourced: false },
        POWDER_COATING: { basis: "per sq. meter", ratePaise: 18000, outsourced: false },
        PACKING: { basis: "per job (flat)", ratePaise: 50000, outsourced: false },
      },
    },
    update: {},
  });

  console.log("Seeding vendors...");
  const [tubeLaserVendor, materialVendor] = await Promise.all([
    prisma.vendor.create({
      data: {
        name: "Precision Tube Lasers Pvt Ltd",
        contactPhone: "9820011223",
        contactEmail: "orders@precisiontubelasers.example",
        processesOffered: ["TUBE_LASER_CUTTING"],
      },
    }),
    prisma.vendor.create({
      data: {
        name: "Bharat Steel Traders",
        contactPhone: "9820033445",
        contactEmail: "sales@bharatsteel.example",
        processesOffered: ["RAW_MATERIAL"],
      },
    }),
  ]);
  console.log(`  ${tubeLaserVendor.name}, ${materialVendor.name}`);

  console.log("Seeding materials + stock...");
  const materials = await Promise.all(
    [
      { name: "MS Sheet 2mm", type: "MS", thickness: 2, unit: "KG" as const, sku: "MS-SHEET-2MM" },
      { name: "MS Sheet 3mm", type: "MS", thickness: 3, unit: "KG" as const, sku: "MS-SHEET-3MM" },
      { name: "MS Sheet 4mm", type: "MS", thickness: 4, unit: "KG" as const, sku: "MS-SHEET-4MM" },
      { name: "SS Sheet 1.5mm", type: "SS", thickness: 1.5, unit: "KG" as const, sku: "SS-SHEET-1.5MM" },
      { name: "SS Sheet 2mm", type: "SS", thickness: 2, unit: "KG" as const, sku: "SS-SHEET-2MM" },
      { name: "MS Round Tube 25mm", type: "MS_TUBE", thickness: 2, unit: "METER" as const, sku: "MS-TUBE-RD-25MM" },
      { name: "MS Square Tube 20x20mm", type: "MS_TUBE", thickness: 2, unit: "METER" as const, sku: "MS-TUBE-SQ-20MM" },
    ].map((m) =>
      prisma.material.create({
        data: { ...m, stockLevels: { create: { quantity: 500, unit: m.unit, location: "Main store" } } },
      }),
    ),
  );
  console.log(`  ${materials.length} materials`);

  console.log("Seeding customers...");
  const sharada = await createCustomer(seedActor, {
    name: "Sharada Engineering",
    gstin: "27AASFS1234C1Z5",
    billingAddress: "Plot 14, MIDC Bhosari, Pune, MH 411026",
  });
  await addContact(seedActor, { customerId: sharada.id, name: "Ramesh Kulkarni", phone: "9822011111", isPrimary: true });

  const veena = await createCustomer(seedActor, {
    name: "Veena Fabtech",
    gstin: "27AAVFV5678D1Z2",
    billingAddress: "Gala 7, Waliv Industrial Estate, Vasai, MH 401208",
  });
  await addContact(seedActor, { customerId: veena.id, name: "Suresh Patil", phone: "9822022222", isPrimary: true });

  const orion = await createCustomer(seedActor, {
    name: "Orion Metal Works",
    billingAddress: "Unit 3, Peenya Industrial Area, Bengaluru, KA 560058",
  });
  await addContact(seedActor, { customerId: orion.id, name: "Divya Rao", phone: "9822033333", isPrimary: true });

  // --- INQ-0001: NEW — fresh lead, no drawing yet ---
  const inq1 = await createInquiry(seedActor, {
    customerId: sharada.id,
    contactId: undefined,
    requirementDescription: "200 pcs mounting bracket, MS 3mm, DXF to follow",
    material: "MS",
    thickness: 3,
    quantity: 200,
    expectedDeliveryDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    notes: "Customer called in, drawing to be emailed separately",
  });

  // --- INQ-0002: FEASIBILITY — drawing attached + reviewed, check open ---
  const inq2 = await createInquiry(seedActor, {
    customerId: veena.id,
    requirementDescription: "50 pcs enclosure panel, SS 2mm, powder coated",
    material: "SS",
    thickness: 2,
    quantity: 50,
    expectedDeliveryDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
  });
  const inq2Drawing = await attachDrawing(seedActor, {
    inquiryId: inq2.id,
    fileRef: "s3://drawings/veena-enclosure-panel-v1.dxf",
    fileType: "DXF",
    source: "CUSTOMER_SUPPLIED",
  });
  await reviewDrawing(seedActor, {
    drawingId: inq2Drawing.id,
    reviewNotes: "Bend angles clear; tolerance spec not marked",
    flags: ["missing powder coat color", "missing tolerance spec"],
    reviewedBy: "Kasi",
  });
  await createFeasibilityCheck(seedActor, {
    inquiryId: inq2.id,
    checklist: {
      drawingAvailable: true,
      machineCompatible: true,
      tubeLaserOutsourcingRequired: false,
      tolerancesSpecified: false,
      powderCoatColorSpecified: false,
      notes: "Waiting on customer for powder coat color before quoting",
    },
  });

  // --- INQ-0003: QUOTED — feasibility complete, quote sent, expiring soon ---
  const inq3 = await createInquiry(seedActor, {
    customerId: orion.id,
    requirementDescription: "20 pcs frame assembly, MS 4mm + MS round tube 25mm",
    material: "MS",
    thickness: 4,
    quantity: 20,
    expectedDeliveryDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
  });
  const inq3Drawing = await attachDrawing(seedActor, {
    inquiryId: inq3.id,
    fileRef: "s3://drawings/orion-frame-assembly-v1.sldprt",
    fileType: "SOLIDWORKS",
    source: "CUSTOMER_SUPPLIED",
  });
  await reviewDrawing(seedActor, {
    drawingId: inq3Drawing.id,
    reviewNotes: "Weld joints and tube sections clearly marked",
    flags: [],
    reviewedBy: "Kasi",
  });
  const inq3Feasibility = await createFeasibilityCheck(seedActor, {
    inquiryId: inq3.id,
    checklist: {
      drawingAvailable: true,
      machineCompatible: true,
      tubeLaserOutsourcingRequired: true,
      tolerancesSpecified: true,
      powderCoatColorSpecified: true,
    },
  });
  await completeFeasibilityCheck(seedActor, {
    feasibilityCheckId: inq3Feasibility.id,
    riskLevel: "MEDIUM",
    estProductionDays: 12,
    missingInfo: [],
    outsourcingNeeded: true,
    outsourcingNotes: "Tube laser cutting via Precision Tube Lasers Pvt Ltd",
    completedBy: "Kasi",
  });
  const inq3Quote = await buildQuote(seedActor, {
    inquiryId: inq3.id,
    deliveryBasisNotes: "12 working days from advance payment + drawing approval",
    lineItems: [
      { process: "RAW_MATERIAL", description: "MS Sheet 4mm", qty: 85, unit: "kg", ratePaise: 6500 },
      { process: "SHEET_LASER_CUTTING", description: "Sheet laser cutting", qty: 40, unit: "meter", ratePaise: 1200 },
      { process: "TUBE_LASER_CUTTING", description: "Tube laser cutting (outsourced)", qty: 22, unit: "meter", ratePaise: 1800 },
      { process: "BENDING", description: "Bending", qty: 30, unit: "bend", ratePaise: 1500 },
      { process: "MIG_WELDING", description: "MIG welding", qty: 60, unit: "joint", ratePaise: 2500 },
      { process: "GRINDING", description: "Grinding & finishing", qty: 20, unit: "piece", ratePaise: 1000 },
      { process: "PACKING", description: "Packing", qty: 1, unit: "lot", ratePaise: 50000 },
    ],
    preparedBy: "Kasi",
  });
  await prisma.quote.update({
    where: { id: inq3Quote.id },
    data: {
      status: "SENT",
      // Force this one to expire soon so the quotes-expiring report has
      // something to show out of the box.
      validUntil: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    },
  });

  // --- INQ-0004: WON, Job PRODUCTION_ELIGIBLE — full flow through advance ---
  const inq4 = await createInquiry(seedActor, {
    customerId: sharada.id,
    requirementDescription: "500 pcs bracket, MS 2mm, powder coated RAL 9005",
    material: "MS",
    thickness: 2,
    quantity: 500,
    expectedDeliveryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
  });
  const inq4Drawing = await attachDrawing(seedActor, {
    inquiryId: inq4.id,
    fileRef: "s3://drawings/sharada-bracket-500-v1.dxf",
    fileType: "DXF",
    source: "CUSTOMER_SUPPLIED",
  });
  await reviewDrawing(seedActor, {
    drawingId: inq4Drawing.id,
    reviewNotes: "Straightforward bracket, no ambiguity",
    flags: [],
    reviewedBy: "Kasi",
  });
  const inq4Feasibility = await createFeasibilityCheck(seedActor, {
    inquiryId: inq4.id,
    checklist: {
      drawingAvailable: true,
      machineCompatible: true,
      tubeLaserOutsourcingRequired: false,
      tolerancesSpecified: true,
      powderCoatColorSpecified: true,
    },
  });
  await completeFeasibilityCheck(seedActor, {
    feasibilityCheckId: inq4Feasibility.id,
    riskLevel: "LOW",
    estProductionDays: 8,
    completedBy: "Kasi",
  });
  const inq4Quote = await buildQuote(seedActor, {
    inquiryId: inq4.id,
    deliveryBasisNotes: "8 working days from advance payment + drawing approval",
    lineItems: [
      { process: "RAW_MATERIAL", description: "MS Sheet 2mm", qty: 150, unit: "kg", ratePaise: 6500 },
      { process: "SHEET_LASER_CUTTING", description: "Sheet laser cutting", qty: 90, unit: "meter", ratePaise: 1200 },
      { process: "BENDING", description: "Bending", qty: 500, unit: "bend", ratePaise: 1500 },
      { process: "POWDER_COATING", description: "Powder coating RAL 9005", qty: 12, unit: "sqm", ratePaise: 18000 },
      { process: "PACKING", description: "Packing", qty: 1, unit: "lot", ratePaise: 50000 },
    ],
    preparedBy: "Kasi",
  });
  const { customerPO: inq4PO, job: inq4Job } = await recordCustomerPO(seedActor, {
    quoteId: inq4Quote.id,
    poNumber: "SHARADA-PO-2201",
    poDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    partName: "Mounting bracket",
  });
  await prisma.job.update({
    where: { id: inq4Job.id },
    data: { powderCoatColor: "RAL 9005 (Jet Black)", powderCoatColorConfirmed: true },
  });
  const inq4Advance = await recordPayment(seedActor, {
    customerPOId: inq4PO.id,
    type: "ADVANCE",
    amountPaise: Math.round(inq4Quote.totalPaise / 2),
    method: "Bank Transfer",
    referenceNumber: "UTR2201456789",
  });
  await confirmPayment(seedActor, { paymentId: inq4Advance.id, confirmedBy: "Kasi" });

  console.log("Seed complete:");
  console.log(`  ${inq1.inquiryNumber} — NEW`);
  console.log(`  ${inq2.inquiryNumber} — FEASIBILITY (missing powder coat color)`);
  console.log(`  ${inq3.inquiryNumber} — QUOTED (quote expiring within 4 days)`);
  console.log(`  ${inq4.inquiryNumber} — WON, Job PRODUCTION_ELIGIBLE (advance confirmed)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
