// Defense-in-depth: the execute_approved tool itself already refuses to run
// a non-APPROVED or already-executed Approval (see tools.ts). This hook
// enforces the exact same check one layer earlier, before the tool body
// even runs — per CLAUDE.md "this is enforced twice (hook + service) on
// purpose." A bug in one layer shouldn't be enough to bypass the gate.
import type { HookCallback, PreToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";
import { prisma } from "@fab-erp/core";

const EXECUTE_APPROVED_TOOL_NAME = "mcp__erp__execute_approved";

function deny(reason: string) {
  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PreToolUse" as const,
      permissionDecision: "deny" as const,
      permissionDecisionReason: reason,
    },
  };
}

function allow() {
  return {
    continue: true,
    hookSpecificOutput: { hookEventName: "PreToolUse" as const, permissionDecision: "allow" as const },
  };
}

export const preToolUseHook: HookCallback = async (input) => {
  const hookInput = input as PreToolUseHookInput;
  if (hookInput.hook_event_name !== "PreToolUse" || hookInput.tool_name !== EXECUTE_APPROVED_TOOL_NAME) {
    return allow();
  }

  const toolInput = hookInput.tool_input as { approvalId?: unknown } | undefined;
  const approvalId = typeof toolInput?.approvalId === "string" ? toolInput.approvalId : undefined;
  if (!approvalId) {
    return deny("execute_approved called without a valid approvalId");
  }

  const approval = await prisma.approval.findUnique({ where: { id: approvalId } });
  if (!approval) {
    return deny(`Approval ${approvalId} does not exist`);
  }
  if (approval.status !== "APPROVED") {
    return deny(`Approval ${approvalId} is ${approval.status}, not APPROVED — blocked at the hook layer`);
  }
  if (approval.executedAt) {
    return deny(`Approval ${approvalId} was already executed — blocked at the hook layer`);
  }
  return allow();
};
