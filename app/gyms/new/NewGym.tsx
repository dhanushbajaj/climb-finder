"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import AreaMap from "@/components/map/AreaMapClient";
import { createGym, findGymByOsmId } from "@/lib/data";

export default function NewGym() {
  const router = useRouter();
  const p = useSearchParams();
  const osmId = p.get("osm");
  const [name, setName] = useState(p.get("name") ?? "");
  const [address, setAddress] = useState(p.get("address") ?? "");
  const [pos, setPos] = useState({ lat: Number(p.get("lat") ?? 45.4215), lng: Number(p.get("lng") ?? -75.6972) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A gym that's already registered for this OSM place: go straight to it.
  useEffect(() => {
    if (osmId) findGymByOsmId(osmId).then((g) => g && router.replace(`/gyms/${g.id}`));
  }, [osmId, router]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Name the gym.");
    setSaving(true);
    setError(null);
    try {
      const id = await createGym({ name: name.trim(), address: address.trim() || null, lat: pos.lat, lng: pos.lng, osmId });
      router.push(`/gyms/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the gym.");
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
      <form onSubmit={save} className="card h-fit space-y-3">
        <h1 className="text-xl font-semibold">Add a gym</h1>
        <label className="block text-sm">
          <span className="label">Name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block text-sm">
          <span className="label">Address (optional)</span>
          <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        <p className="text-xs text-stone-500">
          Location: {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)} — click the map to move it.
        </p>
        <button className="btn-primary w-full" disabled={saving}>
          {saving ? "Saving…" : "Save gym"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
      <div className="h-[50vh] lg:h-[70vh]">
        <AreaMap
          area={{ ...pos, radiusKm: 1 }}
          outdoor={[]}
          gyms={[{ id: "new", name: name || "New gym", address: null, lat: pos.lat, lng: pos.lng }]}
          osmGyms={[]}
          onPick={(lat, lng) => setPos({ lat, lng })}
        />
      </div>
    </div>
  );
}
