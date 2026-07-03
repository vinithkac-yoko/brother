// Layer 2: the 6 tools, and only these 6 — see CLAUDE.md "do not add a 7th
// without a strong reason." Each is built with the SDK's `tool()` helper
// and bundled into one in-process MCP server (createErpToolServer) that
// packages/agent registers per session.
import { z } from "zod";
import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import {
  prisma,
  NotFoundError,
  BusinessRuleError,
  PermissionError,
  createMessageDraft,
  openInquiriesPipeline,
  quotesExpiringWithinDays,
} from "@fab-erp/core";
import { messageChannelSchema, messageDraftKindSchema, type Actor } from "@fab-erp/shared";
import {
  SEARCHABLE_ENTITIES,
  PAGE_SIZE_DEFAULT,
  PAGE_SIZE_MAX,
  delegateFor,
  isSearchableEntity,
  relatedSummaryInclude,
} from "./entities";
import { ACTIONS, isKnownAction } from "./actions";
import { jsonResult, errorResult } from "./toolResult";

// Reshapes a core service result into one of the fixed 6 artifact types
// when there's an obvious mapping, so the UI can render it richly instead
// of a generic JSON dump. Not every entity has one — that's fine, the
// fallback is still useful raw data.
function shapeArtifact(entity: string, result: unknown): Record<string, unknown> {
  const r = result as Record<string, unknown>;
  if (entity === "Quote" && r && typeof r === "object" && "lineItems" in r) {
    const lineItems = (r.lineItems as Array<Record<string, unknown>>).map((li) => ({
      process: li.process,
      description: li.description,
      qty: Number(li.qty),
      unit: li.unit,
      ratePaise: li.ratePaise,
      amountPaise: li.amountPaise,
    }));
    return {
      type: "quote_card",
      quoteId: r.id,
      quoteNumber: r.quoteNumber,
      version: r.version,
      status: r.status,
      lineItems,
      subtotalPaise: r.subtotalPaise,
      gstRatePct: Number(r.gstRatePct),
      gstAmountPaise: r.gstAmountPaise,
      totalPaise: r.totalPaise,
      validUntil: r.validUntil,
      paymentTermsSnapshot: r.paymentTermsSnapshot,
      deliveryBasisNotes: r.deliveryBasisNotes,
      transportNote: r.transportNote,
    };
  }
  if (entity === "FeasibilityCheck") {
    return {
      type: "feasibility_checklist",
      feasibilityCheckId: r.id,
      inquiryId: r.inquiryId,
      checklist: r.checklist,
      riskLevel: r.riskLevel ?? null,
      estProductionDays: r.estProductionDays ?? null,
      missingInfo: r.missingInfo ?? [],
      outsourcingNeeded: r.outsourcingNeeded ?? false,
      isComplete: r.isComplete ?? false,
    };
  }
  if (entity === "Payment" && r && typeof r === "object" && "job" in r && r.job) {
    const job = r.job as Record<string, unknown>;
    return {
      type: "job_card",
      jobId: job.id,
      jobNumber: job.jobNumber,
      status: job.status,
      powderCoatColor: job.powderCoatColor ?? null,
      powderCoatColorConfirmed: job.powderCoatColorConfirmed ?? false,
      advancePaymentConfirmed: job.status !== "AWAITING_ADVANCE" && job.status !== "CREATED",
      payment: r.payment,
    };
  }
  return { type: null, entity, raw: result };
}

function describeError(err: unknown): string {
  if (err instanceof NotFoundError || err instanceof BusinessRuleError || err instanceof PermissionError) {
    return err.message;
  }
  if (err instanceof z.ZodError) {
    return `Invalid input: ${err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`;
  }
  return err instanceof Error ? err.message : String(err);
}

// Split out from createErpToolServer so tests can call tool handlers
// directly without spinning up a real MCP transport.
export function buildErpTools(actor: Actor) {
  const searchRecords = tool(
    "search_records",
    `Search a Phase 1 entity with filters + pagination. Entities: ${SEARCHABLE_ENTITIES.join(", ")}.
Use when: you need a list of records (e.g. "open inquiries for customer X", "quotes for INQ-0003").
Do NOT use when: you already have the record's id — use get_record instead (cheaper, richer output).
Example: { entity: "Inquiry", filters: { status: "NEW" }, page: 1, pageSize: 20 }`,
    {
      entity: z.string().describe(`One of: ${SEARCHABLE_ENTITIES.join(", ")}`),
      filters: z.record(z.string(), z.unknown()).optional().describe("Prisma-style equality filters, e.g. { status: 'NEW', customerId: '...' }"),
      page: z.number().int().positive().default(1),
      pageSize: z.number().int().positive().max(PAGE_SIZE_MAX).default(PAGE_SIZE_DEFAULT),
    },
    async ({ entity, filters, page, pageSize }) => {
      if (!isSearchableEntity(entity)) {
        return errorResult(`entity "${entity}" is not searchable; use one of: ${SEARCHABLE_ENTITIES.join(", ")}`);
      }
      const delegate = delegateFor(entity);
      const where = { deletedAt: null, ...(filters ?? {}) };
      const [total, rows] = await Promise.all([
        delegate.count({ where }),
        delegate.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);
      return jsonResult({ entity, page, pageSize, total, rows });
    },
  );

  const getRecord = tool(
    "get_record",
    `Fetch one record by id, entity: ${SEARCHABLE_ENTITIES.join(", ")}. Includes a related-record
summary (e.g. a Job includes its route/stages, payment status; an Inquiry includes its
drawings/feasibility/quotes) so you rarely need a follow-up search_records call.
Use when: you have an id (from search_records, a prior tool result, or the user).
Do NOT use for lists — use search_records.`,
    {
      entity: z.string().describe(`One of: ${SEARCHABLE_ENTITIES.join(", ")}`),
      id: z.string().min(1),
    },
    async ({ entity, id }) => {
      if (!isSearchableEntity(entity)) {
        return errorResult(`entity "${entity}" is not searchable; use one of: ${SEARCHABLE_ENTITIES.join(", ")}`);
      }
      const delegate = delegateFor(entity);
      const record = await delegate.findUnique({ where: { id }, include: relatedSummaryInclude(entity) });
      if (!record) {
        return errorResult(`${entity} not found: ${id}; use search_records entity=${entity} to find the right id`);
      }
      return jsonResult(record);
    },
  );

  const runReport = tool(
    "run_report",
    `Run a named Phase 1 report. Reports: "open_inquiries_pipeline" (everything not yet WON/LOST;
optional param customerId), "quotes_expiring" (active quotes expiring soon; param withinDays,
default 7).
Use when: the user asks for a pipeline/status overview rather than a single record.
Do NOT use search_records to hand-roll these — the report already applies the right filters.`,
    {
      report: z.enum(["open_inquiries_pipeline", "quotes_expiring"]),
      params: z.record(z.string(), z.unknown()).optional(),
    },
    async ({ report, params }) => {
      if (report === "open_inquiries_pipeline") {
        const rows = await openInquiriesPipeline((params ?? {}) as never);
        return jsonResult({ report, rows });
      }
      const rows = await quotesExpiringWithinDays((params ?? { withinDays: 7 }) as never);
      return jsonResult({ report, rows });
    },
  );

  const proposeTransaction = tool(
    "propose_transaction",
    `The ONLY way to propose a write. Creates an Approval row. Actions: ${Object.keys(ACTIONS).join(", ")}.
Monetary actions (quotes, payments, POs, drawing charges) always require human approval before
execute_approved will run them (₹0 auto-approve threshold). Non-monetary actions (customer/inquiry/
drawing/feasibility writes) auto-approve immediately, but you must STILL call execute_approved
afterward — this tool never writes data itself, it only records the proposal.
Do NOT try to skip straight to a database write; there is no other write path.
Example: { action: "create_inquiry", payload: { customerId: "...", requirementDescription: "...", material: "MS", thickness: 3, quantity: 200 } }`,
    {
      action: z.string().describe(`One of: ${Object.keys(ACTIONS).join(", ")}`),
      payload: z.record(z.string(), z.unknown()),
    },
    async ({ action, payload }) => {
      if (!isKnownAction(action)) {
        return errorResult(`Unknown action "${action}"; use one of: ${Object.keys(ACTIONS).join(", ")}`);
      }
      const def = ACTIONS[action]!;
      const parsed = def.schema.safeParse(payload);
      if (!parsed.success) {
        return errorResult(`Invalid payload for ${action}: ${describeError(parsed.error)}`);
      }
      const status = def.monetary ? "PENDING" : "APPROVED";
      const approval = await prisma.approval.create({
        data: {
          proposedAction: action,
          payload: parsed.data as never,
          status,
          proposedById: actor.type === "USER" ? actor.userId : null,
          decidedAt: status === "APPROVED" ? new Date() : null,
          thresholdReason: def.monetary
            ? "Monetary action — requires human approval (₹0 auto-approve threshold)"
            : "Non-monetary, low-risk — auto-approved",
          conversationId: actor.type === "AGENT" ? actor.conversationId : undefined,
        },
      });
      return jsonResult({
        type: "approval_card",
        approvalId: approval.id,
        proposedAction: action,
        summary: def.monetary
          ? `Awaiting human approval: ${action}`
          : `Auto-approved (non-monetary): ${action} — call execute_approved to run it`,
        payload: parsed.data,
        status: approval.status,
        thresholdReason: approval.thresholdReason,
      });
    },
  );

  const executeApproved = tool(
    "execute_approved",
    `Executes an Approval whose status is APPROVED. Blocked if the Approval is PENDING (not yet
human-approved) or already executed.
Use when: you have an approvalId from propose_transaction that is auto-approved, or a human has
just approved a pending one.
Do NOT call this speculatively "just in case" — check the Approval's status first if unsure (get_record entity=Approval).`,
    { approvalId: z.string().min(1) },
    async ({ approvalId }) => {
      const approval = await prisma.approval.findUnique({ where: { id: approvalId } });
      if (!approval) {
        return errorResult(`Approval not found: ${approvalId}; use search_records entity=Approval`);
      }
      if (approval.status !== "APPROVED") {
        return errorResult(
          `Approval ${approvalId} is ${approval.status}, not APPROVED — it cannot be executed yet.`,
        );
      }
      if (approval.executedAt) {
        return errorResult(`Approval ${approvalId} was already executed at ${approval.executedAt.toISOString()}.`);
      }
      if (!isKnownAction(approval.proposedAction)) {
        return errorResult(`Approval ${approvalId} references unknown action "${approval.proposedAction}".`);
      }
      const def = ACTIONS[approval.proposedAction]!;
      try {
        const result = await def.run(actor, approval.payload);
        await prisma.approval.update({
          where: { id: approvalId },
          data: { executedAt: new Date(), executionResult: result as never },
        });
        return jsonResult({
          approvalId,
          action: approval.proposedAction,
          entity: def.entity,
          artifact: shapeArtifact(def.entity, result),
        });
      } catch (err) {
        return errorResult(`Execution failed for ${approval.proposedAction}: ${describeError(err)}`);
      }
    },
  );

  const draftMessage = tool(
    "draft_message",
    `Persists a drafted customer message as a message_draft artifact. NEVER sends anything — there is
no send integration. You write the message body yourself (see the followups skill for tone/
templates); this tool just records it.
Use when: asked to draft a follow-up/cover/dispatch message.
Example: { kind: "ADVANCE_FOLLOWUP", channel: "WHATSAPP", relatedEntity: "Job", relatedEntityId: "...", body: "Hi Ramesh, ..." }`,
    {
      kind: messageDraftKindSchema,
      channel: messageChannelSchema,
      relatedEntity: z.string().min(1),
      relatedEntityId: z.string().min(1),
      body: z.string().min(1),
    },
    async ({ kind, channel, relatedEntity, relatedEntityId, body }) => {
      const draft = await createMessageDraft(actor, {
        kind,
        channel,
        relatedEntity,
        relatedEntityId,
        body,
        generatedBy: actor.type === "AGENT" ? "agent" : actor.userId,
      });
      return jsonResult({
        type: "message_draft",
        messageDraftId: draft.id,
        kind: draft.kind,
        channel: draft.channel,
        body: draft.body,
        relatedEntity: draft.relatedEntity,
        relatedEntityId: draft.relatedEntityId,
      });
    },
  );

  return { searchRecords, getRecord, runReport, proposeTransaction, executeApproved, draftMessage };
}

export function createErpToolServer(actor: Actor) {
  const tools = buildErpTools(actor);
  return createSdkMcpServer({
    name: "erp",
    version: "0.1.0",
    tools: Object.values(tools),
  });
}
