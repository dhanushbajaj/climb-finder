import { describe, expect, it } from "vitest";
import { parseArea } from "@/lib/geo";
import { fetchOutdoorAreas, normalizeCrags } from "@/lib/openbeta";
import { normalizeOsm, overpassQuery } from "@/lib/osm";

const area = { lat: 40.0, lng: -105.3, radiusKm: 30 };

describe("parseArea", () => {
  it("validates and clamps", () => {
    expect(parseArea(new URLSearchParams("lat=40&lng=-105&r=500"))).toEqual({ lat: 40, lng: -105, radiusKm: 100 });
    expect(parseArea(new URLSearchParams("lat=40"))).toBeNull();
    expect(parseArea(new URLSearchParams("lat=91&lng=0"))).toBeNull();
    expect(parseArea({ lat: "1", lng: "2" })).toEqual({ lat: 1, lng: 2, radiusKm: 25 });
  });
});

describe("OpenBeta", () => {
  const raw = {
    data: {
      cragsNear: [
        {
          crags: [
            {
              uuid: "u1",
              area_name: "Near Crag",
              totalClimbs: 10,
              pathTokens: ["USA", "Colorado", "Near Crag"],
              metadata: { lat: 40.01, lng: -105.29 },
              aggregate: { byDiscipline: { sport: { total: 7 }, trad: { total: 3 }, bouldering: null } },
            },
            { uuid: "u2", area_name: "No coords", metadata: { lat: null, lng: null } },
          ],
        },
        {
          crags: [
            { uuid: "u1", area_name: "Duplicate", metadata: { lat: 40.01, lng: -105.29 } },
            { uuid: "u3", area_name: "Far Crag", totalClimbs: 1, metadata: { lat: 41.5, lng: -105.3 } },
          ],
        },
      ],
    },
  };

  it("normalizes, dedupes and drops out-of-radius crags", () => {
    const out = normalizeCrags(raw, area);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      id: "u1",
      name: "Near Crag",
      path: ["USA", "Colorado"],
      disciplines: { sport: 7, trad: 3, boulder: 0, tr: 0 },
      url: "https://openbeta.io/area/u1",
    });
    expect(out[0].distanceKm).toBeLessThan(2);
  });

  it("falls back to the minimal query on schema errors", async () => {
    const bodies: string[] = [];
    const fake = (async (_url: string, init: RequestInit) => {
      bodies.push(String(init.body));
      const json = bodies.length === 1 ? { errors: [{ message: "Cannot query field aggregate" }] } : raw;
      return new Response(JSON.stringify(json), { status: 200 });
    }) as unknown as typeof fetch;
    const out = await fetchOutdoorAreas(area, fake);
    expect(bodies).toHaveLength(2);
    expect(JSON.parse(bodies[0]).variables).toEqual({ lnglat: { lat: 40, lng: -105.3 }, maxDistance: 30000 });
    expect(bodies[1]).not.toContain("aggregate");
    expect(out.map((a) => a.id)).toEqual(["u1"]);
  });
});

describe("OSM gyms", () => {
  it("builds an around query and normalizes elements", () => {
    expect(overpassQuery(area)).toContain("around:30000,40,-105.3");
    const out = normalizeOsm(
      [
        { type: "way", id: 5, center: { lat: 40.02, lon: -105.28 }, tags: { name: "Rock Gym", "addr:street": "Pearl St", "addr:housenumber": "12", "addr:city": "Boulder" } },
        { type: "node", id: 6, lat: 40.0, lon: -105.3 },
      ],
      area,
    );
    expect(out).toEqual([
      { osmId: "way/5", name: "Rock Gym", lat: 40.02, lng: -105.28, address: "12 Pearl St, Boulder", website: null, distanceKm: expect.any(Number) },
    ]);
  });
});
