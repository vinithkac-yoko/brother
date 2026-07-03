-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ENGINEER', 'SUPERVISOR');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'AGENT');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'REVIEWING', 'FEASIBILITY', 'QUOTED', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "LostReason" AS ENUM ('PRICE', 'LEAD_TIME', 'CAPABILITY_MISMATCH', 'CUSTOMER_CANCELLED', 'NO_RESPONSE', 'OTHER');

-- CreateEnum
CREATE TYPE "DrawingFileType" AS ENUM ('DXF', 'SOLIDWORKS', 'PDF', 'CYPCUT');

-- CreateEnum
CREATE TYPE "DrawingSource" AS ENUM ('CUSTOMER_SUPPLIED', 'SHOP_DRAWN');

-- CreateEnum
CREATE TYPE "DrawingChargeStatus" AS ENUM ('PENDING', 'INVOICED', 'PAID', 'WAIVED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "QuoteProcess" AS ENUM ('RAW_MATERIAL', 'SHEET_LASER_CUTTING', 'TUBE_LASER_CUTTING', 'BENDING', 'MIG_WELDING', 'BANDSAW_CUTTING', 'LASER_WELDING', 'GRINDING', 'POWDER_COATING', 'PACKING', 'TRANSPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'SUPERSEDED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('ADVANCE', 'FINAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('CREATED', 'AWAITING_ADVANCE', 'PRODUCTION_ELIGIBLE', 'IN_PRODUCTION', 'DISPATCHED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RouteStageType" AS ENUM ('SHEET_LASER_CUTTING', 'TUBE_LASER_OUTSOURCING', 'BENDING', 'FABRICATION', 'MIG_WELDING', 'BANDSAW_CUTTING', 'LASER_WELDING', 'GRINDING', 'POWDER_COATING', 'PACKING', 'DISPATCH');

-- CreateEnum
CREATE TYPE "StageStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('KG', 'PIECE', 'METER', 'SQM', 'SET');

-- CreateEnum
CREATE TYPE "PurchaseRequestStatus" AS ENUM ('OPEN', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VendorPOStatus" AS ENUM ('DRAFT', 'SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MessageDraftKind" AS ENUM ('ADVANCE_FOLLOWUP', 'QUOTE_COVER', 'DISPATCH_CONFIRMATION');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('WHATSAPP', 'EMAIL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientConfig" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL DEFAULT 'default',
    "clientName" TEXT NOT NULL,
    "gstRatePct" DECIMAL(5,2) NOT NULL DEFAULT 18.00,
    "advancePct" INTEGER NOT NULL DEFAULT 50,
    "balancePct" INTEGER NOT NULL DEFAULT 50,
    "quoteValidityDays" INTEGER NOT NULL DEFAULT 15,
    "approvalThresholdPaise" INTEGER NOT NULL DEFAULT 0,
    "transportNote" TEXT NOT NULL DEFAULT 'Transport extra as applicable',
    "processRates" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gstin" TEXT,
    "billingAddress" TEXT,
    "shippingAddress" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "designation" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "inquiryNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "contactId" TEXT,
    "requirementDescription" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "thickness" DECIMAL(8,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "expectedDeliveryDate" TIMESTAMP(3),
    "notes" TEXT,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "lostReason" "LostReason",
    "lostReasonNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Drawing" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "fileRef" TEXT NOT NULL,
    "fileType" "DrawingFileType" NOT NULL,
    "source" "DrawingSource" NOT NULL DEFAULT 'CUSTOMER_SUPPLIED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "reviewNotes" TEXT,
    "flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Drawing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawingCharge" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "drawingId" TEXT,
    "amountPaise" INTEGER NOT NULL,
    "status" "DrawingChargeStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "decidedBy" TEXT,
    "invoicedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DrawingCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeasibilityCheck" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "checklist" JSONB NOT NULL,
    "riskLevel" "RiskLevel",
    "estProductionDays" INTEGER,
    "missingInfo" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "outsourcingNeeded" BOOLEAN NOT NULL DEFAULT false,
    "outsourcingNotes" TEXT,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "completedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FeasibilityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotalPaise" INTEGER NOT NULL,
    "gstRatePct" DECIMAL(5,2) NOT NULL,
    "gstAmountPaise" INTEGER NOT NULL,
    "totalPaise" INTEGER NOT NULL,
    "validityDays" INTEGER NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "paymentTermsSnapshot" JSONB NOT NULL,
    "deliveryBasisNotes" TEXT NOT NULL,
    "transportNote" TEXT NOT NULL,
    "preparedBy" TEXT,
    "supersedesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteLineItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "process" "QuoteProcess" NOT NULL,
    "description" TEXT NOT NULL,
    "qty" DECIMAL(12,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "ratePaise" INTEGER NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerPO" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "poFileRef" TEXT,
    "poDate" TIMESTAMP(3) NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CustomerPO_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "customerPOId" TEXT NOT NULL,
    "jobId" TEXT,
    "type" "PaymentType" NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT,
    "referenceNumber" TEXT,
    "confirmedBy" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "jobNumber" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "customerPOId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "partName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "material" TEXT NOT NULL,
    "thickness" DECIMAL(8,2) NOT NULL,
    "drawingRef" TEXT NOT NULL,
    "deliveryDate" TIMESTAMP(3),
    "status" "JobStatus" NOT NULL DEFAULT 'CREATED',
    "powderCoatColor" TEXT,
    "powderCoatColorConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "specialNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessRoute" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProcessRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteStage" (
    "id" TEXT NOT NULL,
    "processRouteId" TEXT NOT NULL,
    "stage" "RouteStageType" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" "StageStatus" NOT NULL DEFAULT 'PENDING',
    "qualityCheckpoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RouteStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageUpdate" (
    "id" TEXT NOT NULL,
    "routeStageId" TEXT NOT NULL,
    "completedQty" INTEGER NOT NULL,
    "pendingQty" INTEGER NOT NULL,
    "remarks" TEXT,
    "updatedByName" TEXT NOT NULL,
    "updatedByRole" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "StageUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "thickness" DECIMAL(8,2),
    "unit" "Unit" NOT NULL,
    "sku" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLevel" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" "Unit" NOT NULL,
    "location" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "jobId" TEXT,
    "requiredQty" DECIMAL(12,3) NOT NULL,
    "shortageQty" DECIMAL(12,3) NOT NULL,
    "status" "PurchaseRequestStatus" NOT NULL DEFAULT 'OPEN',
    "requestedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "processesOffered" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorPO" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "purchaseRequestId" TEXT,
    "materialId" TEXT,
    "process" "QuoteProcess",
    "qty" DECIMAL(12,3) NOT NULL,
    "ratePaise" INTEGER,
    "amountPaise" INTEGER,
    "status" "VendorPOStatus" NOT NULL DEFAULT 'DRAFT',
    "expectedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VendorPO_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceipt" (
    "id" TEXT NOT NULL,
    "vendorPOId" TEXT NOT NULL,
    "receivedQty" DECIMAL(12,3) NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL,
    "receivedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispatch" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "packingCompleteCheck" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT,
    "dispatchDate" TIMESTAMP(3),
    "messageDraftId" TEXT,
    "dispatchedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Dispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "conversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "proposedAction" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "proposedById" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "thresholdReason" TEXT,
    "conversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageDraft" (
    "id" TEXT NOT NULL,
    "kind" "MessageDraftKind" NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "relatedEntity" TEXT NOT NULL,
    "relatedEntityId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ClientConfig_slug_key" ON "ClientConfig"("slug");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "Contact_customerId_idx" ON "Contact"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Inquiry_inquiryNumber_key" ON "Inquiry"("inquiryNumber");

-- CreateIndex
CREATE INDEX "Inquiry_customerId_idx" ON "Inquiry"("customerId");

-- CreateIndex
CREATE INDEX "Inquiry_status_idx" ON "Inquiry"("status");

-- CreateIndex
CREATE INDEX "Drawing_inquiryId_idx" ON "Drawing"("inquiryId");

-- CreateIndex
CREATE INDEX "DrawingCharge_inquiryId_idx" ON "DrawingCharge"("inquiryId");

-- CreateIndex
CREATE INDEX "DrawingCharge_drawingId_idx" ON "DrawingCharge"("drawingId");

-- CreateIndex
CREATE INDEX "DrawingCharge_status_idx" ON "DrawingCharge"("status");

-- CreateIndex
CREATE INDEX "FeasibilityCheck_inquiryId_idx" ON "FeasibilityCheck"("inquiryId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_supersedesId_key" ON "Quote"("supersedesId");

-- CreateIndex
CREATE INDEX "Quote_inquiryId_idx" ON "Quote"("inquiryId");

-- CreateIndex
CREATE INDEX "Quote_status_idx" ON "Quote"("status");

-- CreateIndex
CREATE INDEX "QuoteLineItem_quoteId_idx" ON "QuoteLineItem"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPO_poNumber_key" ON "CustomerPO"("poNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPO_quoteId_key" ON "CustomerPO"("quoteId");

-- CreateIndex
CREATE INDEX "CustomerPO_customerId_idx" ON "CustomerPO"("customerId");

-- CreateIndex
CREATE INDEX "Payment_customerPOId_idx" ON "Payment"("customerPOId");

-- CreateIndex
CREATE INDEX "Payment_jobId_idx" ON "Payment"("jobId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Job_jobNumber_key" ON "Job"("jobNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Job_inquiryId_key" ON "Job"("inquiryId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_customerPOId_key" ON "Job"("customerPOId");

-- CreateIndex
CREATE INDEX "Job_customerId_idx" ON "Job"("customerId");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessRoute_jobId_key" ON "ProcessRoute"("jobId");

-- CreateIndex
CREATE INDEX "RouteStage_processRouteId_idx" ON "RouteStage"("processRouteId");

-- CreateIndex
CREATE UNIQUE INDEX "RouteStage_processRouteId_sequence_key" ON "RouteStage"("processRouteId", "sequence");

-- CreateIndex
CREATE INDEX "StageUpdate_routeStageId_idx" ON "StageUpdate"("routeStageId");

-- CreateIndex
CREATE UNIQUE INDEX "Material_sku_key" ON "Material"("sku");

-- CreateIndex
CREATE INDEX "Material_type_idx" ON "Material"("type");

-- CreateIndex
CREATE INDEX "StockLevel_materialId_idx" ON "StockLevel"("materialId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_materialId_idx" ON "PurchaseRequest"("materialId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_jobId_idx" ON "PurchaseRequest"("jobId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_status_idx" ON "PurchaseRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VendorPO_poNumber_key" ON "VendorPO"("poNumber");

-- CreateIndex
CREATE INDEX "VendorPO_vendorId_idx" ON "VendorPO"("vendorId");

-- CreateIndex
CREATE INDEX "VendorPO_status_idx" ON "VendorPO"("status");

-- CreateIndex
CREATE INDEX "GoodsReceipt_vendorPOId_idx" ON "GoodsReceipt"("vendorPOId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispatch_jobId_key" ON "Dispatch"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispatch_messageDraftId_key" ON "Dispatch"("messageDraftId");

-- CreateIndex
CREATE INDEX "AuditEvent_entity_entityId_idx" ON "AuditEvent"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditEvent_conversationId_idx" ON "AuditEvent"("conversationId");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Approval_status_idx" ON "Approval"("status");

-- CreateIndex
CREATE INDEX "Approval_conversationId_idx" ON "Approval"("conversationId");

-- CreateIndex
CREATE INDEX "MessageDraft_relatedEntity_relatedEntityId_idx" ON "MessageDraft"("relatedEntity", "relatedEntityId");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drawing" ADD CONSTRAINT "Drawing_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingCharge" ADD CONSTRAINT "DrawingCharge_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingCharge" ADD CONSTRAINT "DrawingCharge_drawingId_fkey" FOREIGN KEY ("drawingId") REFERENCES "Drawing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeasibilityCheck" ADD CONSTRAINT "FeasibilityCheck_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLineItem" ADD CONSTRAINT "QuoteLineItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPO" ADD CONSTRAINT "CustomerPO_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPO" ADD CONSTRAINT "CustomerPO_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerPOId_fkey" FOREIGN KEY ("customerPOId") REFERENCES "CustomerPO"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_customerPOId_fkey" FOREIGN KEY ("customerPOId") REFERENCES "CustomerPO"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessRoute" ADD CONSTRAINT "ProcessRoute_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStage" ADD CONSTRAINT "RouteStage_processRouteId_fkey" FOREIGN KEY ("processRouteId") REFERENCES "ProcessRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageUpdate" ADD CONSTRAINT "StageUpdate_routeStageId_fkey" FOREIGN KEY ("routeStageId") REFERENCES "RouteStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPO" ADD CONSTRAINT "VendorPO_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPO" ADD CONSTRAINT "VendorPO_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "PurchaseRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPO" ADD CONSTRAINT "VendorPO_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_vendorPOId_fkey" FOREIGN KEY ("vendorPOId") REFERENCES "VendorPO"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_messageDraftId_fkey" FOREIGN KEY ("messageDraftId") REFERENCES "MessageDraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
