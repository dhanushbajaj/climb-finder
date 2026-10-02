export const HOLD_TYPES = [
  "jug",
  "crimp",
  "sloper",
  "pinch",
  "pocket",
  "sidepull",
  "undercling",
  "volume",
  "foot",
] as const;

export type HoldType = (typeof HOLD_TYPES)[number];
export type HoldUsage = "hand" | "foot" | "both";
export type HoldRole = "start" | "finish" | null;

export interface Hold {
  id: string;
  /** cm from the left edge of the wall */
  x: number;
  /** cm from the floor */
  y: number;
  type: HoldType;
  usage: HoldUsage;
  role: HoldRole;
  /** direction the hold "pulls" from, 0 = straight down (a normal downpull) */
  orientationDeg: number;
}

export interface Wall {
  widthCm: number;
  heightCm: number;
  /** 0 = vertical, positive = overhanging, negative = slab */
  angleDeg: number;
  holds: Hold[];
}

interface HoldInfo {
  label: string;
  /** relative difficulty of using the hold; jug = 0 */
  difficulty: number;
  defaultUsage: HoldUsage;
  /** whether two hands can comfortably share it */
  matchable: boolean;
  color: string;
}

export const HOLD_INFO: Record<HoldType, HoldInfo> = {
  jug: { label: "Jug", difficulty: 0, defaultUsage: "both", matchable: true, color: "#22c55e" },
  crimp: { label: "Crimp", difficulty: 2, defaultUsage: "both", matchable: true, color: "#ef4444" },
  sloper: { label: "Sloper", difficulty: 2, defaultUsage: "both", matchable: true, color: "#3b82f6" },
  pinch: { label: "Pinch", difficulty: 1.5, defaultUsage: "both", matchable: false, color: "#a855f7" },
  pocket: { label: "Pocket", difficulty: 2.5, defaultUsage: "both", matchable: false, color: "#f97316" },
  sidepull: { label: "Sidepull", difficulty: 1.5, defaultUsage: "both", matchable: false, color: "#eab308" },
  undercling: { label: "Undercling", difficulty: 1.5, defaultUsage: "both", matchable: false, color: "#14b8a6" },
  volume: { label: "Volume", difficulty: 1, defaultUsage: "both", matchable: true, color: "#64748b" },
  foot: { label: "Foot chip", difficulty: 0.5, defaultUsage: "foot", matchable: false, color: "#78716c" },
};

export function canHand(h: Hold): boolean {
  return h.usage !== "foot";
}

export function canFoot(h: Hold): boolean {
  return h.usage !== "hand";
}

let counter = 0;
export function newHoldId(): string {
  counter += 1;
  return `h${Date.now().toString(36)}${counter.toString(36)}`;
}

export function makeHold(type: HoldType, x: number, y: number, extra: Partial<Hold> = {}): Hold {
  return {
    id: newHoldId(),
    x,
    y,
    type,
    usage: HOLD_INFO[type].defaultUsage,
    role: null,
    orientationDeg: 0,
    ...extra,
  };
}

/** Basic sanity checks shared by the editor and the API before solving/saving. */
export function validateWall(wall: Wall): string[] {
  const errors: string[] = [];
  const starts = wall.holds.filter((h) => h.role === "start");
  const finishes = wall.holds.filter((h) => h.role === "finish");
  if (starts.length === 0) errors.push("Mark at least one start hold.");
  if (starts.length > 2) errors.push("Use at most two start holds.");
  if (finishes.length === 0) errors.push("Mark at least one finish hold.");
  if (finishes.length > 2) errors.push("Use at most two finish holds.");
  if ([...starts, ...finishes].some((h) => !canHand(h)))
    errors.push("Start and finish holds must be usable by hands.");
  return errors;
}
