import { NextResponse, type NextRequest } from "next/server";
import { parseArea } from "@/lib/geo";
import { fetchOsmGyms } from "@/lib/osm";

/** Indoor climbing gyms near ?lat&lng&r (km), from OpenStreetMap. */
export async function GET(request: NextRequest) {
  const area = parseArea(request.nextUrl.searchParams);
  if (!area) return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  try {
    const gyms = await fetchOsmGyms(area);
    return NextResponse.json({ gyms }, { headers: { "cache-control": "public, s-maxage=86400" } });
  } catch (e) {
    return NextResponse.json(
      { error: `Couldn't load gyms from OpenStreetMap: ${e instanceof Error ? e.message : "unknown error"}` },
      { status: 502 },
    );
  }
}
