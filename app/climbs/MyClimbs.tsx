"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ClimbCard from "@/components/ui/ClimbCard";
import { listLocalClimbs, listMyClimbs } from "@/lib/data";
import type { Climb } from "@/lib/types";

export default function MyClimbs() {
  const [mine, setMine] = useState<Climb[]>([]);
  const [local, setLocal] = useState<Climb[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // localStorage is browser-only, so read it after hydration.
    queueMicrotask(() => setLocal(listLocalClimbs()));
    listMyClimbs().then(setMine).catch((e) => setError(e.message));
  }, []);

  const all = [...mine, ...local];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My climbs</h1>
        <Link href="/climbs/new" className="btn-primary">+ Add climb</Link>
      </div>
      {error && <p className="text-red-600">{error}</p>}
      {all.length === 0 ? (
        <p className="card text-stone-600">Nothing yet. Photograph a wall or build one in the sandbox.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="my-climbs">
          {all.map((c) => (
            <li key={c.id}>
              <ClimbCard climb={c} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
