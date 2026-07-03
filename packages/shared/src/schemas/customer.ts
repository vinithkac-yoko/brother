import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1),
  gstin: z.string().min(1).optional(),
  billingAddress: z.string().min(1).optional(),
  shippingAddress: z.string().min(1).optional(),
  notes: z.string().optional(),
});
export type CreateCustomerInput = z.input<typeof createCustomerSchema>;

export const updateCustomerSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().min(1).optional(),
  gstin: z.string().min(1).optional(),
  billingAddress: z.string().min(1).optional(),
  shippingAddress: z.string().min(1).optional(),
  notes: z.string().optional(),
});
export type UpdateCustomerInput = z.input<typeof updateCustomerSchema>;

export const addContactSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional(),
  designation: z.string().min(1).optional(),
  isPrimary: z.boolean().default(false),
});
export type AddContactInput = z.input<typeof addContactSchema>;
