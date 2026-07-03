import { beforeEach, describe, expect, it } from "vitest";
import { truncateAllTables } from "../../lib/testHelpers";
import { prisma } from "../../lib/prisma";
import { addContact, createCustomer, updateCustomer } from "../customer";
import { PermissionError } from "../../lib/errors";
import { adminActor, agentActor, engineerActor, supervisorActor } from "./factories";

beforeEach(async () => {
  await truncateAllTables();
});

describe("createCustomer", () => {
  it("creates a customer and writes an audit event", async () => {
    const customer = await createCustomer(adminActor, { name: "Sharada Engineering" });
    expect(customer.name).toBe("Sharada Engineering");

    const events = await prisma.auditEvent.findMany({ where: { entityId: customer.id } });
    expect(events).toHaveLength(1);
    expect(events[0]?.action).toBe("customer.create");
    expect(events[0]?.actorType).toBe("USER");
  });

  it("rejects a SUPERVISOR actor", async () => {
    await expect(
      createCustomer(supervisorActor, { name: "Sharada Engineering" }),
    ).rejects.toThrow(PermissionError);
  });

  it("lets an AGENT actor through (authority enforced at the tool layer)", async () => {
    const customer = await createCustomer(agentActor, { name: "Agent Created Co" });
    expect(customer.name).toBe("Agent Created Co");
  });

  it("rejects an empty name", async () => {
    await expect(createCustomer(adminActor, { name: "" })).rejects.toThrow();
  });
});

describe("updateCustomer", () => {
  it("updates fields and records before/after", async () => {
    const customer = await createCustomer(engineerActor, { name: "Old Name" });
    const updated = await updateCustomer(engineerActor, {
      customerId: customer.id,
      name: "New Name",
    });
    expect(updated.name).toBe("New Name");

    const event = await prisma.auditEvent.findFirst({
      where: { entityId: customer.id, action: "customer.update" },
    });
    expect((event?.before as { name: string }).name).toBe("Old Name");
    expect((event?.after as { name: string }).name).toBe("New Name");
  });

  it("throws NotFoundError for a missing customer", async () => {
    await expect(
      updateCustomer(adminActor, { customerId: "nonexistent", name: "X" }),
    ).rejects.toThrow(/not found/);
  });
});

describe("addContact", () => {
  it("attaches a contact to a customer", async () => {
    const customer = await createCustomer(adminActor, { name: "Sharada Engineering" });
    const contact = await addContact(adminActor, {
      customerId: customer.id,
      name: "Ramesh",
      phone: "9876543210",
      isPrimary: true,
    });
    expect(contact.customerId).toBe(customer.id);
    expect(contact.isPrimary).toBe(true);
  });
});
