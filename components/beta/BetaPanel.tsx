"use client";

import { useEffect, useMemo } from "react";
import type { Wall } from "@/lib/holds";
import { describeMove, describeStart } from "@/lib/solver/describe";
import type { SolveResult } from "@/lib/solver/types";

export default function BetaPanel({
  wall,
  result,
  solving,
  step,
  onStep,
  playing,
  onPlayingChange,
}: {
  wall: Wall;
  result: SolveResult | null;
  solving: boolean;
  /** 0 = start position, i = after move i */
  step: number;
  onStep: (i: number) => void;
  playing: boolean;
  onPlayingChange: (p: boolean) => void;
}) {
  const byId = useMemo(() => new Map(wall.holds.map((h) => [h.id, h])), [wall.holds]);
  const total = result?.ok ? result.moves.length : 0;

  useEffect(() => {
    if (!playing || !result?.ok) return;
    if (step >= total) {
      onPlayingChange(false);
      return;
    }
    const t = setTimeout(() => onStep(step + 1), 900);
    return () => clearTimeout(t);
  }, [playing, step, total, result, onStep, onPlayingChange]);

  if (solving) return <p className="text-sm text-stone-500" role="status">Working out the beta…</p>;
  if (!result) return null;
  if (!result.ok) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert" data-testid="beta-error">
        {result.reason}
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="beta">
      <div className="flex items-center gap-2">
        <button type="button" className="btn-secondary" onClick={() => onStep(Math.max(0, step - 1))} disabled={step === 0} aria-label="Previous move">
          ◀
        </button>
        <button
          type="button"
          className="btn-secondary min-w-20"
          onClick={() => {
            if (step >= total) onStep(0);
            onPlayingChange(!playing);
          }}
        >
          {playing ? "Pause" : step >= total ? "Replay" : "Play"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => onStep(Math.min(total, step + 1))} disabled={step >= total} aria-label="Next move">
          ▶
        </button>
        <span className="ml-auto text-sm text-stone-500">
          {step === 0 ? "Start" : `Move ${step} of ${total}`}
        </span>
      </div>
      <ol className="max-h-80 space-y-1 overflow-y-auto text-sm">
        <li>
          <button type="button" onClick={() => onStep(0)} className={`step ${step === 0 ? "step-on" : ""}`}>
            <span className="step-num">0</span>
            {describeStart(result.start, byId)}
          </button>
        </li>
        {result.moves.map((m, i) => (
          <li key={i}>
            <button type="button" onClick={() => onStep(i + 1)} className={`step ${step === i + 1 ? "step-on" : ""}`}>
              <span className="step-num">{i + 1}</span>
              {describeMove(m, byId)}
              {m.dyno && <span className="ml-1 rounded bg-rose-100 px-1 text-xs font-semibold text-rose-700">DYNO</span>}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
