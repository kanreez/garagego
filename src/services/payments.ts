import { Earnings, PayResult } from "../types/garage";
import { api } from "./api";

type PayInput =
  | { card_number: string; idempotency_key: string }
  | { wallet: true; idempotency_key: string }
  | { action_confirmed: true; idempotency_key: string };

export async function confirmPayment(paymentId: string, input: PayInput) {
  return api.post<PayResult>(`/api/payments/${paymentId}/confirm`, input);
}

export async function cancelBooking(bookingId: string) {
  return api.post<{ status: "cancelled"; refund: boolean; refunded_cents: number }>(`/api/bookings/${bookingId}/cancel`);
}

export async function hostEarnings() {
  return api.get<Earnings>("/api/host/earnings");
}

export const newIdempotencyKey = () => `pay-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
