// Registry backing propose_transaction / execute_approved. Every write the
// agent can make goes through one of these — there is no other path from
// agent to database write. `monetary: true` actions always require human
// approval (₹0 threshold, per CLAUDE.md); everything else auto-approves.
import { z } from "zod";
import * as core from "@fab-erp/core";
import {
  addContactSchema,
  attachDrawingSchema,
  buildQuoteSchema,
  completeFeasibilityCheckSchema,
  confirmPaymentSchema,
  createCustomerSchema,
  createDrawingChargeSchema,
  createFeasibilityCheckSchema,
  createInquirySchema,
  invoiceDrawingChargeSchema,
  markDrawingChargePaidSchema,
  markInquiryLostSchema,
  recordCustomerPOSchema,
  recordPaymentSchema,
  reviewDrawingSchema,
  reviseQuoteSchema,
  updateCustomerSchema,
  updateInquirySchema,
  waiveDrawingChargeSchema,
  type Actor,
} from "@fab-erp/shared";

export interface ActionDefinition {
  schema: z.ZodType;
  monetary: boolean;
  entity: string;
  run: (actor: Actor, input: unknown) => Promise<unknown>;
}

export const ACTIONS: Record<string, ActionDefinition> = {
  create_customer: {
    schema: createCustomerSchema,
    monetary: false,
    entity: "Customer",
    run: (actor, input) => core.createCustomer(actor, input as never),
  },
  update_customer: {
    schema: updateCustomerSchema,
    monetary: false,
    entity: "Customer",
    run: (actor, input) => core.updateCustomer(actor, input as never),
  },
  add_contact: {
    schema: addContactSchema,
    monetary: false,
    entity: "Contact",
    run: (actor, input) => core.addContact(actor, input as never),
  },
  create_inquiry: {
    schema: createInquirySchema,
    monetary: false,
    entity: "Inquiry",
    run: (actor, input) => core.createInquiry(actor, input as never),
  },
  update_inquiry: {
    schema: updateInquirySchema,
    monetary: false,
    entity: "Inquiry",
    run: (actor, input) => core.updateInquiry(actor, input as never),
  },
  mark_inquiry_lost: {
    schema: markInquiryLostSchema,
    monetary: false,
    entity: "Inquiry",
    run: (actor, input) => core.markInquiryLost(actor, input as never),
  },
  attach_drawing: {
    schema: attachDrawingSchema,
    monetary: false,
    entity: "Drawing",
    run: (actor, input) => core.attachDrawing(actor, input as never),
  },
  review_drawing: {
    schema: reviewDrawingSchema,
    monetary: false,
    entity: "Drawing",
    run: (actor, input) => core.reviewDrawing(actor, input as never),
  },
  create_drawing_charge: {
    schema: createDrawingChargeSchema,
    monetary: true,
    entity: "DrawingCharge",
    run: (actor, input) => core.createDrawingCharge(actor, input as never),
  },
  invoice_drawing_charge: {
    schema: invoiceDrawingChargeSchema,
    monetary: true,
    entity: "DrawingCharge",
    run: (actor, input) => core.invoiceDrawingCharge(actor, input as never),
  },
  mark_drawing_charge_paid: {
    schema: markDrawingChargePaidSchema,
    monetary: true,
    entity: "DrawingCharge",
    run: (actor, input) => core.markDrawingChargePaid(actor, input as never),
  },
  waive_drawing_charge: {
    schema: waiveDrawingChargeSchema,
    monetary: false,
    entity: "DrawingCharge",
    run: (actor, input) => core.waiveDrawingCharge(actor, input as never),
  },
  create_feasibility_check: {
    schema: createFeasibilityCheckSchema,
    monetary: false,
    entity: "FeasibilityCheck",
    run: (actor, input) => core.createFeasibilityCheck(actor, input as never),
  },
  complete_feasibility_check: {
    schema: completeFeasibilityCheckSchema,
    monetary: false,
    entity: "FeasibilityCheck",
    run: (actor, input) => core.completeFeasibilityCheck(actor, input as never),
  },
  build_quote: {
    schema: buildQuoteSchema,
    monetary: true,
    entity: "Quote",
    run: (actor, input) => core.buildQuote(actor, input as never),
  },
  revise_quote: {
    schema: reviseQuoteSchema,
    monetary: true,
    entity: "Quote",
    run: (actor, input) => core.reviseQuote(actor, input as never),
  },
  record_customer_po: {
    schema: recordCustomerPOSchema,
    monetary: true,
    entity: "CustomerPO",
    run: (actor, input) => core.recordCustomerPO(actor, input as never),
  },
  record_payment: {
    schema: recordPaymentSchema,
    monetary: true,
    entity: "Payment",
    run: (actor, input) => core.recordPayment(actor, input as never),
  },
  confirm_payment: {
    schema: confirmPaymentSchema,
    monetary: true,
    entity: "Payment",
    run: (actor, input) => core.confirmPayment(actor, input as never),
  },
};

export type ActionName = keyof typeof ACTIONS;

export function isKnownAction(name: string): name is ActionName {
  return Object.prototype.hasOwnProperty.call(ACTIONS, name);
}
