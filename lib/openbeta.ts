import { haversineKm } from "./geo";
import type { Area, OutdoorArea } from "./types";

export const OPENBETA_URL = process.env.OPENBETA_API_URL ?? "https://api.openbeta.io/";

const FULL_QUERY = /* GraphQL */ `
  query CragsNear($lnglat: Point, $maxDistance: Int) {
    cragsNear(lnglat: $lnglat, maxDistance: $maxDistance, includeCrags: true) {
      crags {
        uuid
        area_name
        totalClimbs
        pathTokens
        metadata { lat lng }
        aggregate { byDiscipline { sport { total } trad { total } bouldering { total } tr { total } } }
      }
    }
  }
`;

// Fallback with only long-standing fields, in case the schema drifts.
const MINIMAL_QUERY = /* GraphQL */ `
  query CragsNear($lnglat: Point, $maxDistance: Int) {
    cragsNear(lnglat: $lnglat, maxDistance: $maxDistance, includeCrags: true) {
      crags { uuid area_name totalClimbs metadata { lat lng } }
    }
  }
`;

interface RawCrag {
  uuid?: string;
  area_name?: string;
  totalClimbs?: number;
  pathTokens?: string[];
  metadata?: { lat?: number | null; lng?: number | null };
  aggregate?: {
    byDiscipline?: Partial<Record<"sport" | "trad" | "bouldering" | "tr", { total?: number } | null>>;
  };
}

interface RawResponse {
  data?: { cragsNear?: { crags?: RawCrag[] | null }[] | null };
  errors?: { message: string }[];
}

export function normalizeCrags(raw: RawResponse, area: Area): OutdoorArea[] {
  const seen = new Set<string>();
  const out: OutdoorArea[] = [];
  for (const bucket of raw.data?.cragsNear ?? []) {
    for (const c of bucket?.crags ?? []) {
      const lat = c.metadata?.lat;
      const lng = c.metadata?.lng;
      if (!c.uuid || seen.has(c.uuid) || typeof lat !== "number" || typeof lng !== "number") continue;
      seen.add(c.uuid);
      const d = c.aggregate?.byDiscipline ?? {};
      const distanceKm = haversineKm(area, { lat, lng });
      if (distanceKm > area.radiusKm) continue;
      out.push({
        id: c.uuid,
        name: c.area_name ?? "Unnamed area",
        lat,
        lng,
        path: (c.pathTokens ?? []).slice(0, -1),
        totalClimbs: c.totalClimbs ?? 0,
        disciplines: {
          sport: d.sport?.total ?? 0,
          trad: d.trad?.total ?? 0,
          boulder: d.bouldering?.total ?? 0,
          tr: d.tr?.total ?? 0,
        },
        distanceKm: Math.round(distanceKm * 10) / 10,
        url: `https://openbeta.io/area/${c.uuid}`,
      });
    }
  }
  return out.sort((a, b) => a.distanceKm - b.distanceKm);
}

async function post(query: string, area: Area, fetchImpl: typeof fetch): Promise<RawResponse> {
  const res = await fetchImpl(OPENBETA_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query,
      variables: { lnglat: { lat: area.lat, lng: area.lng }, maxDistance: Math.round(area.radiusKm * 1000) },
    }),
    next: { revalidate: 60 * 60 * 6 },
  } as RequestInit);
  if (!res.ok) throw new Error(`OpenBeta responded ${res.status}`);
  return (await res.json()) as RawResponse;
}

export async function fetchOutdoorAreas(area: Area, fetchImpl: typeof fetch = fetch): Promise<OutdoorArea[]> {
  let raw = await post(FULL_QUERY, area, fetchImpl);
  if (raw.errors?.length) raw = await post(MINIMAL_QUERY, area, fetchImpl);
  if (raw.errors?.length) throw new Error(raw.errors.map((e) => e.message).join("; "));
  return normalizeCrags(raw, area);
}
