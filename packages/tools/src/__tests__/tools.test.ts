import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@fab-erp/core";
import type { Actor } from "@fab-erp/shared";
import { buildErpTools } from "../tools";
import { preToolUseHook } from "../hooks";

const agentActor: Actor = { type: "AGENT", conversationId: "test-convo" };

async function truncateAllTables() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
  `;
  if (tables.length === 0) return;
  const names = tables.map((t) => `"${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
}

beforeEach(async () => {
  await truncateAllTables();
  await prisma.clientConfig.create({
    data: {
      slug: "default",
      clientName: "Test Co",
      gstRatePct: 18,
      advancePct: 50,
      balancePct: 50,
      quoteValidityDays: 15,
      approvalThresholdPaise: 0,
      transportNote: "Transport extra as applicable",
      processRates: {},
    },
  });
});

function textOf(result: { content: Array<{ type: string; text?: string }> }) {
  const block = result.content[0];
  return block?.type === "text" ? JSON.parse(block.text ?? "{}") : undefined;
}

describe("propose_transaction / execute_approved", () => {
  it("auto-approves a non-monetary action and lets execute_approved run it", async () => {
    const tools = buildErpTools(agentActor);
    const proposeResult = await tools.proposeTransaction.handler(
      { action: "create_customer", payload: { name: "Sharada Engineering" } },
      undefined,
    );
    const proposed = textOf(proposeResult);
    expect(proposed.status).toBe("APPROVED");

    const execResult = await tools.executeApproved.handler({ approvalId: proposed.approvalId }, undefined);
    const executed = textOf(execResult);
    expect(executed.entity).toBe("Customer");
    expect((executed.artifact as { raw: { name: string } }).raw.name).toBe("Sharada Engineering");
  });

  it("leaves a monetary action PENDING and refuses to execute it", async () => {
    const tools = buildErpTools(agentActor);
    const customer = await prisma.customer.create({ data: { name: "Veena Fabtech" } });
    const inquiry = await prisma.inquiry.create({
      data: {
        inquiryNumber: "INQ-0001",
        customerId: customer.id,
        requirementDescription: "test",
        material: "MS",
        thickness: 3,
        quantity: 10,
        status: "NEW",
      },
    });

    const proposeResult = await tools.proposeTransaction.handler(
      {
        action: "build_quote",
        payload: {
          inquiryId: inquiry.id,
          deliveryBasisNotes: "10 days",
          lineItems: [{ process: "OTHER", description: "x", qty: 1, unit: "lot", ratePaise: 1000 }],
        },
      },
      undefined,
    );
    const proposed = textOf(proposeResult);
    expect(proposed.status).toBe("PENDING");

    const execResult = await tools.executeApproved.handler({ approvalId: proposed.approvalId }, undefined);
    expect(execResult.isError).toBe(true);
    expect(execResult.content[0]?.text).toMatch(/not APPROVED/);
  });

  it("shapes an executed build_quote result into a quote_card artifact", async () => {
    await prisma.clientConfig.update({ where: { slug: "default" }, data: { gstRatePct: 18 } });
    const tools = buildErpTools(agentActor);
    const customer = await prisma.customer.create({ data: { name: "Orion Metal Works" } });
    const inquiry = await prisma.inquiry.create({
      data: {
        inquiryNumber: "INQ-0001",
        customerId: customer.id,
        requirementDescription: "test",
        material: "MS",
        thickness: 3,
        quantity: 10,
        status: "NEW",
      },
    });
    const proposeResult = await tools.proposeTransaction.handler(
      {
        action: "build_quote",
        payload: {
          inquiryId: inquiry.id,
          deliveryBasisNotes: "10 days",
          lineItems: [{ process: "OTHER", description: "x", qty: 2, unit: "lot", ratePaise: 1000 }],
        },
      },
      undefined,
    );
    const proposed = textOf(proposeResult);
    await prisma.approval.update({ where: { id: proposed.approvalId }, data: { status: "APPROVED" } });

    const execResult = await tools.executeApproved.handler({ approvalId: proposed.approvalId }, undefined);
    const executed = textOf(execResult);
    expect(executed.artifact.type).toBe("quote_card");
    expect(executed.artifact.subtotalPaise).toBe(2000);
    expect(executed.artifact.gstAmountPaise).toBe(360);
    expect(executed.artifact.lineItems[0].qty).toBe(2);
  });

  it("refuses to execute the same approval twice", async () => {
    const tools = buildErpTools(agentActor);
    const proposeResult = await tools.proposeTransaction.handler(
      { action: "create_customer", payload: { name: "Orion Metal Works" } },
      undefined,
    );
    const proposed = textOf(proposeResult);
    await tools.executeApproved.handler({ approvalId: proposed.approvalId }, undefined);

    const secondAttempt = await tools.executeApproved.handler({ approvalId: proposed.approvalId }, undefined);
    expect(secondAttempt.isError).toBe(true);
    expect(secondAttempt.content[0]?.text).toMatch(/already executed/);
  });

  it("rejects an unknown action name", async () => {
    const tools = buildErpTools(agentActor);
    const result = await tools.proposeTransaction.handler(
      { action: "delete_everything", payload: {} },
      undefined,
    );
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/Unknown action/);
  });
});

describe("preToolUseHook", () => {
  it("denies execute_approved when the Approval is still PENDING", async () => {
    const approval = await prisma.approval.create({
      data: { proposedAction: "build_quote", payload: {}, status: "PENDING" },
    });
    const decision = await preToolUseHook(
      {
        hook_event_name: "PreToolUse",
        tool_name: "mcp__erp__execute_approved",
        tool_input: { approvalId: approval.id },
        tool_use_id: "tu_1",
      } as never,
      "tu_1",
      {} as never,
    );
    expect(decision.hookSpecificOutput?.permissionDecision).toBe("deny");
  });

  it("allows execute_approved when the Approval is APPROVED and unexecuted", async () => {
    const approval = await prisma.approval.create({
      data: { proposedAction: "create_customer", payload: {}, status: "APPROVED" },
    });
    const decision = await preToolUseHook(
      {
        hook_event_name: "PreToolUse",
        tool_name: "mcp__erp__execute_approved",
        tool_input: { approvalId: approval.id },
        tool_use_id: "tu_2",
      } as never,
      "tu_2",
      {} as never,
    );
    expect(decision.hookSpecificOutput?.permissionDecision).toBe("allow");
  });

  it("allows unrelated tools through untouched", async () => {
    const decision = await preToolUseHook(
      {
        hook_event_name: "PreToolUse",
        tool_name: "mcp__erp__search_records",
        tool_input: {},
        tool_use_id: "tu_3",
      } as never,
      "tu_3",
      {} as never,
    );
    expect(decision.hookSpecificOutput?.permissionDecision).toBe("allow");
  });
});
