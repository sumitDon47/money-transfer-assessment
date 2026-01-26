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

    // ✅ Day 6: amount is in JPY
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

export const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    status: z.enum(["PENDING", "SUCCESS", "FAILED"]).optional(),

    // (optional but recommended for Day 6 reports)
    from: z.string().trim().optional(),      // YYYY-MM-DD
    to: z.string().trim().optional(),        // YYYY-MM-DD
    senderId: z.coerce.number().int().positive().optional(),
    receiverId: z.coerce.number().int().positive().optional(),
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