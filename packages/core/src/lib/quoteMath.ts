import type { QuoteLineItemInput } from "@fab-erp/shared";

export interface ComputedQuoteLineItem extends QuoteLineItemInput {
  amountPaise: number;
}

export interface ComputedQuoteTotals {
  lineItems: ComputedQuoteLineItem[];
  subtotalPaise: number;
  gstAmountPaise: number;
  totalPaise: number;
}

// The only place quote totals get computed — see CLAUDE.md mission-critical
// rule 3. The agent supplies line items (process/description/qty/rate); it
// never supplies or asserts amountPaise/subtotal/gst/total.
export function computeQuoteTotals(
  lineItems: QuoteLineItemInput[],
  gstRatePct: number,
): ComputedQuoteTotals {
  const computed = lineItems.map((item) => ({
    ...item,
    amountPaise: Math.round(item.qty * item.ratePaise),
  }));
  const subtotalPaise = computed.reduce((sum, item) => sum + item.amountPaise, 0);
  const gstAmountPaise = Math.round((subtotalPaise * gstRatePct) / 100);
  const totalPaise = subtotalPaise + gstAmountPaise;
  return { lineItems: computed, subtotalPaise, gstAmountPaise, totalPaise };
}
