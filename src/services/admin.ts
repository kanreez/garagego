import { api } from "./api";

export type AdminOverview = {
  users: number;
  blocked: number;
  garages: number;
  hidden: number;
  bookings_today: number;
  active_now: number;
  revenue_cents: number;
  fee_cents: number;
};

export type AdminGarage = {
  id: string;
  title: string;
  city: string | null;
  area: string | null;
  address: string | null;
  access: "app" | "manual";
  hidden: boolean;
  created_at: string;
  host_id: string | null;
  host_name: string | null;
  host_username: string | null;
  ongoing: number;
  device_last_seen: string | null;
  device_online: boolean;
};

export type AdminUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  phone: string | null;
  created_at: string;
  blocked: boolean;
  admin: boolean;
  garages: number;
};

export type AdminReview = {
  id: string;
  rating: number;
  comment: string | null;
  author_name: string;
  created_at: string;
  garage_id: string;
  garage_title: string | null;
};

export const adminOverview = () => api.get<AdminOverview>("/api/admin/overview");
export const adminGarages = async () => (await api.get<{ garages: AdminGarage[] }>("/api/admin/garages")).garages;
export const adminUsers = async () => (await api.get<{ users: AdminUser[] }>("/api/admin/users")).users;
export const adminReviews = async () => (await api.get<{ reviews: AdminReview[] }>("/api/admin/reviews")).reviews;

export const adminSetGarageHidden = (id: string, hidden: boolean) => api.put<{ hidden: boolean }>(`/api/admin/garages/${id}/visibility`, { hidden });
export const adminDeleteGarage = (id: string) => api.delete<{ deleted: boolean }>(`/api/admin/garages/${id}`);
export const adminSetBlocked = (id: string, blocked: boolean) => api.put<{ blocked: boolean }>(`/api/admin/users/${id}/block`, { blocked });
export const adminDeleteUser = (id: string, confirm: string) => api.delete<{ deleted: boolean }>(`/api/admin/users/${id}`, { confirm });
export const adminDeleteReview = (id: string) => api.delete<{ deleted: boolean }>(`/api/admin/reviews/${id}`);
