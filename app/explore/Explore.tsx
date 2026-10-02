"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AreaMap from "@/components/map/AreaMapClient";
import AreaPicker from "@/components/map/AreaPicker";
import { listNearbyGyms } from "@/lib/data";
import { areaQuery, parseArea } from "@/lib/geo";
import type { Area, Gym, OsmGym, OutdoorArea } from "@/lib/types";

type Tab = "outdoor" | "indoor";
type Discipline = "sport" | "trad" | "boulder" | "tr";
const DISCIPLINES: { key: Discipline; label: string }[] = [
  { key: "boulder", label: "Boulder" },
  { key: "sport", label: "Sport" },
  { key: "trad", label: "Trad" },
  { key: "tr", label: "Top rope" },
];

interface Loadable<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

/** Loads `key` with `load`; results are tagged with their key so stale ones read as loading. */
function useLoad<T>(key: string | null, load: () => Promise<T>, empty: T): Loadable<T> {
  const [state, setState] = useState<{ key: string; data: T; error: string | null } | null>(null);
  useEffect(() => {
    if (!key) return;
    let alive = true;
    load()
      .then((data) => alive && setState({ key, data, error: null }))
      .catch((e: Error) => alive && setState({ key, data: empty, error: e.message }));
    return () => {
      alive = false;
    };
    // `load` is derived from `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!key) return { data: empty, loading: false, error: null };
  if (state?.key !== key) return { data: empty, loading: true, error: null };
  return { data: state.data, loading: false, error: state.error };
}

async function getJson<T>(url: string, pick: (j: unknown) => T): Promise<T> {
  const r = await fetch(url);
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? `Request failed (${r.status})`);
  return pick(j);
}

const NO_AREAS: OutdoorArea[] = [];
const NO_OSM: OsmGym[] = [];
const NO_GYMS: Gym[] = [];

export default function Explore() {
  const router = useRouter();
  const params = useSearchParams();
  const area = useMemo(() => parseArea(params), [params]);
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) ?? "outdoor");
  const [filters, setFilters] = useState<Set<Discipline>>(new Set());
  const [focus, setFocus] = useState<string | null>(null);

  const q = area ? areaQuery(area) : null;
  const outdoor = useLoad(q, () => getJson(`/api/outdoor?${q}`, (j) => (j as { areas: OutdoorArea[] }).areas), NO_AREAS);
  const osm = useLoad(q, () => getJson(`/api/gyms-osm?${q}`, (j) => (j as { gyms: OsmGym[] }).gyms), NO_OSM);
  const gyms = useLoad(q, () => listNearbyGyms(area!), NO_GYMS);

  const setArea = (a: Area) => router.replace(`/explore?${areaQuery(a)}`, { scroll: false });

  const outdoorShown = outdoor.data.filter((a) => filters.size === 0 || [...filters].some((d) => a.disciplines[d] > 0));
  // OSM gyms that are already registered show up once, as the registered gym.
  const claimed = new Set(gyms.data.map((g) => g.osmId).filter(Boolean));
  const osmShown = osm.data.filter((g) => !claimed.has(g.osmId));

  if (!area) {
    return (
      <div className="card mx-auto max-w-xl space-y-3">
        <h1 className="text-xl font-semibold">Where do you want to climb?</h1>
        <AreaPicker area={null} onChange={setArea} />
        <p className="text-xs text-stone-500">Tip: you can also click anywhere on the map once it&apos;s open to move the search there.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="card">
          <AreaPicker area={area} onChange={setArea} compact />
        </div>
        <div className="flex gap-1 rounded-lg bg-stone-200 p-1 text-sm" role="tablist">
          {(["outdoor", "indoor"] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-md py-1.5 font-medium capitalize ${tab === t ? "bg-white shadow-sm" : "text-stone-600"}`}
            >
              {t} ({t === "outdoor" ? outdoorShown.length : gyms.data.length + osmShown.length})
            </button>
          ))}
        </div>

        {tab === "outdoor" ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {DISCIPLINES.map((d) => (
                <button
                  key={d.key}
                  className={`chip ${filters.has(d.key) ? "chip-on" : ""}`}
                  aria-pressed={filters.has(d.key)}
                  onClick={() => {
                    const next = new Set(filters);
                    if (next.has(d.key)) next.delete(d.key);
                    else next.add(d.key);
                    setFilters(next);
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <Status loading={outdoor.loading} error={outdoor.error} empty={outdoorShown.length === 0} emptyText="No outdoor crags found here. Try a bigger radius." />
            <ul className="space-y-2" data-testid="outdoor-list">
              {outdoorShown.map((a) => (
                <li key={a.id} className={`card !p-3 ${focus === `o:${a.id}` ? "ring-2 ring-green-500" : ""}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <a href={a.url} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
                      {a.name}
                    </a>
                    <span className="shrink-0 text-xs text-stone-500">{a.distanceKm} km</span>
                  </div>
                  {a.path.length > 0 && <p className="truncate text-xs text-stone-500">{a.path.join(" › ")}</p>}
                  <p className="mt-1 text-xs text-stone-600">
                    {a.totalClimbs} climbs
                    {DISCIPLINES.filter((d) => a.disciplines[d.key] > 0).map((d) => ` · ${a.disciplines[d.key]} ${d.label.toLowerCase()}`)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="space-y-2">
            <Link href={`/gyms/new?lat=${area.lat}&lng=${area.lng}`} className="btn-secondary w-full">
              + Add a gym that&apos;s missing
            </Link>
            <Status
              loading={gyms.loading || osm.loading}
              error={gyms.error ?? osm.error}
              empty={gyms.data.length + osmShown.length === 0}
              emptyText="No indoor gyms found here yet."
            />
            <ul className="space-y-2" data-testid="indoor-list">
              {gyms.data.map((g) => (
                <li key={g.id} className={`card !p-3 ${focus === `g:${g.id}` ? "ring-2 ring-blue-500" : ""}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <Link href={`/gyms/${g.id}`} className="font-semibold hover:underline">
                      {g.name}
                    </Link>
                    <span className="shrink-0 text-xs text-stone-500">{g.distanceKm} km</span>
                  </div>
                  <p className="text-xs text-stone-600">
                    {g.climbCount ?? 0} climbs added{g.address ? ` · ${g.address}` : ""}
                  </p>
                </li>
              ))}
              {osmShown.map((g) => (
                <li key={g.osmId} className={`card !p-3 ${focus === `m:${g.osmId}` ? "ring-2 ring-blue-500" : ""}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold">{g.name}</span>
                    <span className="shrink-0 text-xs text-stone-500">{g.distanceKm} km</span>
                  </div>
                  <p className="text-xs text-stone-600">{g.address ?? "From OpenStreetMap"}</p>
                  <Link
                    className="mt-1 inline-block text-xs font-medium text-orange-700 hover:underline"
                    href={`/gyms/new?${new URLSearchParams({
                      name: g.name,
                      lat: String(g.lat),
                      lng: String(g.lng),
                      osm: g.osmId,
                      ...(g.address ? { address: g.address } : {}),
                    })}`}
                  >
                    Add climbs here →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="h-[60vh] lg:sticky lg:top-20 lg:h-[calc(100vh-8rem)]">
        <AreaMap
          area={area}
          outdoor={tab === "outdoor" ? outdoorShown : []}
          gyms={tab === "indoor" ? gyms.data : []}
          osmGyms={tab === "indoor" ? osmShown : []}
          onPick={(lat, lng) => setArea({ lat, lng, radiusKm: area.radiusKm })}
          onSelect={setFocus}
        />
      </div>
    </div>
  );
}

function Status({ loading, error, empty, emptyText }: { loading: boolean; error: string | null; empty: boolean; emptyText: string }) {
  if (loading) return <p className="text-sm text-stone-500" role="status">Loading…</p>;
  if (error) return <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>;
  if (empty) return <p className="text-sm text-stone-500">{emptyText}</p>;
  return null;
}
