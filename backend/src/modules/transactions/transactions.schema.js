import { z } from "zod";

export const createTransactionSchema = z.object({
  body: z.object({
    senderId: z.coerce.number().int().positive("senderId must be a positive integer"),
    receiverId: z.coerce.number().int().positive("receiverId must be a positive integer"),
    amount: z.coerce.number().positive("amount must be > 0").max(10000000, "amount too large"),
    currencyFrom: z.string().trim().min(2).max(10).optional(),
    currencyTo: z.string().trim().min(2).max(10).optional(),
    note: z.string().trim().max(255).optional().nullable(),
  }),
});

export const idParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive("Invalid id"),
  }),
});

export const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    status: z.enum(["PENDING", "SUCCESS", "FAILED"]).optional(),
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

