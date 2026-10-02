import { NextResponse, type NextRequest } from "next/server";
import { parseArea } from "@/lib/geo";
import { fetchOutdoorAreas } from "@/lib/openbeta";

/** Outdoor crags near ?lat&lng&r (km), from OpenBeta. */
export async function GET(request: NextRequest) {
  const area = parseArea(request.nextUrl.searchParams);
  if (!area) return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  try {
    const areas = await fetchOutdoorAreas(area);
    return NextResponse.json({ areas }, { headers: { "cache-control": "public, s-maxage=21600" } });
  } catch (e) {
    return NextResponse.json(
      { error: `Couldn't load outdoor climbs: ${e instanceof Error ? e.message : "unknown error"}` },
      { status: 502 },
    );
  }
}
