import Constants from "expo-constants";
import { Platform } from "react-native";
import { translateError } from "../i18n/errors";
import { supabase } from "./supabase";

const devHost =
  Platform.OS === "web" && typeof window !== "undefined"
    ? window.location.hostname
    : Constants.expoConfig?.hostUri?.split(":")[0];
const sameOrigin = Platform.OS === "web" && !__DEV__ && typeof window !== "undefined" ? window.location.origin : null;
const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || sameOrigin || (devHost ? `http://${devHost}:3000` : "http://localhost:3000");

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(translateError(body.error ?? `Request failed (${res.status})`));
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};