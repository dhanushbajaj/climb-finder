import { haversineKm } from "./geo";
import type { Area, OsmGym } from "./types";

export const OVERPASS_URL = process.env.OVERPASS_API_URL ?? "https://overpass-api.de/api/interpreter";

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export function overpassQuery(area: Area): string {
  const r = Math.round(area.radiusKm * 1000);
  const around = `(around:${r},${area.lat},${area.lng})`;
  // Indoor climbing gyms are usually sport=climbing on a sports/fitness centre.
  return `[out:json][timeout:20];
(
  nwr["sport"~"climbing|bouldering"]["leisure"~"sports_centre|fitness_centre|sports_hall"]${around};
  nwr["sport"~"climbing|bouldering"]["indoor"="yes"]${around};
);
out center tags 200;`;
}

export function normalizeOsm(elements: OverpassElement[], area: Area): OsmGym[] {
  const out: OsmGym[] = [];
  const seen = new Set<string>();
  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    const name = el.tags?.name;
    if (lat === undefined || lng === undefined || !name) continue;
    const osmId = `${el.type}/${el.id}`;
    if (seen.has(osmId)) continue;
    seen.add(osmId);
    const t = el.tags ?? {};
    const street = [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ");
    const address = [street, t["addr:city"]].filter(Boolean).join(", ") || null;
    out.push({
      osmId,
      name,
      lat,
      lng,
      address,
      website: t.website ?? t["contact:website"] ?? null,
      distanceKm: Math.round(haversineKm(area, { lat, lng }) * 10) / 10,
    });
  }
  return out.sort((a, b) => a.distanceKm - b.distanceKm);
}

export async function fetchOsmGyms(area: Area, fetchImpl: typeof fetch = fetch): Promise<OsmGym[]> {
  const res = await fetchImpl(OVERPASS_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ data: overpassQuery(area) }).toString(),
    next: { revalidate: 60 * 60 * 24 },
  } as RequestInit);
  if (!res.ok) throw new Error(`Overpass responded ${res.status}`);
  const json = (await res.json()) as { elements?: OverpassElement[] };
  return normalizeOsm(json.elements ?? [], area);
}
