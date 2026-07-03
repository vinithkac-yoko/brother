import { openInquiriesPipeline, quotesExpiringWithinDays, prisma } from "@fab-erp/core";

// Reads live DB state on every request — must not be statically
// prerendered at build time (Railway's build phase may not have DB
// access yet, and the data would go stale immediately anyway).
export const dynamic = "force-dynamic";

function paise(n: number) {
  return `₹${(n / 100).toLocaleString("en-IN")}`;
}

export default async function PipelinePage() {
  const [openInquiries, expiringQuotes, jobs] = await Promise.all([
    openInquiriesPipeline(),
    quotesExpiringWithinDays({ withinDays: 30 }),
    prisma.job.findMany({
      include: { customer: true, payments: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>Inquiry Pipeline</h1>

      <h2>Open inquiries ({openInquiries.length})</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
            <th>Inquiry</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Material</th>
            <th>Qty</th>
            <th>Days open</th>
          </tr>
        </thead>
        <tbody>
          {openInquiries.map((row) => (
            <tr key={row.inquiryId} style={{ borderBottom: "1px solid #eee" }}>
              <td>{row.inquiryNumber}</td>
              <td>{row.customerName}</td>
              <td>
                <span
                  style={{
                    background: "#eef",
                    borderRadius: 4,
                    padding: "0.1rem 0.5rem",
                    fontSize: "0.85em",
                  }}
                >
                  {row.status}
                </span>
              </td>
              <td>{row.material}</td>
              <td>{row.quantity}</td>
              <td>{row.daysOpen}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: "2rem" }}>Quotes expiring within 30 days ({expiringQuotes.length})</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
            <th>Quote</th>
            <th>Inquiry</th>
            <th>Customer</th>
            <th>Total</th>
            <th>Expires in</th>
          </tr>
        </thead>
        <tbody>
          {expiringQuotes.map((row) => (
            <tr key={row.quoteId} style={{ borderBottom: "1px solid #eee" }}>
              <td>{row.quoteNumber}</td>
              <td>{row.inquiryNumber}</td>
              <td>{row.customerName}</td>
              <td>{paise(row.totalPaise)}</td>
              <td>{row.daysUntilExpiry} days</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: "2rem" }}>Jobs ({jobs.length})</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
            <th>Job</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Powder coat</th>
            <th>Advance</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const advance = job.payments.find((p) => p.type === "ADVANCE");
            return (
              <tr key={job.id} style={{ borderBottom: "1px solid #eee" }}>
                <td>{job.jobNumber}</td>
                <td>{job.customer.name}</td>
                <td>
                  <span
                    style={{
                      background: job.status === "PRODUCTION_ELIGIBLE" ? "#e6f4ea" : "#fff4e5",
                      borderRadius: 4,
                      padding: "0.1rem 0.5rem",
                      fontSize: "0.85em",
                    }}
                  >
                    {job.status}
                  </span>
                </td>
                <td>
                  {job.powderCoatColor
                    ? `${job.powderCoatColor} ${job.powderCoatColorConfirmed ? "(confirmed)" : "(unconfirmed)"}`
                    : "—"}
                </td>
                <td>
                  {advance ? `${paise(advance.amountPaise)} — ${advance.status}` : "not recorded"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
