import { api } from "./client";

export async function listSenders(params = {}) {
  const { data } = await api.get("/senders", { params });
  return data;
}

export async function createSender(payload) {
  const { data } = await api.post("/senders", payload);
  return data;
}

export async function updateSender(id, payload) {
  const { data } = await api.put(`/senders/${id}`, payload);
  return data;
}

export async function deleteSender(id) {
  const { data } = await api.delete(`/senders/${id}`);
  return data;
}
