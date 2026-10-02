import type { Area } from "./types";

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const MIN_RADIUS_KM = 1;
export const MAX_RADIUS_KM = 100;

/** Reads and validates ?lat&lng&r. Returns null when the area is missing or invalid. */
export function parseArea(params: URLSearchParams | Record<string, string | string[] | undefined>): Area | null {
  const get = (k: string) => {
    const v = params instanceof URLSearchParams ? params.get(k) : params[k];
    return Array.isArray(v) ? v[0] : v ?? null;
  };
  const lat = Number(get("lat"));
  const lng = Number(get("lng"));
  const r = Number(get("r") ?? 25);
  if (!get("lat") || !get("lng") || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const radiusKm = Number.isFinite(r) ? Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, r)) : 25;
  return { lat, lng, radiusKm };
}

export function areaQuery(a: Area): string {
  return new URLSearchParams({ lat: a.lat.toFixed(5), lng: a.lng.toFixed(5), r: String(a.radiusKm) }).toString();
}

export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

/** Place search via OpenStreetMap Nominatim (called from the browser; light use only). */
export async function geocode(q: string): Promise<GeocodeResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const rows = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return rows.map((r) => ({ label: r.display_name, lat: Number(r.lat), lng: Number(r.lon) }));
}
