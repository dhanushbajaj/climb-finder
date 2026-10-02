import { HOLD_INFO, canFoot, canHand, validateWall, type Hold, type Wall } from "../holds";
import { reachFor, type Reach } from "./reach";
import type { BodyState, Climber, Move, SolveResult } from "./types";

interface Pt {
  x: number;
  y: number;
}

type Feet = { LF: string | null; RF: string | null };

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const feetKey = (f: Feet) => `${f.LF ?? "-"}|${f.RF ?? "-"}`;

export interface SolveOptions {
  /** safety cap on explored hand positions */
  maxExpansions?: number;
}

/**
 * Finds a low-cost hand/foot sequence from the start hold(s) to matching the finish.
 *
 * The search runs over hand positions (LH, RH). Each step is one hand move, optionally
 * preceded by the feet stepping to new holds while both hands stay put. Every body
 * position along the way must fit the climber's reach model. Weighted A*.
 */
export function solve(wall: Wall, climber: Climber, opts: SolveOptions = {}): SolveResult {
  const errors = validateWall(wall);
  if (errors.length) return { ok: false, reason: errors.join(" ") };

  const reach = reachFor(climber);
  const byId = new Map(wall.holds.map((h) => [h.id, h]));
  const handHolds = wall.holds.filter(canHand);
  const footHolds = wall.holds.filter(canFoot);
  const finishIds = new Set(wall.holds.filter((h) => h.role === "finish").map((h) => h.id));
  const finishes = wall.holds.filter((h) => finishIds.has(h.id));
  const starts = wall.holds.filter((h) => h.role === "start").sort((a, b) => a.x - b.x);

  // Overhangs make hard holds and smearing much worse; slabs make hands easier.
  const handAngle = Math.max(0.5, 1 + wall.angleDeg / 30);
  const smearWeight = wall.angleDeg > 0 ? 0.6 * handAngle * handAngle : 0.3;

  const footPos = (s: BodyState, limb: "LF" | "RF"): Pt => {
    const id = s[limb];
    if (id) return byId.get(id)!;
    // Smearing (or standing on the floor): assume the foot lands somewhere useful under the body.
    const lh = byId.get(s.LH)!;
    const rh = byId.get(s.RH)!;
    return {
      x: (lh.x + rh.x) / 2 + (limb === "LF" ? -15 : 15),
      y: Math.max(0, Math.min(lh.y, rh.y) - 0.55 * climber.heightCm),
    };
  };

  const handsFit = (lh: Hold, rh: Hold, k: number) =>
    dist(lh, rh) <= reach.handSpan * k && Math.abs(lh.y - rh.y) <= reach.handVertical * k;

  /** Does this full body position fit? Assumes handsFit already passed. */
  const feetFit = (s: BodyState, k: number): boolean => {
    if (s.LF && (s.LF === s.LH || s.LF === s.RH)) return false;
    if (s.RF && (s.RF === s.LH || s.RF === s.RH)) return false;
    const lh = byId.get(s.LH)!;
    const rh = byId.get(s.RH)!;
    const minHandY = Math.min(lh.y, rh.y);
    const maxHandY = Math.max(lh.y, rh.y);
    const lf = footPos(s, "LF");
    const rf = footPos(s, "RF");
    if (s.LF && lf.y > minHandY - reach.footBelowHand) return false;
    if (s.RF && rf.y > minHandY - reach.footBelowHand) return false;
    if (s.LF && s.RF && Math.abs(lf.x - rf.x) > reach.footSpan) return false;
    if (maxHandY - Math.max(lf.y, rf.y) > reach.handAboveFoot * k) return false;
    if (maxHandY - Math.min(lf.y, rf.y) > reach.handToFoot * k * 1.15) return false;
    for (const hand of [lh, rh]) {
      if (Math.min(dist(hand, lf), dist(hand, rf)) > reach.handToFoot * k) return false;
    }
    return true;
  };

  const smears = (f: Feet) => (f.LF ? 0 : 1) + (f.RF ? 0 : 1);

  // Prefer real footholds, and the higher ones (less to step up later).
  const footScore = (f: Feet) =>
    smears(f) * 1000 - (f.LF ? byId.get(f.LF)!.y : 0) - (f.RF ? byId.get(f.RF)!.y : 0);
  const MAX_FOOT_PAIRS = 16;

  /** Footholds a body hanging from these hands could possibly stand on (cheap pre-filter). */
  const footCandidates = (lh: Hold, rh: Hold): (string | null)[] => {
    const top = Math.min(lh.y, rh.y) - reach.footBelowHand;
    const bottom = Math.max(lh.y, rh.y) - reach.handToFoot * reach.dynoFactor * 1.15;
    const r = reach.handToFoot * reach.dynoFactor;
    return [
      null,
      ...footHolds
        .filter((f) => f.y <= top && f.y >= bottom && Math.min(dist(f, lh), dist(f, rh)) <= r)
        .map((f) => f.id),
    ];
  };

  interface FeetInfo {
    /** keys of every foot pair that fits these hands, statically and with a dyno */
    fit: Set<string>;
    fitDyno: Set<string>;
    /** the best few static foot pairs to consider stepping to */
    best: Feet[];
  }
  /** Which foot pairs work with a given hand position. Computed once per hand position. */
  const feetCache = new Map<string, FeetInfo>();
  const feetFor = (LH: string, RH: string): FeetInfo => {
    const key = `${LH}|${RH}`;
    let info = feetCache.get(key);
    if (!info) {
      info = { fit: new Set(), fitDyno: new Set(), best: [] };
      const fits: Feet[] = [];
      const options = footCandidates(byId.get(LH)!, byId.get(RH)!);
      for (const LF of options) for (const RF of options) {
        if (LF && LF === RF) continue;
        const feet = { LF, RF };
        const fk = feetKey(feet);
        const s = { LH, RH, ...feet };
        if (feetFit(s, 1)) {
          info.fit.add(fk);
          info.fitDyno.add(fk);
          fits.push(feet);
        } else if (feetFit(s, reach.dynoFactor)) {
          info.fitDyno.add(fk);
        }
      }
      info.best = fits.sort((a, b) => footScore(a) - footScore(b)).slice(0, MAX_FOOT_PAIRS);
      feetCache.set(key, info);
    }
    return info;
  };

  const footMoveCost = (from: string | null, to: string | null, s: BodyState, limb: "LF" | "RF") => {
    const a = from ? byId.get(from)! : footPos(s, limb);
    const b = to ? byId.get(to)! : footPos(s, limb);
    return 0.6 + 0.5 * (dist(a, b) / climber.heightCm) ** 2 + (to ? HOLD_INFO[byId.get(to)!.type].difficulty * 0.3 : 0.2);
  };

  /** Foot moves (one foot at a time, hands fixed) to get from `from` to `to`, or null if impossible. */
  const footSteps = (LH: string, RH: string, fit: Set<string>, from: Feet, to: Feet): Move[] | null => {
    const changed = (["LF", "RF"] as const).filter((l) => from[l] !== to[l]);
    if (changed.length === 0) return [];
    const orders = changed.length === 1 ? [changed] : [changed, [...changed].reverse()];
    for (const order of orders) {
      // With both feet changing, the in-between position has to fit too.
      if (order.length === 2 && !fit.has(feetKey({ ...from, [order[0]]: to[order[0]] }))) continue;
      let cur: BodyState = { LH, RH, ...from };
      return order.map((limb) => {
        const other = limb === "LF" ? "RF" : "LF";
        const move: Move = {
          limb,
          from: cur[limb],
          to: to[limb],
          dyno: false,
          matched: false,
          crossed: false,
          cost: footMoveCost(cur[limb], to[limb], cur, limb) + (to[limb] && to[limb] === cur[other] ? 0.5 : 0),
        };
        cur = { ...cur, [limb]: to[limb] };
        return move;
      });
    }
    return null;
  };

  // Each hand move costs at least 1 and travels at most this far, so this stays a fair estimate.
  const maxHandTravel = reach.handVertical * reach.dynoFactor;
  const toFinish = new Map(
    handHolds.map((h) => [h.id, Math.min(...finishes.map((f) => dist(h, f))) / maxHandTravel]),
  );
  const heuristic = (LH: string, RH: string) => Math.ceil(toFinish.get(LH)!) + Math.ceil(toFinish.get(RH)!);
  const handNeighbors = new Map(
    handHolds.map((h) => [h.id, handHolds.filter((o) => o.id !== h.id && dist(h, o) <= maxHandTravel)]),
  );

  // --- start ---
  const startHands =
    starts.length === 1 ? { LH: starts[0].id, RH: starts[0].id } : { LH: starts[0].id, RH: starts[1].id };
  const startFeet = feetFor(startHands.LH, startHands.RH).best;
  if (startFeet.length === 0) {
    return {
      ok: false,
      reason: "You can't get established on the start holds — they're out of reach from the ground and footholds.",
    };
  }
  const firstFeet = startFeet[0];

  interface Rec {
    g: number;
    feet: Feet;
    parent: string | null;
    moves: Move[];
  }
  const keyOf = (LH: string, RH: string, f: Feet) => `${LH}|${RH}|${feetKey(f)}`;
  const recs = new Map<string, Rec>();
  const open = new MinHeap<{ key: string; f: number; g: number }>((a, b) => a.f - b.f);
  const startKey = keyOf(startHands.LH, startHands.RH, firstFeet);
  const startG = smears(firstFeet) * smearWeight * 0.5;
  recs.set(startKey, { g: startG, feet: firstFeet, parent: null, moves: [] });
  open.push({ key: startKey, g: startG, f: startG + heuristic(startHands.LH, startHands.RH) });

  const closed = new Set<string>();
  const reachedHands = new Set<string>();
  const maxExpansions = opts.maxExpansions ?? 50_000;
  let expansions = 0;

  while (open.size > 0) {
    const node = open.pop()!;
    if (closed.has(node.key)) continue;
    const rec = recs.get(node.key)!;
    if (node.g > rec.g) continue;
    closed.add(node.key);
    const [LH, RH] = node.key.split("|");
    reachedHands.add(LH).add(RH);

    if (finishIds.has(LH) && finishIds.has(RH)) return rebuild(node.key, recs, startHands, rec.g);
    if (++expansions > maxExpansions) break;

    const here = feetFor(LH, RH);
    const feetHere = [rec.feet, ...here.best];
    for (const limb of ["LH", "RH"] as const) {
      const cur = limb === "LH" ? LH : RH;
      const otherId = limb === "LH" ? RH : LH;
      for (const target of handNeighbors.get(cur)!) {
        const matched = target.id === otherId;
        if (matched && !HOLD_INFO[target.type].matchable && !finishIds.has(target.id)) continue;
        const nLH = limb === "LH" ? target.id : LH;
        const nRH = limb === "RH" ? target.id : RH;

        const d = dist(byId.get(cur)!, target);
        const staticOk = d <= reach.handVertical && handsFit(byId.get(nLH)!, byId.get(nRH)!, 1);
        const dynoOk = staticOk || (d <= maxHandTravel && handsFit(byId.get(nLH)!, byId.get(nRH)!, reach.dynoFactor));
        if (!dynoOk) continue;
        const there = feetFor(nLH, nRH);

        const lx = byId.get(nLH)!.x;
        const rx = byId.get(nRH)!.x;
        const crossed = lx > rx + 10;
        const handBase =
          1 +
          0.8 * (d / reach.arm) ** 1.5 +
          HOLD_INFO[target.type].difficulty * handAngle +
          (crossed ? 1.5 : 0) +
          (matched ? (target.type === "jug" ? 0.3 : 0.8) : 0);

        // Pick the best foot placement to make this move from.
        let best: { cost: number; steps: Move[]; feet: Feet; dyno: boolean } | null = null;
        for (const feet of feetHere) {
          const fk = feetKey(feet);
          let dyno = false;
          if (!(staticOk && there.fit.has(fk))) {
            if (!there.fitDyno.has(fk)) continue;
            dyno = true;
          }
          const steps = footSteps(LH, RH, here.fit, rec.feet, feet);
          if (!steps) continue;
          const cost =
            steps.reduce((sum, m) => sum + m.cost, 0) +
            handBase +
            (dyno ? 4 * handAngle : 0) +
            smears(feet) * smearWeight;
          if (!best || cost < best.cost) best = { cost, steps, feet, dyno };
        }
        if (!best) continue;

        const nKey = keyOf(nLH, nRH, best.feet);
        if (closed.has(nKey)) continue;
        const g = rec.g + best.cost;
        const prev = recs.get(nKey);
        if (prev && prev.g <= g) continue;
        const handMove: Move = {
          limb,
          from: cur,
          to: target.id,
          dyno: best.dyno,
          matched,
          crossed,
          cost: best.cost - best.steps.reduce((sum, m) => sum + m.cost, 0),
        };
        recs.set(nKey, { g, feet: best.feet, parent: node.key, moves: [...best.steps, handMove] });
        open.push({ key: nKey, g, f: g + 2.5 * heuristic(nLH, nRH) });
      }
    }
  }

  return { ok: false, ...explainFailure(wall, reachedHands, reach, expansions > maxExpansions) };
}

function rebuild(
  goalKey: string,
  recs: Map<string, { feet: Feet; parent: string | null; moves: Move[] }>,
  startHands: { LH: string; RH: string },
  cost: number,
): SolveResult {
  const chain: { feet: Feet; moves: Move[] }[] = [];
  let k: string | null = goalKey;
  while (k !== null) {
    const r: { feet: Feet; parent: string | null; moves: Move[] } = recs.get(k)!;
    chain.unshift(r);
    k = r.parent;
  }
  const start: BodyState = { ...startHands, ...chain[0].feet };
  const moves = chain.slice(1).flatMap((c) => c.moves);
  const states: BodyState[] = [start];
  for (const m of moves) states.push({ ...states[states.length - 1], [m.limb]: m.to } as BodyState);
  return { ok: true, start, moves, states, cost };
}

function explainFailure(wall: Wall, reached: Set<string>, reach: Reach, capped: boolean) {
  if (capped) {
    return { reason: "The climb has too many holds to search fully. Remove a few unused holds and try again." };
  }
  let bestPair: { from: Hold; to: Hold; score: number } | null = null;
  const reachedHolds = wall.holds.filter((h) => reached.has(h.id));
  for (const u of wall.holds.filter((h) => canHand(h) && !reached.has(h.id))) {
    for (const r of reachedHolds) {
      // Prefer the gap that blocks upward progress.
      const score = dist(r, u) - (u.y > r.y ? 0 : 50);
      if (!bestPair || score < bestPair.score) bestPair = { from: r, to: u, score };
    }
  }
  if (!bestPair) return { reason: "No sequence reaches the finish." };
  const gap = Math.round(dist(bestPair.from, bestPair.to));
  return {
    reason: `No sequence found for your size. The gap from the ${HOLD_INFO[bestPair.from.type].label.toLowerCase()} to the ${HOLD_INFO[bestPair.to.type].label.toLowerCase()} (${gap} cm) is the likely crux — you'd need more reach or an intermediate hold.`,
    blocker: {
      fromHoldId: bestPair.from.id,
      toHoldId: bestPair.to.id,
      gapCm: gap,
      maxReachCm: Math.round(reach.handVertical * reach.dynoFactor),
    },
  };
}

class MinHeap<T> {
  private items: T[] = [];
  constructor(private cmp: (a: T, b: T) => number) {}
  get size() {
    return this.items.length;
  }
  push(item: T) {
    const a = this.items;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.cmp(a[i], a[p]) >= 0) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop(): T | undefined {
    const a = this.items;
    if (a.length === 0) return undefined;
    const top = a[0];
    const last = a.pop()!;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && this.cmp(a[l], a[m]) < 0) m = l;
        if (r < a.length && this.cmp(a[r], a[m]) < 0) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}
