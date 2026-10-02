"use client";

import { useState } from "react";
import { MAX_RADIUS_KM, MIN_RADIUS_KM, geocode, type GeocodeResult } from "@/lib/geo";
import type { Area } from "@/lib/types";

export default function AreaPicker({
  area,
  onChange,
  compact = false,
}: {
  area: Area | null;
  onChange: (a: Area) => void;
  compact?: boolean;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [radius, setRadius] = useState(area?.radiusKm ?? 25);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await geocode(q.trim());
      if (r.length === 0) setError("No places found.");
      if (r.length === 1) pick(r[0]);
      else setResults(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  };

  const pick = (r: GeocodeResult) => {
    setResults([]);
    setQ(r.label.split(",")[0]);
    onChange({ lat: r.lat, lng: r.lng, radiusKm: radius });
  };

  const locate = () => {
    if (!navigator.geolocation) return setError("Your browser doesn't share location.");
    setBusy(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setBusy(false);
        setQ("My location");
        onChange({ lat: p.coords.latitude, lng: p.coords.longitude, radiusKm: radius });
      },
      (err) => {
        setBusy(false);
        setError(err.message || "Couldn't get your location.");
      },
      { timeout: 10000 },
    );
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <form onSubmit={search} className="flex gap-2">
        <input
          className="input flex-1"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a city, crag or address"
          aria-label="Search location"
        />
        <button className="btn-primary" disabled={busy}>
          Search
        </button>
        <button type="button" className="btn-secondary" onClick={locate} disabled={busy} title="Use my location">
          📍
        </button>
      </form>
      {results.length > 1 && (
        <ul className="divide-y rounded-lg border bg-white text-sm shadow-sm">
          {results.map((r) => (
            <li key={`${r.lat},${r.lng}`}>
              <button type="button" className="w-full px-3 py-2 text-left hover:bg-stone-50" onClick={() => pick(r)}>
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className="flex items-center gap-3 text-sm">
        <span className="whitespace-nowrap text-stone-600">Within {radius} km</span>
        <input
          type="range"
          min={MIN_RADIUS_KM}
          max={MAX_RADIUS_KM}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          onPointerUp={() => area && onChange({ ...area, radiusKm: radius })}
          onKeyUp={() => area && onChange({ ...area, radiusKm: radius })}
          className="flex-1"
          aria-label="Search radius in km"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
