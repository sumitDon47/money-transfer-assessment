import { api } from "./client";

export async function listReceivers(params = {}) {
  const { data } = await api.get("/receivers", { params });
  return data;
}

export async function createReceiver(payload) {
  const { data } = await api.post("/receivers", payload);
  return data;
}

export async function updateReceiver(id, payload) {
  const { data } = await api.put(`/receivers/${id}`, payload);
  return data;
}

export async function deleteReceiver(id) {
  const { data } = await api.delete(`/receivers/${id}`);
  return data;
}
