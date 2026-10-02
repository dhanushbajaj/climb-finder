import { describe, expect, it } from "vitest";
import type { Hold, HoldType, Wall } from "@/lib/holds";
import { HOLD_INFO } from "@/lib/holds";
import { describeMove, describeStart } from "@/lib/solver/describe";
import { reachFor } from "@/lib/solver/reach";
import { solve } from "@/lib/solver/solve";

let n = 0;
function hold(type: HoldType, x: number, y: number, role: Hold["role"] = null): Hold {
  return { id: `t${n++}`, x, y, type, usage: HOLD_INFO[type].defaultUsage, role, orientationDeg: 0 };
}

const avg = { heightCm: 175, apeIndexCm: 0 };

function ladder(): Wall {
  return {
    widthCm: 300,
    heightCm: 450,
    angleDeg: 0,
    holds: [
      hold("jug", 130, 150, "start"),
      hold("jug", 170, 150, "start"),
      hold("foot", 135, 40),
      hold("foot", 165, 40),
      hold("foot", 140, 90),
      hold("foot", 160, 90),
      hold("jug", 140, 200),
      hold("jug", 160, 250),
      hold("jug", 140, 300),
      hold("jug", 160, 350),
      hold("jug", 150, 400, "finish"),
    ],
  };
}

describe("reachFor", () => {
  it("scales with ape index", () => {
    const a = reachFor({ heightCm: 175, apeIndexCm: 0 });
    const b = reachFor({ heightCm: 175, apeIndexCm: 10 });
    expect(b.wingspan - a.wingspan).toBe(10);
    expect(b.handAboveFoot).toBeGreaterThan(a.handAboveFoot);
  });
});

describe("solve", () => {
  it("rejects walls without start/finish", () => {
    const r = solve({ widthCm: 200, heightCm: 300, angleDeg: 0, holds: [hold("jug", 100, 100)] }, avg);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/start/);
  });

  it("climbs a ladder of jugs and matches the finish", () => {
    const wall = ladder();
    const r = solve(wall, avg);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const finish = wall.holds.find((h) => h.role === "finish")!.id;
    const last = r.states[r.states.length - 1];
    expect(last.LH).toBe(finish);
    expect(last.RH).toBe(finish);
    expect(r.states).toHaveLength(r.moves.length + 1);
    // every hand hold on the way up should get used at least once
    const used = new Set(r.states.flatMap((s) => [s.LH, s.RH]));
    for (const h of wall.holds.filter((h) => h.type === "jug")) expect(used.has(h.id)).toBe(true);
  });

  it("solves a traverse", () => {
    const wall: Wall = {
      widthCm: 600,
      heightCm: 300,
      angleDeg: 0,
      holds: [
        hold("jug", 60, 150, "start"),
        ...[0, 1, 2, 3, 4, 5, 6].map((i) => hold("jug", 120 + i * 60, 150)),
        ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => hold("foot", 50 + i * 60, 40)),
        hold("jug", 600 - 20, 150, "finish"),
      ],
    };
    const r = solve(wall, avg);
    expect(r.ok).toBe(true);
  });

  it("reports a blocker for a gap only a tall climber can span", () => {
    const wall: Wall = {
      widthCm: 300,
      heightCm: 450,
      angleDeg: 0,
      holds: [
        hold("jug", 150, 150, "start"),
        hold("foot", 140, 100),
        hold("foot", 160, 100),
        hold("jug", 150, 280, "finish"),
      ],
    };
    const short = solve(wall, { heightCm: 155, apeIndexCm: 0 });
    expect(short.ok).toBe(false);
    if (!short.ok) {
      expect(short.blocker).toBeDefined();
      expect(short.blocker!.toHoldId).toBe(wall.holds[3].id);
    }
    const tall = solve(wall, { heightCm: 195, apeIndexCm: 8 });
    expect(tall.ok).toBe(true);
    if (tall.ok) expect(tall.moves.some((m) => m.dyno)).toBe(true);
  });

  it("prefers jugs over crimps when both work", () => {
    const start = hold("jug", 150, 150, "start");
    const crimp = hold("crimp", 120, 230);
    const jug = hold("jug", 180, 230);
    const wall: Wall = {
      widthCm: 300,
      heightCm: 400,
      angleDeg: 20,
      holds: [start, crimp, jug, hold("foot", 140, 40), hold("foot", 160, 40), hold("foot", 150, 100), hold("jug", 150, 310, "finish")],
    };
    const r = solve(wall, avg);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const used = new Set(r.moves.map((m) => m.to));
    expect(used.has(jug.id)).toBe(true);
    expect(used.has(crimp.id)).toBe(false);
  });

  it("solves a busy 60-hold wall in reasonable time", () => {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const types: HoldType[] = ["jug", "crimp", "sloper", "pinch", "foot"];
    const holds = [hold("jug", 200, 140, "start"), hold("jug", 200, 420, "finish")];
    for (let i = 0; i < 60; i++) holds.push(hold(types[Math.floor(rnd() * 5)], rnd() * 400, 20 + rnd() * 400));
    const t0 = performance.now();
    const r = solve({ widthCm: 400, heightCm: 450, angleDeg: 15, holds }, avg);
    expect(performance.now() - t0).toBeLessThan(5000);
    expect(r.ok).toBe(true);
  });

  it("produces readable beta", () => {
    const wall = ladder();
    const r = solve(wall, avg);
    if (!r.ok) throw new Error(r.reason);
    const map = new Map(wall.holds.map((h) => [h.id, h]));
    expect(describeStart(r.start, map)).toMatch(/Left hand on the jug at 1\.5 m/);
    for (const m of r.moves) expect(describeMove(m, map)).toMatch(/^(Left|Right) (hand|foot)/);
  });
});
