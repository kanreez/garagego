import { api } from "./api";

export type Phone = { number: string; public: boolean };

export type Me = {
  user: { id: string; email: string };
  profile: { username: string | null; full_name: string | null } | null;
  phone: Phone | null;
};

export const getMe = () => api.get<Me>("/api/me");

export const checkUsername = (name: string) =>
  api.get<{ available: boolean; problem: string | null }>(`/api/usernames/check?name=${encodeURIComponent(name)}`);

export async function savePhone(phone: string, isPublic: boolean) {
  return (await api.put<{ phone: Phone }>("/api/me/phone", { phone, public: isPublic })).phone;
}

export async function saveUsername(username: string) {
  return (await api.put<{ username: string }>("/api/me/username", { username })).username;
}
