"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BetaPanel from "@/components/beta/BetaPanel";
import ClimberFields from "@/components/beta/ClimberFields";
import { useBeta } from "@/components/beta/useBeta";
import WallCanvas from "@/components/builder/WallCanvasClient";
import { deleteClimb, getClimb, getGym } from "@/lib/data";
import { useClimber, useUser } from "@/lib/hooks";
import type { Climb, Gym } from "@/lib/types";

export default function ClimbView({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useUser();
  const [climber, setClimber] = useClimber();
  const [climb, setClimb] = useState<Climb | null | undefined>(undefined);
  const [gym, setGym] = useState<Gym | null>(null);
  const [error, setError] = useState<string | null>(null);
  const beta = useBeta();

  useEffect(() => {
    getClimb(id)
      .then((c) => {
        setClimb(c);
        if (c?.gymId) getGym(c.gymId).then(setGym).catch(() => {});
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (climb === undefined) return <p className="text-stone-500">Loading…</p>;
  if (climb === null) return <p>Climb not found. {id.startsWith("local-") && "It was saved in a different browser."}</p>;

  const canDelete = climb.local || (user && user.id === climb.createdBy);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h1 className="text-2xl font-bold">{climb.name}</h1>
          <span className="text-lg text-stone-600">{climb.grade ?? "Ungraded"}</span>
        </div>
        <p className="text-sm text-stone-500">
          {gym ? (
            <>
              at <Link href={`/gyms/${gym.id}`} className="underline">{gym.name}</Link> ·{" "}
            </>
          ) : null}
          {(climb.wall.heightCm / 100).toFixed(1)} m wall · {climb.wall.angleDeg}° · {climb.wall.holds.length} holds
          {climb.local && " · saved in this browser"}
        </p>
        <WallCanvas
          wall={climb.wall}
          photoUrl={climb.photoUrl}
          body={beta.body}
          lastMove={beta.lastMove}
          highlightIds={beta.highlightIds}
          climberHeightCm={climber.heightCm}
          maxHeightPx={780}
        />
      </section>
      <aside className="space-y-4">
        <div className="card space-y-3">
          <h2 className="font-semibold">Get the beta</h2>
          <ClimberFields value={climber} onChange={setClimber} />
          <button type="button" className="btn-primary w-full" disabled={beta.solving} onClick={() => beta.solveNow(climb.wall, climber)}>
            Solve for my size
          </button>
          <BetaPanel
            wall={climb.wall}
            result={beta.result}
            solving={beta.solving}
            step={beta.step}
            onStep={beta.setStep}
            playing={beta.playing}
            onPlayingChange={beta.setPlaying}
          />
          <p className="text-xs text-stone-500">
            Beta is computed from a simple body model: use it as a starting point, not gospel.
          </p>
        </div>
        {canDelete && (
          <button
            type="button"
            className="text-sm text-red-600 hover:underline"
            onClick={async () => {
              if (!confirm("Delete this climb?")) return;
              await deleteClimb(climb.id);
              router.push(gym ? `/gyms/${gym.id}` : "/climbs");
            }}
          >
            Delete climb
          </button>
        )}
      </aside>
    </div>
  );
}
