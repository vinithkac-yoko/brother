---
name: quotation
description: Use when building or revising a price quote for an inquiry that has completed feasibility. Covers line-item construction per process (raw material, cutting, bending, welding, grinding, powder coating, packing), where rates come from (ClientConfig, never guessed), GST/terms boilerplate, and the 15-day-validity/versioning rules. Do NOT use to invent rates not present in ClientConfig — flag as missing info instead. Always produces a quote_card artifact pending Approval; never writes the quote directly.
---

# Quotation

## Before you quote

Feasibility should be complete (`isComplete: true`) — check with `get_record
entity=FeasibilityCheck` if unsure. Quoting an inquiry that hasn't been
assessed risks a wrong price.

## Rates come from ClientConfig — never guess

`search_records entity=ClientConfig` (or ask if you don't have a rate) for
the current per-process rate card. If a process the job needs isn't in
`processRates`, say so explicitly rather than inventing a number — an
agent-invented rate is exactly the kind of mistake CLAUDE.md's mission-
critical rules exist to prevent.

## Building line items

One `QuoteLineItem` per process actually used, e.g.:

- `RAW_MATERIAL` — qty in kg, rate per kg by material type
- `SHEET_LASER_CUTTING` — qty in meters of cut path
- `TUBE_LASER_CUTTING` — outsourced; qty in meters
- `BENDING` — qty = number of bends
- `MIG_WELDING` / `BANDSAW_CUTTING` / `LASER_WELDING` — whichever the route uses
- `GRINDING` — qty = pieces
- `POWDER_COATING` — qty in sq. meters (only if the job needs it — and if
  so, the powder coat color MUST be confirmed before production, even
  though that's enforced later at the job/route-stage level, not here)
- `PACKING` — usually a flat per-job amount

Submit line items via `propose_transaction action=build_quote` — you supply
`process`/`description`/`qty`/`unit`/`ratePaise` per item; the service
computes `amountPaise`, `subtotalPaise`, `gstAmountPaise`, and `totalPaise`
itself. Never state a total yourself in the response; quote the numbers the
tool actually returns.

## Terms boilerplate

- GST: from `ClientConfig.gstRatePct` (18% default), applied to subtotal.
- Payment: `advancePct`/`balancePct` from config (50/50 default), balance
  due before dispatch.
- Validity: `quoteValidityDays` from config (15 days default).
- Delivery: state it as "N working days from advance payment + drawing
  approval" — N comes from the feasibility check's `estProductionDays`.
- Transport: `ClientConfig.transportNote` verbatim ("Transport extra as
  applicable").

## Revisions version, they don't overwrite

If the customer wants changes to an already-issued quote, use
`propose_transaction action=revise_quote` with `previousQuoteId` — this
creates a new `Quote` row (e.g. `Q-0001-v2`) and marks the old one
`SUPERSEDED`. Never try to edit a quote in place.

## Always pending Approval

`build_quote`/`revise_quote` are monetary — the Approval will be `PENDING`,
not auto-approved. Tell the user the quote is drafted and awaiting approval;
don't imply it's already been sent to the customer.
