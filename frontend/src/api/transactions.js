// src/api/transactions.js
import { api } from "./client";

// GET /transactions?page=&limit=&status=&senderId=&receiverId=
export async function listTransactions(params = {}) {
  const { page = 1, limit = 10, status, senderId, receiverId } = params;

  const res = await api.get("/transactions", {
    params: {
      page,
      limit,
      ...(status ? { status } : {}),
      ...(Number.isFinite(Number(senderId)) ? { senderId: Number(senderId) } : {}),
      ...(Number.isFinite(Number(receiverId)) ? { receiverId: Number(receiverId) } : {}),
    },
  });

  return res.data; // { page, limit, total, data }
}

// POST /transactions  body: { senderId, receiverId, amountJPY, note }
export async function createTransaction(payload) {
  const res = await api.post("/transactions", payload);
  return res.data; // could be {message:"Queued"...} OR inserted row depending on your backend mode
}

// Optional: PATCH /transactions/:id/status  body: { status }
export async function updateTransactionStatus(id, status) {
  const res = await api.patch(`/transactions/${id}/status`, { status });
  return res.data;
}
