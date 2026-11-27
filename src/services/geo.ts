import { getLang } from "../i18n";
import { Coords } from "../utils/location";
import { api } from "./api";

export type GeoPlace = {
  label: string;
  address: string | null;
  district: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
};

export async function searchAddress(q: string, city: string) {
  const params = new URLSearchParams({ q, city, lang: getLang() });
  return api.get<{ results: GeoPlace[]; unavailable?: boolean }>(`/api/geo/search?${params}`);
}

export async function reverseGeocode(coords: Coords) {
  const params = new URLSearchParams({ lat: String(coords.latitude), lng: String(coords.longitude), lang: getLang() });
  return api.get<{ result: GeoPlace | null; unavailable?: boolean }>(`/api/geo/reverse?${params}`);
}
