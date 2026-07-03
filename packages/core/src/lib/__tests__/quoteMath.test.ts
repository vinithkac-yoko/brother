import { describe, expect, it } from "vitest";
import { computeQuoteTotals } from "../quoteMath.js";

describe("computeQuoteTotals", () => {
  it("computes amountPaise per line item and totals with GST", () => {
    const result = computeQuoteTotals(
      [
        { process: "SHEET_LASER_CUTTING", description: "Laser cutting", qty: 10, unit: "meter", ratePaise: 1200 },
        { process: "BENDING", description: "Bending", qty: 4, unit: "bend", ratePaise: 1500 },
      ],
      18,
    );

    expect(result.lineItems[0]?.amountPaise).toBe(12000);
    expect(result.lineItems[1]?.amountPaise).toBe(6000);
    expect(result.subtotalPaise).toBe(18000);
    expect(result.gstAmountPaise).toBe(3240); // 18% of 18000
    expect(result.totalPaise).toBe(21240);
  });

  it("rounds fractional paise to the nearest integer", () => {
    const result = computeQuoteTotals(
      [{ process: "GRINDING", description: "Grinding", qty: 3, unit: "piece", ratePaise: 333 }],
      18,
    );
    // 3 * 333 = 999 exactly, no rounding needed here — use a genuinely
    // fractional qty to actually exercise rounding.
    expect(result.lineItems[0]?.amountPaise).toBe(999);

    const fractional = computeQuoteTotals(
      [{ process: "GRINDING", description: "Grinding", qty: 2.5, unit: "sqm", ratePaise: 333 }],
      18,
    );
    expect(fractional.lineItems[0]?.amountPaise).toBe(Math.round(2.5 * 333));
  });

  it("returns zero totals for an empty line-item list", () => {
    const result = computeQuoteTotals([], 18);
    expect(result.subtotalPaise).toBe(0);
    expect(result.gstAmountPaise).toBe(0);
    expect(result.totalPaise).toBe(0);
  });
});
