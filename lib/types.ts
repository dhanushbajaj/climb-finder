import type { Wall } from "./holds";

export interface Gym {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  /** OpenStreetMap element id when the gym came from OSM, e.g. "node/123" */
  osmId?: string | null;
  distanceKm?: number;
  climbCount?: number;
}

export interface Climb {
  id: string;
  name: string;
  grade: string | null;
  gymId: string | null;
  wall: Wall;
  /** public URL (Supabase Storage) or data: URL (local) of the wall photo */
  photoUrl: string | null;
  createdBy: string | null;
  createdAt: string;
  /** true when the climb only lives in this browser */
  local?: boolean;
}

export interface OutdoorArea {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** breadcrumb, e.g. ["USA", "Colorado", "Boulder Canyon"] */
  path: string[];
  totalClimbs: number;
  disciplines: { sport: number; trad: number; boulder: number; tr: number };
  distanceKm: number;
  url: string;
}

export interface OsmGym {
  osmId: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  website: string | null;
  distanceKm: number;
}

export interface Area {
  lat: number;
  lng: number;
  radiusKm: number;
}
