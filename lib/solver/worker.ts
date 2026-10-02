import type { Wall } from "../holds";
import { solve } from "./solve";
import type { Climber, SolveResult } from "./types";

export interface SolveRequest {
  id: number;
  wall: Wall;
  climber: Climber;
}

export interface SolveResponse {
  id: number;
  result: SolveResult;
}

self.onmessage = (e: MessageEvent<SolveRequest>) => {
  const { id, wall, climber } = e.data;
  let result: SolveResult;
  try {
    result = solve(wall, climber);
  } catch (err) {
    result = { ok: false, reason: err instanceof Error ? err.message : "Solver crashed." };
  }
  (self as unknown as Worker).postMessage({ id, result } satisfies SolveResponse);
};
