import { api } from "./client";

export async function requestOtp(email) {
  const { data } = await api.post("/auth/request-otp", { email });
  return data;
}

export async function verifyOtp(email, otp) {
  const { data } = await api.post("/auth/verify-otp", { email, otp });
  return data;
}
