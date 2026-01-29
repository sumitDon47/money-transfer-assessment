import { api } from "./client";

// GET /transactions?page=&limit=&status=&from=&to=&senderId=&receiverId=
export const listTransactions = (params = {}) =>
  api.get("/transactions", { params }).then((r) => r.data);

// POST /transactions  (creates/queues)
export const createTransaction = (payload) =>
  api.post("/transactions", payload).then((r) => r.data);

// PATCH /transactions/:id/status
export const updateTransactionStatus = (id, status) =>
  api.patch(`/transactions/${id}/status`, { status }).then((r) => r.data);
