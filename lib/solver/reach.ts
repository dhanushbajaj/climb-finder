import type { Climber } from "./types";

export interface Reach {
  wingspan: number;
  /** shoulder to fingertip */
  arm: number;
  /** max distance between the two hands */
  handSpan: number;
  /** max vertical gap between the hands, and max travel of one hand in a static move */
  handVertical: number;
  /** max height of a hand above the higher foot (standing tall, arm up) */
  handAboveFoot: number;
  /** max straight-line distance from a hand to the foot that supports it */
  handToFoot: number;
  /** a foot must sit at least this far below the lowest hand */
  footBelowHand: number;
  /** max horizontal distance between feet */
  footSpan: number;
  /** extra reach allowed for a dynamic move, as a multiplier */
  dynoFactor: number;
}

/**
 * Rough anthropometric model. Shoulder height ≈ 0.82·h, arm ≈ (wingspan − shoulder width)/2
 * with shoulder width ≈ 0.23·h. Good enough to rank sequences, not to replace trying it.
 */
export function reachFor(c: Climber): Reach {
  const h = c.heightCm;
  const wingspan = h + c.apeIndexCm;
  const arm = (wingspan - 0.23 * h) / 2;
  const handAboveFoot = 0.82 * h + arm;
  return {
    wingspan,
    arm,
    handSpan: wingspan * 0.92,
    handVertical: 1.5 * arm,
    handAboveFoot,
    handToFoot: handAboveFoot * 1.05,
    footBelowHand: 0.25 * h,
    footSpan: 0.9 * h,
    dynoFactor: 1.12,
  };
}
