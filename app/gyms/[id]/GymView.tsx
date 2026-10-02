"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ClimbCard from "@/components/ui/ClimbCard";
import { getGym, listGymClimbs } from "@/lib/data";
import type { Climb, Gym } from "@/lib/types";

export default function GymView({ id }: { id: string }) {
  const [gym, setGym] = useState<Gym | null | undefined>(undefined);
  const [climbs, setClimbs] = useState<Climb[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getGym(id), listGymClimbs(id)])
      .then(([g, c]) => {
        setGym(g);
        setClimbs(c);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (gym === undefined) return <p className="text-stone-500">Loading…</p>;
  if (gym === null) return <p>Gym not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{gym.name}</h1>
          {gym.address && <p className="text-stone-600">{gym.address}</p>}
          <a
            className="text-sm text-stone-500 underline"
            href={`https://www.openstreetmap.org/?mlat=${gym.lat}&mlon=${gym.lng}#map=17/${gym.lat}/${gym.lng}`}
            target="_blank"
            rel="noreferrer"
          >
            Map ↗
          </a>
        </div>
        <div className="flex gap-2">
          <Link href={`/climbs/new/camera?gym=${gym.id}`} className="btn-primary">📷 Photo a climb</Link>
          <Link href={`/climbs/new/sandbox?gym=${gym.id}`} className="btn-secondary">Build a climb</Link>
        </div>
      </div>
      {climbs.length === 0 ? (
        <p className="card text-stone-600">No climbs here yet. Be the first to add one.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {climbs.map((c) => (
            <li key={c.id}>
              <ClimbCard climb={c} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
