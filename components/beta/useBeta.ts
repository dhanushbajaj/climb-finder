"use client";

import { useCallback, useState } from "react";
import type { Wall } from "@/lib/holds";
import { useSolver } from "@/lib/hooks";
import type { Climber } from "@/lib/solver/types";

/** Solver + playback state shared by the builder and the climb page. */
export function useBeta() {
  const { result, solving, run, clear } = useSolver();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const solveNow = useCallback(
    (wall: Wall, climber: Climber) => {
      setStep(0);
      setPlaying(false);
      run(wall, climber);
    },
    [run],
  );

  const reset = useCallback(() => {
    setStep(0);
    setPlaying(false);
    clear();
  }, [clear]);

  const body = result?.ok ? result.states[Math.min(step, result.states.length - 1)] : null;
  const lastMove = result?.ok && step > 0 ? result.moves[step - 1] : null;
  const highlightIds = result && !result.ok && result.blocker ? [result.blocker.fromHoldId, result.blocker.toHoldId] : [];

  return { result, solving, step, setStep, playing, setPlaying, solveNow, reset, body, lastMove, highlightIds };
}
