# CUSTOMIZE.md — Per-Client Configuration

This file is the **single source of truth for client-specific business data**.
`fab-erp-template` is cloned once per client (job shop). Everything in this
file is loaded into the `ClientConfig` seed (`packages/core/prisma/seed.ts`)
and read by services at runtime — **never hardcode any value below into core
code**. If you catch yourself writing a rate, a percentage, or a stage name
directly into a `.ts` file under `packages/core/src/services/`, stop and put
it here instead.

Fill this in before running `pnpm db:seed` for a new client.

---

## 1. Client Identity

| Field | Value |
|---|---|
| Client legal name | _TBD_ |
| Client short code (used in Job IDs, e.g. `JOB-0001`) | _TBD_ |
| GSTIN | _TBD_ |
| Registered address | _TBD_ |

## 2. Tax & Commercial Terms

| Field | Value | Notes |
|---|---|---|
| GST rate | 18% | Applied to quote subtotal. Change here if client's product mix has a different HSN/rate. |
| Payment terms | 50% advance / 50% before dispatch | Encoded as `paymentTerms: { advancePct: 50, balancePct: 50, balanceDueAt: "before_dispatch" }` |
| Quote validity | 15 days | From quote-issue date |
| Delivery basis | X working days from (advance payment received AND drawing approved) | `deliveryBasis` config value = working days, counted from later of the two events |
| Transport | Extra, as applicable | Not included in quote line items by default |

## 3. Approval Threshold (Layer 3 — agent guardrails)

| Field | Value | Notes |
|---|---|---|
| Monetary auto-approve threshold | ₹0 (paise: `0`) | **All** monetary writes (Quote, Payment, CustomerPO, VendorPO amounts) require human approval in `Approval` inbox, regardless of size. This is the template default — raise it here per client if they want low-value writes to auto-approve. |
| Non-monetary low-risk auto-approve | Status/notes-only writes (e.g. drawing review notes, feasibility checklist fields) may auto-approve | Tune per client risk appetite |

## 4. Process Rate Card (INR)

Rates below are **seed/sample data only** — replace with the client's real
costing before going live. Units and rate basis vary by process; the
`Quote` line-item builder in `skills/quotation/` reads whichever basis is
configured here.

| Process | Rate basis | Sample rate (INR) | Outsourced? |
|---|---|---|---|
| Raw material — MS sheet | per kg | 65 | No |
| Raw material — SS sheet | per kg | 210 | No |
| Sheet laser cutting | per meter of cut path | 12 | No |
| Tube laser cutting | per meter of cut path | 18 | **Yes** — outsourced vendor |
| Bending | per bend | 15 | No |
| MIG welding | per joint | 25 | No |
| Bandsaw cutting | per cut | 20 | No |
| Laser welding | per meter | 30 | No |
| Grinding | per piece | 10 | No |
| Powder coating | per sq. meter | 180 | No (or Yes if client outsources — set flag) |
| Packing | per job (flat) | 500 | No |

### 4a. CAD Drawing Charges

Not every customer supplies a drawing — many only describe a requirement,
and the shop's own engineers draw the CAD (`Drawing.source = SHOP_DRAWN`).
That drawing work is billable **whether or not the part turns out feasible
to manufacture** — recorded as a `DrawingCharge`, deliberately separate
from `Quote`/`QuoteLineItem` so it isn't gated on a production quote
existing.

Unlike the rate-card processes above, there is **no fixed formula** for
this charge — the amount is a per-job judgment call made by the
owner/engineer when the drawing is created or invoiced (`DrawingCharge.amountPaise`,
`decidedBy`). If this client wants a fixed or tiered rate instead, add it
to the table above and update the drawing-creation service accordingly —
until then, do not hardcode a rate in code for this line.

## 5. Process Route / Production Stages

Default ordered stage list (subset chosen per job in its `ProcessRoute`):

1. `SHEET_LASER_CUTTING`
2. `TUBE_LASER_OUTSOURCING`
3. `BENDING`
4. `FABRICATION`
5. `MIG_WELDING` / `BANDSAW_CUTTING` / `LASER_WELDING` (job picks applicable one(s))
6. `GRINDING`
7. `POWDER_COATING`
8. `PACKING`
9. `DISPATCH`

If this client has additional/different stages (e.g. anodizing, assembly),
list them here with where they slot into the sequence — the `RouteStage`
enum in `packages/shared` will need a corresponding value added.

## 6. Drawing File Types Accepted

- DXF
- SolidWorks (`.sldprt`, `.sldasm`)
- PDF
- CypCut

## 7. Inquiry Lost-Reason Taxonomy

Fixed enum (`LostReason`) — template default, generally applicable across
clients:

- `PRICE`
- `LEAD_TIME`
- `CAPABILITY_MISMATCH` (job shop can't make it / needs unsupported outsourcing)
- `CUSTOMER_CANCELLED`
- `NO_RESPONSE`
- `OTHER` (free-text `lostReasonNotes` required)

## 8. Roles

Stubbed roles (no real auth in Phase 1): `ADMIN`, `ENGINEER`, `SUPERVISOR`.
Extend here if the client has more granular roles.

## 9. Vendors / Outsourcing

List known outsourcing partners here (tube laser cutting is the known
Phase-1 outsourced process for this client type):

| Vendor | Process | Notes |
|---|---|---|
| _TBD_ | Tube laser cutting | Seed data uses 2 placeholder vendors |

---

**Reminder to future sessions:** if a task requires adding a new rate,
stage, or business rule, the correct sequence is: (1) add/update the value
here, (2) update the `ClientConfig` seed shape in `packages/core/prisma/seed.ts`
if the shape changed, (3) reference it via config lookup in the service —
never inline it.
