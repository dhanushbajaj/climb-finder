"use client";

import { haversineKm } from "./geo";
import type { Wall } from "./holds";
import type { Climber } from "./solver/types";
import { getSupabase } from "./supabase/client";
import type { Area, Climb, Gym } from "./types";

/*
 * Data access for the browser. With Supabase configured everything goes to the database;
 * otherwise (or for a signed-out user saving a climb) it falls back to localStorage, and
 * those records get ids starting with "local-".
 */

const LOCAL_CLIMBS = "climb-finder:climbs";
const LOCAL_GYMS = "climb-finder:gyms";
const LOCAL_CLIMBER = "climb-finder:climber";

export const DEFAULT_CLIMBER: Climber = { heightCm: 175, apeIndexCm: 0 };

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    throw new Error(`Couldn't save in this browser (${e instanceof Error ? e.message : "storage unavailable"}).`);
  }
}

const localId = () => `local-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
export const isLocalId = (id: string) => id.startsWith("local-");

// --- auth -----------------------------------------------------------------

export async function getUserId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}

// --- climber profile ------------------------------------------------------

export async function loadClimber(): Promise<Climber> {
  const local = readLocal<Climber>(LOCAL_CLIMBER, DEFAULT_CLIMBER);
  const sb = getSupabase();
  const uid = await getUserId();
  if (!sb || !uid) return local;
  const { data } = await sb.from("profiles").select("height_cm, ape_index_cm").eq("id", uid).maybeSingle();
  if (!data) return local;
  return { heightCm: Number(data.height_cm), apeIndexCm: Number(data.ape_index_cm) };
}

export async function saveClimber(c: Climber, displayName?: string): Promise<void> {
  writeLocal(LOCAL_CLIMBER, c);
  const sb = getSupabase();
  const uid = await getUserId();
  if (!sb || !uid) return;
  const { error } = await sb.from("profiles").upsert({
    id: uid,
    height_cm: c.heightCm,
    ape_index_cm: c.apeIndexCm,
    ...(displayName !== undefined ? { display_name: displayName } : {}),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

// --- gyms -----------------------------------------------------------------

interface GymRow {
  id: string;
  name: string;
  address: string | null;
  osm_id: string | null;
  lat: number;
  lng: number;
  distance_km?: number;
  climb_count?: number;
}

const gymFromRow = (r: GymRow): Gym => ({
  id: r.id,
  name: r.name,
  address: r.address,
  osmId: r.osm_id,
  lat: r.lat,
  lng: r.lng,
  distanceKm: r.distance_km !== undefined ? Math.round(r.distance_km * 10) / 10 : undefined,
  climbCount: r.climb_count !== undefined ? Number(r.climb_count) : undefined,
});

export async function listNearbyGyms(area: Area): Promise<Gym[]> {
  const local = readLocal<Gym[]>(LOCAL_GYMS, [])
    .map((g) => ({ ...g, distanceKm: Math.round(haversineKm(area, g) * 10) / 10 }))
    .filter((g) => g.distanceKm <= area.radiusKm)
    .map((g) => ({ ...g, climbCount: readLocal<Climb[]>(LOCAL_CLIMBS, []).filter((c) => c.gymId === g.id).length }));
  const sb = getSupabase();
  if (!sb) return local;
  const { data, error } = await sb.rpc("nearby_gyms", { lat: area.lat, lng: area.lng, radius_km: area.radiusKm });
  if (error) throw new Error(error.message);
  return [...(data as GymRow[]).map(gymFromRow), ...local];
}

export async function getGym(id: string): Promise<Gym | null> {
  if (isLocalId(id)) return readLocal<Gym[]>(LOCAL_GYMS, []).find((g) => g.id === id) ?? null;
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("gyms_view").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? gymFromRow(data as GymRow) : null;
}

export async function findGymByOsmId(osmId: string): Promise<Gym | null> {
  const local = readLocal<Gym[]>(LOCAL_GYMS, []).find((g) => g.osmId === osmId);
  if (local) return local;
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from("gyms_view").select("*").eq("osm_id", osmId).maybeSingle();
  return data ? gymFromRow(data as GymRow) : null;
}

export async function createGym(g: Omit<Gym, "id">): Promise<string> {
  const sb = getSupabase();
  const uid = await getUserId();
  if (sb && uid) {
    const { data, error } = await sb
      .from("gyms")
      .insert({ name: g.name, address: g.address, osm_id: g.osmId ?? null, location: `POINT(${g.lng} ${g.lat})` })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data.id as string;
  }
  const gym: Gym = { ...g, id: localId() };
  writeLocal(LOCAL_GYMS, [...readLocal<Gym[]>(LOCAL_GYMS, []), gym]);
  return gym.id;
}

// --- climbs ---------------------------------------------------------------

interface ClimbRow {
  id: string;
  gym_id: string | null;
  name: string;
  grade: string | null;
  wall_width_cm: number;
  wall_height_cm: number;
  wall_angle_deg: number;
  holds: Wall["holds"];
  photo_path: string | null;
  created_by: string | null;
  created_at: string;
}

function climbFromRow(r: ClimbRow): Climb {
  const sb = getSupabase();
  return {
    id: r.id,
    name: r.name,
    grade: r.grade,
    gymId: r.gym_id,
    wall: {
      widthCm: Number(r.wall_width_cm),
      heightCm: Number(r.wall_height_cm),
      angleDeg: Number(r.wall_angle_deg),
      holds: r.holds,
    },
    photoUrl: r.photo_path && sb ? sb.storage.from("wall-photos").getPublicUrl(r.photo_path).data.publicUrl : null,
    createdBy: r.created_by,
    createdAt: r.created_at,
  };
}

export async function listGymClimbs(gymId: string): Promise<Climb[]> {
  const local = readLocal<Climb[]>(LOCAL_CLIMBS, []).filter((c) => c.gymId === gymId);
  const sb = getSupabase();
  if (!sb || isLocalId(gymId)) return local;
  const { data, error } = await sb.from("climbs").select("*").eq("gym_id", gymId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return [...(data as ClimbRow[]).map(climbFromRow), ...local];
}

export function listLocalClimbs(): Climb[] {
  return readLocal<Climb[]>(LOCAL_CLIMBS, []);
}

export async function listMyClimbs(): Promise<Climb[]> {
  const sb = getSupabase();
  const uid = await getUserId();
  if (!sb || !uid) return [];
  const { data, error } = await sb.from("climbs").select("*").eq("created_by", uid).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ClimbRow[]).map(climbFromRow);
}

export async function getClimb(id: string): Promise<Climb | null> {
  if (isLocalId(id)) return readLocal<Climb[]>(LOCAL_CLIMBS, []).find((c) => c.id === id) ?? null;
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("climbs").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? climbFromRow(data as ClimbRow) : null;
}

export interface NewClimb {
  name: string;
  grade: string | null;
  gymId: string | null;
  wall: Wall;
  /** a data: URL of the (downscaled) wall photo */
  photoDataUrl: string | null;
}

/** Saves to Supabase when signed in, otherwise to this browser. Returns the new id. */
export async function saveClimb(c: NewClimb): Promise<string> {
  const sb = getSupabase();
  const uid = await getUserId();
  if (sb && uid && !(c.gymId && isLocalId(c.gymId))) {
    let photoPath: string | null = null;
    if (c.photoDataUrl) {
      const blob = await (await fetch(c.photoDataUrl)).blob();
      photoPath = `${uid}/${crypto.randomUUID()}.jpg`;
      const { error } = await sb.storage.from("wall-photos").upload(photoPath, blob, { contentType: "image/jpeg" });
      if (error) throw new Error(`Photo upload failed: ${error.message}`);
    }
    const { data, error } = await sb
      .from("climbs")
      .insert({
        name: c.name,
        grade: c.grade,
        gym_id: c.gymId,
        wall_width_cm: c.wall.widthCm,
        wall_height_cm: c.wall.heightCm,
        wall_angle_deg: c.wall.angleDeg,
        holds: c.wall.holds,
        photo_path: photoPath,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data.id as string;
  }
  const climb: Climb = {
    id: localId(),
    name: c.name,
    grade: c.grade,
    gymId: c.gymId,
    wall: c.wall,
    photoUrl: c.photoDataUrl,
    createdBy: null,
    createdAt: new Date().toISOString(),
    local: true,
  };
  writeLocal(LOCAL_CLIMBS, [climb, ...readLocal<Climb[]>(LOCAL_CLIMBS, [])]);
  return climb.id;
}

export async function deleteClimb(id: string): Promise<void> {
  if (isLocalId(id)) {
    writeLocal(LOCAL_CLIMBS, readLocal<Climb[]>(LOCAL_CLIMBS, []).filter((c) => c.id !== id));
    return;
  }
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("climbs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
