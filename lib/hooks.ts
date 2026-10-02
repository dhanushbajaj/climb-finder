"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { Wall } from "./holds";
import { DEFAULT_CLIMBER, loadClimber } from "./data";
import { solve } from "./solver/solve";
import type { Climber, SolveResult } from "./solver/types";
import type { SolveRequest, SolveResponse } from "./solver/worker";
import { getSupabase } from "./supabase/client";

export function useUser(): { user: User | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(getSupabase()));
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    sb.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data } = sb.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  return { user, loading };
}

export function useClimber(): [Climber, (c: Climber) => void] {
  const [climber, setClimber] = useState<Climber>(DEFAULT_CLIMBER);
  useEffect(() => {
    loadClimber().then(setClimber);
  }, []);
  return [climber, setClimber];
}

/** Runs the solver off the main thread (falls back to inline where workers aren't available). */
export function useSolver() {
  const workerRef = useRef<Worker | null>(null);
  const seq = useRef(0);
  const [result, setResult] = useState<SolveResult | null>(null);
  const [solving, setSolving] = useState(false);

  useEffect(() => {
    if (typeof Worker === "undefined") return;
    const w = new Worker(new URL("./solver/worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (e: MessageEvent<SolveResponse>) => {
      if (e.data.id !== seq.current) return; // a newer request superseded this one
      setResult(e.data.result);
      setSolving(false);
    };
    workerRef.current = w;
    return () => w.terminate();
  }, []);

  const run = useCallback((wall: Wall, climber: Climber) => {
    const id = ++seq.current;
    setSolving(true);
    if (workerRef.current) {
      workerRef.current.postMessage({ id, wall, climber } satisfies SolveRequest);
    } else {
      setResult(solve(wall, climber));
      setSolving(false);
    }
  }, []);

  const clear = useCallback(() => {
    seq.current++;
    setResult(null);
    setSolving(false);
  }, []);

  return { result, solving, run, clear };
}
