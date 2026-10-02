import { HOLD_INFO, type Hold } from "../holds";
import type { BodyState, Move } from "./types";

const LIMB_NAME = { LH: "Left hand", RH: "Right hand", LF: "Left foot", RF: "Right foot" } as const;

const m = (cm: number) => `${(cm / 100).toFixed(1)} m`;

function holdName(h: Hold) {
  return `${HOLD_INFO[h.type].label.toLowerCase()} at ${m(h.y)}`;
}

export function describeStart(start: BodyState, holds: Map<string, Hold>): string {
  const lh = holds.get(start.LH)!;
  const rh = holds.get(start.RH)!;
  const hands = start.LH === start.RH ? `Match both hands on the ${holdName(lh)}` : `Left hand on the ${holdName(lh)}, right hand on the ${holdName(rh)}`;
  const foot = (id: string | null, side: string) => (id ? `${side} foot on the ${holdName(holds.get(id)!)}` : `${side} foot smearing`);
  return `${hands}; ${foot(start.LF, "left")}, ${foot(start.RF, "right")}.`;
}

export function describeMove(move: Move, holds: Map<string, Hold>): string {
  const who = LIMB_NAME[move.limb];
  if (!move.to) return `${who} off to smear on the wall.`;
  const to = holds.get(move.to)!;
  const from = move.from ? holds.get(move.from) : undefined;
  let dir = "";
  if (from) {
    const dx = Math.round(to.x - from.x);
    const dy = Math.round(to.y - from.y);
    const parts: string[] = [];
    if (Math.abs(dy) >= 5) parts.push(`${Math.abs(dy)} cm ${dy > 0 ? "up" : "down"}`);
    if (Math.abs(dx) >= 5) parts.push(`${Math.abs(dx)} cm ${dx > 0 ? "right" : "left"}`);
    if (parts.length) dir = ` (${parts.join(", ")})`;
  }
  const verb = move.dyno ? "jumps to" : move.matched ? "matches on" : "to";
  const notes = [move.crossed ? "cross through" : "", move.dyno ? "commit, it's out of static reach" : ""].filter(Boolean);
  return `${who} ${verb} the ${holdName(to)}${dir}${notes.length ? ` — ${notes.join("; ")}` : ""}.`;
}
