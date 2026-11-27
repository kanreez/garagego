import { Booking, BookingMode, BusySlot, Checkout, Command, DoorAction, Garage, GarageInput, HostPhone, Review, SearchResult } from "../types/garage";
import { toLocalIso } from "../utils/booking";
import { api } from "./api";

export async function listGarages() {
  return (await api.get<{ garages: Garage[] }>("/api/garages")).garages;
}

export async function getGarage(id: string) {
  return api.get<{ garage: Garage; host_phone: HostPhone | null; busy: BusySlot[]; reviews: Review[] }>(`/api/garages/${id}`);
}

export async function searchGarages(query: string) {
  const now = new Date();
  return api.post<SearchResult>("/api/garages/search", {
    query,
    now_local: toLocalIso(now),
    tz_offset: now.getTimezoneOffset(),
    time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}

export async function myGarages() {
  return (await api.get<{ garages: Garage[] }>("/api/garages/mine")).garages;
}

export async function createGarage(input: GarageInput) {
  return (await api.post<{ garage: Garage }>("/api/garages", input)).garage;
}

export async function updateGarage(id: string, input: GarageInput) {
  return (await api.patch<{ garage: Garage }>(`/api/garages/${id}`, input)).garage;
}

export async function uploadGaragePhoto(base64: string) {
  return (await api.post<{ url: string }>("/api/uploads/garage-photo", { data: base64 })).url;
}

export async function setGarageHidden(id: string, hidden: boolean) {
  return (await api.put<{ garage: Garage }>(`/api/garages/${id}/visibility`, { hidden })).garage;
}

export async function deleteGarage(id: string) {
  await api.delete<{ deleted: true }>(`/api/garages/${id}`);
}

export async function createBooking(garageId: string, startsAt: Date, endsAt: Date, mode: BookingMode) {
  return api.post<Checkout>("/api/bookings", {
    garage_id: garageId,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    mode,
  });
}

export async function leaveEarly(bookingId: string) {
  return (await api.post<{ booking: Booking }>(`/api/bookings/${bookingId}/leave`)).booking;
}

export async function myBookings() {
  return (await api.get<{ bookings: Booking[] }>("/api/bookings/mine")).bookings;
}

export async function sendDoorCommand(garageId: string, action: DoorAction) {
  return (await api.post<{ command_id: string }>(`/api/garages/${garageId}/${action}`)).command_id;
}

export async function saveReview(bookingId: string, rating: number, comment: string) {
  return (await api.put<{ review: Review }>(`/api/bookings/${bookingId}/review`, { rating, comment })).review;
}

export async function getCommand(id: string) {
  return api.get<Command>(`/api/commands/${id}`);
}
