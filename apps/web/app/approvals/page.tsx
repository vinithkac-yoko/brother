import { prisma } from "@fab-erp/core";
import { approveAction, rejectAction } from "./actions";

// Same reasoning as /pipeline — live DB state, never statically prerendered.
export const dynamic = "force-dynamic";

function formatPaiseFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.totalPaise === "number") return `₹${(p.totalPaise / 100).toLocaleString("en-IN")}`;
  if (typeof p.amountPaise === "number") return `₹${(p.amountPaise / 100).toLocaleString("en-IN")}`;
  return null;
}

export default async function ApprovalsPage() {
  const [pending, recent] = await Promise.all([
    prisma.approval.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } }),
    prisma.approval.findMany({
      where: { status: { in: ["APPROVED", "REJECTED"] } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>Approval Inbox</h1>
      <p style={{ color: "#666" }}>
        Every monetary action the agent proposes lands here — nothing executes until an
        admin approves it.
      </p>

      <h2>Pending ({pending.length})</h2>
      {pending.length === 0 && <p style={{ color: "#999" }}>Nothing waiting on you right now.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {pending.map((approval) => (
          <li
            key={approval.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: "1rem",
              marginBottom: "0.75rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <strong>{approval.proposedAction}</strong>
              {formatPaiseFromPayload(approval.payload) && (
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatPaiseFromPayload(approval.payload)}
                </span>
              )}
            </div>
            <pre
              style={{
                background: "#f6f6f6",
                padding: "0.5rem",
                borderRadius: 4,
                overflowX: "auto",
                fontSize: "0.85em",
              }}
            >
              {JSON.stringify(approval.payload, null, 2)}
            </pre>
            <p style={{ fontSize: "0.85em", color: "#666" }}>{approval.thresholdReason}</p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <form
                action={async () => {
                  "use server";
                  await approveAction(approval.id);
                }}
              >
                <button type="submit" style={{ background: "#1a7f37", color: "white", border: 0, borderRadius: 4, padding: "0.5rem 1rem" }}>
                  Approve
                </button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await rejectAction(approval.id);
                }}
              >
                <button type="submit" style={{ background: "#cf222e", color: "white", border: 0, borderRadius: 4, padding: "0.5rem 1rem" }}>
                  Reject
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      <h2>Recent decisions</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {recent.map((approval) => (
          <li key={approval.id} style={{ padding: "0.4rem 0", borderBottom: "1px solid #eee" }}>
            <span
              style={{
                display: "inline-block",
                width: 90,
                fontWeight: 600,
                color: approval.status === "APPROVED" ? "#1a7f37" : "#cf222e",
              }}
            >
              {approval.status}
            </span>
            {approval.proposedAction}
            {approval.executedAt && <span style={{ color: "#666" }}> — executed</span>}
          </li>
        ))}
      </ul>
    </main>
  );
}
