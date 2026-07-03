---
name: inquiry-intake
description: Use when capturing a new customer inquiry/lead (a fresh job request, whether from email, WhatsApp, phone call notes, or a walk-in) or when asked to review an existing inquiry for completeness. Covers what fields are required, how to handle each drawing file type (DXF/SolidWorks/PDF/CypCut), and what to flag as missing before an inquiry can move to feasibility. Do NOT use for feasibility checklisting (see feasibility skill) or quoting (see quotation skill).
---

# Inquiry Intake

## Required fields for `create_inquiry`

- `customerId` — look the customer up first with `search_records entity=Customer`;
  if they don't exist yet, `propose_transaction action=create_customer` first.
- `requirementDescription` — capture in the customer's own words plus your
  own summary (part name/type, key features).
- `material`, `thickness` (mm), `quantity`.
- `expectedDeliveryDate` if the customer gave one.

## Drawing handling

Two cases, and they matter a lot downstream (billing depends on this):

1. **Customer supplies a drawing** (DXF, SolidWorks, PDF, or CypCut file).
   `attach_drawing` with `source: "CUSTOMER_SUPPLIED"`.
2. **Customer only describes a requirement** — no drawing exists yet. If our
   engineers will draw the CAD ourselves, that's `source: "SHOP_DRAWN"`, and
   it is billable via `create_drawing_charge` **whether or not the part
   turns out feasible to manufacture**. Don't forget this step — it's easy
   to skip when a job simply doesn't proceed, but the drawing work still
   happened and the shop should still get paid for it. The amount is not
   computed automatically; ask what to charge or flag it for the owner to
   set (`decidedBy` must be a real name, not "agent").

## What to flag as missing

Before an inquiry can sensibly move to feasibility, check for:

- Powder coat color, if the part will be powder coated (very common to be
  missing — always ask or flag it).
- Tolerance specifications.
- Bending angles / weld joint callouts if the drawing doesn't show them
  clearly.

Record these as `flags` on `review_drawing`, e.g.
`["missing powder coat color", "missing tolerance spec"]`. Missing info
doesn't block creating the inquiry — it blocks a *confident* feasibility
call later, so surface it early rather than silently proceeding.

## What NOT to do

- Never guess a material spec, quantity, or delivery date that wasn't
  stated — ask, or leave it as a flagged gap.
- Never skip straight to a quote from intake — feasibility comes first.
