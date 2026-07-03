---
name: feasibility
description: Use when running or completing a feasibility check on an inquiry that has a drawing attached — determines machine compatibility, outsourcing needs (tube laser), risk level, and estimated production days. Do NOT use before a drawing exists on the inquiry (use inquiry-intake first), and do NOT use for pricing (see quotation skill).
---

# Feasibility Check

## Two-step flow

1. `create_feasibility_check` with a `checklist`:
   - `drawingAvailable`, `machineCompatible`
   - `tubeLaserOutsourcingRequired` — true if any tube/pipe sections need
     cutting (tube laser is always outsourced, never in-house)
   - `tolerancesSpecified`, `powderCoatColorSpecified`
   - free-text `notes` for anything else
2. Once you (or the engineer) have enough information, `complete_feasibility_check`:
   - `riskLevel`: LOW / MEDIUM / HIGH
   - `estProductionDays`
   - `missingInfo`: carry over anything still unresolved from the drawing review
   - `outsourcingNeeded` + `outsourcingNotes` if tube laser (or anything else) is outsourced

## Risk-level rubric

- **LOW** — standard sheet metal, no outsourcing, all info present, shop
  has made similar parts before.
- **MEDIUM** — one uncertain factor: outsourcing required, a missing spec
  that's likely resolvable, or a tight delivery window.
- **HIGH** — multiple unknowns, a process the shop rarely does, or
  capability genuinely in question (this is the signal that the inquiry
  may end up `LOST` with `lostReason: CAPABILITY_MISMATCH`).

## Tube laser outsourcing

Sheet laser cutting is in-house. Tube laser cutting is **always outsourced**
— if the drawing shows round/square tube sections, `tubeLaserOutsourcingRequired`
is true regardless of quantity or complexity.

## If the part isn't feasible

Don't force a quote. Mark it via `mark_inquiry_lost` with
`lostReason: CAPABILITY_MISMATCH` and specific notes. Then check: was this
drawing `SHOP_DRAWN`? If so, the drawing charge from inquiry-intake still
needs to be invoiced — infeasibility doesn't waive it automatically (that's
a human call via `waive_drawing_charge`, not a default).
