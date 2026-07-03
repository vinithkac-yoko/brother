"use client";

function paise(n: unknown) {
  if (typeof n !== "number") return String(n);
  return `₹${(n / 100).toLocaleString("en-IN")}`;
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: "1rem",
  marginTop: "0.5rem",
  background: "#fafafa",
};

export function ArtifactCard({ artifact }: { artifact: Record<string, unknown> }) {
  switch (artifact.type) {
    case "approval_card":
      return (
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>Approval — {String(artifact.proposedAction)}</strong>
            <span
              style={{
                background: artifact.status === "PENDING" ? "#fff4e5" : "#e6f4ea",
                borderRadius: 4,
                padding: "0.1rem 0.5rem",
                fontSize: "0.85em",
              }}
            >
              {String(artifact.status)}
            </span>
          </div>
          <p style={{ fontSize: "0.9em" }}>{String(artifact.summary)}</p>
          {artifact.status === "PENDING" && (
            <p style={{ fontSize: "0.85em", color: "#a15c00" }}>
              Waiting in the <a href="/approvals">Approval Inbox</a>.
            </p>
          )}
        </div>
      );
    case "quote_card": {
      const lineItems = (artifact.lineItems as Array<Record<string, unknown>>) ?? [];
      return (
        <div style={cardStyle}>
          <strong>
            Quote {String(artifact.quoteNumber)} (v{String(artifact.version)}) — {String(artifact.status)}
          </strong>
          <table style={{ width: "100%", marginTop: "0.5rem", fontSize: "0.9em", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                <th>Process</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li, i) => (
                <tr key={i}>
                  <td>{String(li.process)}</td>
                  <td>{String(li.description)}</td>
                  <td>
                    {String(li.qty)} {String(li.unit)}
                  </td>
                  <td>{paise(li.ratePaise)}</td>
                  <td>{paise(li.amountPaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: "0.5rem", fontSize: "0.9em" }}>
            <div>Subtotal: {paise(artifact.subtotalPaise)}</div>
            <div>
              GST ({String(artifact.gstRatePct)}%): {paise(artifact.gstAmountPaise)}
            </div>
            <div style={{ fontWeight: 700 }}>Total: {paise(artifact.totalPaise)}</div>
          </div>
          <p style={{ fontSize: "0.85em", color: "#666" }}>{String(artifact.deliveryBasisNotes)}</p>
          <p style={{ fontSize: "0.85em", color: "#666" }}>{String(artifact.transportNote)}</p>
        </div>
      );
    }
    case "feasibility_checklist":
      return (
        <div style={cardStyle}>
          <strong>Feasibility Check</strong>
          <pre style={{ fontSize: "0.85em", overflowX: "auto" }}>
            {JSON.stringify(artifact.checklist, null, 2)}
          </pre>
          <div style={{ fontSize: "0.9em" }}>
            Risk: {String(artifact.riskLevel ?? "—")} · Est. days: {String(artifact.estProductionDays ?? "—")} ·
            Complete: {String(artifact.isComplete)}
          </div>
        </div>
      );
    case "job_card":
      return (
        <div style={cardStyle}>
          <strong>Job {String(artifact.jobNumber)}</strong>
          <div style={{ fontSize: "0.9em" }}>
            Status:{" "}
            <span
              style={{
                background: artifact.status === "PRODUCTION_ELIGIBLE" ? "#e6f4ea" : "#fff4e5",
                borderRadius: 4,
                padding: "0.1rem 0.5rem",
              }}
            >
              {String(artifact.status)}
            </span>
          </div>
          {artifact.status === "PRODUCTION_ELIGIBLE" && (
            <p style={{ color: "#1a7f37", fontSize: "0.9em" }}>
              Advance confirmed — production-eligible.
            </p>
          )}
        </div>
      );
    case "message_draft":
      return (
        <div style={cardStyle}>
          <strong>
            Draft — {String(artifact.kind)} ({String(artifact.channel)})
          </strong>
          <p style={{ whiteSpace: "pre-wrap", background: "white", padding: "0.75rem", borderRadius: 4 }}>
            {String(artifact.body)}
          </p>
          <p style={{ fontSize: "0.8em", color: "#999" }}>Draft only — nothing was sent.</p>
        </div>
      );
    default:
      return (
        <div style={cardStyle}>
          <strong>{String(artifact.entity ?? "Result")}</strong>
          <pre style={{ fontSize: "0.8em", overflowX: "auto" }}>{JSON.stringify(artifact.raw ?? artifact, null, 2)}</pre>
        </div>
      );
  }
}
