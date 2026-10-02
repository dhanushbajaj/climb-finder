"use client";

import { HOLD_INFO, HOLD_TYPES, type HoldType } from "@/lib/holds";

export default function HoldPalette({
  value,
  onChange,
}: {
  value: HoldType | null;
  onChange: (t: HoldType | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="toolbar" aria-label="Hold types">
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={value === null}
        className={`chip ${value === null ? "chip-on" : ""}`}
      >
        ✋ Select / move
      </button>
      {HOLD_TYPES.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          aria-pressed={value === t}
          className={`chip ${value === t ? "chip-on" : ""}`}
        >
          <span className="inline-block size-3 rounded-full border border-black/30" style={{ background: HOLD_INFO[t].color }} />
          {HOLD_INFO[t].label}
        </button>
      ))}
    </div>
  );
}
