// Registry backing search_records / get_record: which entities the agent
// may read, and what "related-record summary" each one includes on
// get_record (per the tool-layer spec in CLAUDE.md: "a Job returns its
// route, latest stage updates, payment status").
import { prisma } from "@fab-erp/core";
import type { Prisma } from "@prisma/client";

export const SEARCHABLE_ENTITIES = [
  "Customer",
  "Inquiry",
  "Drawing",
  "DrawingCharge",
  "FeasibilityCheck",
  "Quote",
  "CustomerPO",
  "Payment",
  "Job",
  "Approval",
  "ClientConfig",
] as const;
export type SearchableEntity = (typeof SEARCHABLE_ENTITIES)[number];

export function isSearchableEntity(value: string): value is SearchableEntity {
  return (SEARCHABLE_ENTITIES as readonly string[]).includes(value);
}

// ClientConfig is a singleton settings row, not a soft-deletable business
// record — it has no `deletedAt` column, unlike everything else here.
export function hasSoftDelete(entity: SearchableEntity): boolean {
  return entity !== "ClientConfig";
}

// Prisma delegate accessor, keyed by entity name.
export function delegateFor(entity: SearchableEntity) {
  const map: Record<SearchableEntity, unknown> = {
    Customer: prisma.customer,
    Inquiry: prisma.inquiry,
    Drawing: prisma.drawing,
    DrawingCharge: prisma.drawingCharge,
    FeasibilityCheck: prisma.feasibilityCheck,
    Quote: prisma.quote,
    CustomerPO: prisma.customerPO,
    Payment: prisma.payment,
    Job: prisma.job,
    Approval: prisma.approval,
    ClientConfig: prisma.clientConfig,
  };
  return map[entity] as {
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
    count: (args: Record<string, unknown>) => Promise<number>;
    findUnique: (args: Record<string, unknown>) => Promise<unknown>;
  };
}

// What get_record eagerly includes, so the agent doesn't need a follow-up
// search_records call for the record's obvious context.
export function relatedSummaryInclude(entity: SearchableEntity): Record<string, unknown> | undefined {
  switch (entity) {
    case "Inquiry":
      return { customer: true, drawings: true, feasibilityChecks: true, quotes: true };
    case "Drawing":
      return { inquiry: true, drawingCharges: true };
    case "DrawingCharge":
      return { inquiry: true, drawing: true };
    case "Quote":
      return { inquiry: { include: { customer: true } }, lineItems: true, customerPO: true };
    case "CustomerPO":
      return { quote: true, customer: true, payments: true, job: true };
    case "Payment":
      return { customerPO: true, job: true };
    case "Job":
      return {
        customer: true,
        inquiry: true,
        customerPO: { include: { payments: true } },
        processRoute: { include: { stages: { include: { stageUpdates: true } } } },
      };
    case "Approval":
      return { proposedBy: true, decidedBy: true };
    default:
      return undefined;
  }
}

export function defaultOrderBy(entity: SearchableEntity): Record<string, "asc" | "desc"> {
  return { createdAt: "desc" };
}

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 50;

export type PrismaFilterValue = Prisma.InputJsonValue;
