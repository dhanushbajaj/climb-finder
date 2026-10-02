"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ClimberFields from "@/components/beta/ClimberFields";
import { saveClimber } from "@/lib/data";
import { useClimber, useUser } from "@/lib/hooks";
import { reachFor } from "@/lib/solver/reach";
import { getSupabase } from "@/lib/supabase/client";

export default function Profile() {
  const router = useRouter();
  const { user } = useUser();
  const [climber, setClimber] = useClimber();
  const [status, setStatus] = useState<string | null>(null);
  const reach = reachFor(climber);

  const save = async () => {
    setStatus(null);
    try {
      await saveClimber(climber);
      setStatus("Saved.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Couldn't save.");
    }
  };

  return (
    <div className="card mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Your size</h1>
      {user && <p className="text-sm text-stone-600">Signed in as {user.email}</p>}
      <p className="text-sm text-stone-600">The solver uses these to decide which moves you can reach.</p>
      <ClimberFields value={climber} onChange={setClimber} />
      <p className="text-xs text-stone-500">
        Wingspan {Math.round(reach.wingspan)} cm · static reach above your feet ≈ {Math.round(reach.handAboveFoot)} cm · longest hand
        move ≈ {Math.round(reach.handVertical)} cm
      </p>
      <button type="button" className="btn-primary w-full" onClick={save}>
        Save
      </button>
      {status && <p className="text-sm">{status}</p>}
      {user && (
        <button
          type="button"
          className="text-sm text-stone-500 underline"
          onClick={async () => {
            await getSupabase()?.auth.signOut();
            router.push("/");
          }}
        >
          Sign out
        </button>
      )}
    </div>
  );
}
