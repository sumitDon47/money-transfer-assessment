import { z } from "zod";

export const createTransactionSchema = z.object({
  body: z.object({
    senderId: z.coerce
      .number()
      .int()
      .positive("senderId must be a positive integer"),

    receiverId: z.coerce
      .number()
      .int()
      .positive("receiverId must be a positive integer"),

    //amount is in JPY
    amountJPY: z.coerce
      .number()
      .positive("amountJPY must be > 0")
      .max(10000000, "amountJPY too large"),

    note: z.string().trim().max(255).optional().nullable(),
  }),
});

export const idParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive("Invalid id"),
  }),
});

const dateOrIso = z
  .string()
  .trim()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid date");

export const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    status: z.enum(["PENDING", "SUCCESS", "FAILED"]).optional(),

    senderId: z.coerce.number().int().positive().optional(),
    receiverId: z.coerce.number().int().positive().optional(),

    from: dateOrIso.optional(), //accepts 2026-01-26 OR full ISO
    to: dateOrIso.optional(),

    q: z.string().trim().max(100).optional(),
  }),
});

export const updateStatusSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive("Invalid id"),
  }),
  body: z.object({
    status: z.enum(["SUCCESS", "FAILED"]),
  }),
});