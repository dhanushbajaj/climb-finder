export type Limb = "LH" | "RH" | "LF" | "RF";
export const LIMBS: Limb[] = ["LH", "RH", "LF", "RF"];

export interface Climber {
  heightCm: number;
  /** wingspan minus height; positive = long arms */
  apeIndexCm: number;
}

/** Hold id per limb. A foot with `null` is smearing on the wall. Hands are never null. */
export interface BodyState {
  LH: string;
  RH: string;
  LF: string | null;
  RF: string | null;
}

export interface Move {
  limb: Limb;
  from: string | null;
  to: string | null;
  /** the move needs a jump/deadpoint beyond static reach */
  dyno: boolean;
  matched: boolean;
  crossed: boolean;
  cost: number;
}

export interface Blocker {
  fromHoldId: string;
  toHoldId: string;
  gapCm: number;
  maxReachCm: number;
}

export type SolveResult =
  | {
      ok: true;
      start: BodyState;
      moves: Move[];
      /** start state followed by the state after each move */
      states: BodyState[];
      cost: number;
    }
  | {
      ok: false;
      reason: string;
      blocker?: Blocker;
    };
