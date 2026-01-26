import { z } from "zod";

const phoneSchema = z
  .string()
  .trim()
  .min(7, "phone is too short")
  .max(20, "phone is too long")
  .regex(/^[0-9+\-\s()]+$/, "phone contains invalid characters");

export const createSenderSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2, "fullName is required").max(120),
    phone: phoneSchema.optional().nullable(),
    address: z.string().trim().max(255).optional().nullable(),
    country: z.string().trim().max(60).optional().nullable(),
  }),
});

export const updateSenderSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive("Invalid id"),
  }),
  body: z
    .object({
      fullName: z.string().trim().min(2).max(120).optional(),
      phone: phoneSchema.optional().nullable(),
      address: z.string().trim().max(255).optional().nullable(),
      country: z.string().trim().max(60).optional().nullable(),
    })
    .refine((obj) => Object.keys(obj).length > 0, "At least one field is required"),
});

export const idParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive("Invalid id"),
  }),
});

export const listSchema = z.object({
  query: z.object({
    q: z.string().trim().max(80).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  }),
});
