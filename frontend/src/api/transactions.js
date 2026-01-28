import { api } from "./client";

export async function listTransactions(params = {}) {
  const { data } = await api.get("/transactions", { params });
  return data;
}

// Your backend expects amountJPY now
export async function createTransaction(payload) {
  const { data } = await api.post("/transactions", payload);
  return data;
}

export async function updateTransactionStatus(id, status) {
  const { data } = await api.patch(`/transactions/${id}/status`, { status });
  return data;
}
