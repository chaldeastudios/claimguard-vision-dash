import { createServerFn } from "@tanstack/react-start";
import { requireSession } from "./session-middleware";
import { z } from "zod";
import {
  getOpenimisFamilies,
  getOpenimisFamily,
  getOpenimisFamilyMembers,
  getOpenimisInsuree,
  getOpenimisInsurees,
  updateOpenimisInsuree,
  updateOpenimisFamily,
  createOpenimisInsuree,
  createOpenimisFamily,
  type Family,
  type Insuree,
} from "./insuree.server";

export type { Family, Insuree };

export const fetchFamilies = createServerFn({ method: "GET" })
  .middleware([requireSession])
  .handler(async (): Promise<Family[]> => getOpenimisFamilies());

export const fetchInsurees = createServerFn({ method: "GET" })
  .middleware([requireSession])
  .handler(async (): Promise<Insuree[]> => getOpenimisInsurees());

const FamilyIdInput = z.object({ familyId: z.string().min(1) });

export const fetchFamily = createServerFn({ method: "GET" })
  .middleware([requireSession])
  .inputValidator((data) => FamilyIdInput.parse(data))
  .handler(async ({ data }): Promise<Family | null> => getOpenimisFamily(data.familyId));

export const fetchFamilyMembers = createServerFn({ method: "GET" })
  .middleware([requireSession])
  .inputValidator((data) => FamilyIdInput.parse(data))
  .handler(async ({ data }): Promise<Insuree[]> => getOpenimisFamilyMembers(data.familyId));

const InsureeIdInput = z.object({ insureeId: z.string().min(1) });

export const fetchInsuree = createServerFn({ method: "GET" })
  .middleware([requireSession])
  .inputValidator((data) => InsureeIdInput.parse(data))
  .handler(async ({ data }): Promise<Insuree | null> => getOpenimisInsuree(data.insureeId));

const UpdateInsureeInput = z.object({
  uuid: z.string().min(1),
  chfId: z.string().min(1),
  lastName: z.string().min(1),
  otherNames: z.string().min(1),
  gender: z.enum(["M", "F"]),
  dob: z.string().min(1),
  head: z.boolean(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  currentAddress: z.string().nullable(),
});

export const updateInsuree = createServerFn({ method: "POST" })
  .middleware([requireSession])
  .inputValidator((data) => UpdateInsureeInput.parse(data))
  .handler(async ({ data }): Promise<void> => updateOpenimisInsuree(data));

const UpdateFamilyInput = z.object({
  uuid: z.string().min(1),
  address: z.string().nullable(),
  poverty: z.boolean(),
  confirmationNo: z.string().nullable(),
});

export const updateFamily = createServerFn({ method: "POST" })
  .middleware([requireSession])
  .inputValidator((data) => UpdateFamilyInput.parse(data))
  .handler(async ({ data }): Promise<void> => updateOpenimisFamily(data));

const CreateInsureeInput = z.object({
  chfId: z.string().min(1),
  lastName: z.string().min(1),
  otherNames: z.string().min(1),
  gender: z.enum(["M", "F"]),
  dob: z.string().min(1),
  head: z.boolean(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  currentAddress: z.string().nullable(),
});

export const createInsuree = createServerFn({ method: "POST" })
  .middleware([requireSession])
  .inputValidator((data) => CreateInsureeInput.parse(data))
  .handler(async ({ data }): Promise<void> => createOpenimisInsuree(data));

const CreateFamilyInput = z.object({
  address: z.string().nullable(),
  poverty: z.boolean(),
  confirmationNo: z.string().nullable(),
});

export const createFamily = createServerFn({ method: "POST" })
  .middleware([requireSession])
  .inputValidator((data) => CreateFamilyInput.parse(data))
  .handler(async ({ data }): Promise<void> => createOpenimisFamily(data));
