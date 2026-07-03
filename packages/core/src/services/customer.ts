import type {
  Actor,
  AddContactInput,
  CreateCustomerInput,
  UpdateCustomerInput,
} from "@fab-erp/shared";
import { addContactSchema, createCustomerSchema, updateCustomerSchema } from "@fab-erp/shared";
import { prisma } from "../lib/prisma";
import { writeAuditEvent } from "../lib/audit";
import { requireRole } from "../lib/actor";
import { NotFoundError } from "../lib/errors";

export async function createCustomer(actor: Actor, input: CreateCustomerInput) {
  requireRole(actor, ["ADMIN", "ENGINEER"]);
  const data = createCustomerSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({ data });
    await writeAuditEvent(tx, {
      actor,
      action: "customer.create",
      entity: "Customer",
      entityId: customer.id,
      after: customer,
    });
    return customer;
  });
}

export async function updateCustomer(actor: Actor, input: UpdateCustomerInput) {
  requireRole(actor, ["ADMIN", "ENGINEER"]);
  const { customerId, ...data } = updateCustomerSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const before = await tx.customer.findUnique({ where: { id: customerId } });
    if (!before || before.deletedAt) throw new NotFoundError("Customer", customerId);
    const after = await tx.customer.update({ where: { id: customerId }, data });
    await writeAuditEvent(tx, {
      actor,
      action: "customer.update",
      entity: "Customer",
      entityId: customerId,
      before,
      after,
    });
    return after;
  });
}

export async function addContact(actor: Actor, input: AddContactInput) {
  requireRole(actor, ["ADMIN", "ENGINEER"]);
  const data = addContactSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
    if (!customer || customer.deletedAt) throw new NotFoundError("Customer", data.customerId);
    const contact = await tx.contact.create({ data });
    await writeAuditEvent(tx, {
      actor,
      action: "contact.create",
      entity: "Contact",
      entityId: contact.id,
      after: contact,
    });
    return contact;
  });
}
