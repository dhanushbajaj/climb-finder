"use client";

import type { Climber } from "@/lib/solver/types";

export default function ClimberFields({ value, onChange }: { value: Climber; onChange: (c: Climber) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      <label>
        <span className="label">Your height (cm)</span>
        <input
          className="input"
          type="number"
          min={100}
          max={230}
          value={value.heightCm}
          onChange={(e) => onChange({ ...value, heightCm: Number(e.target.value) || 0 })}
        />
      </label>
      <label>
        <span className="label" title="Wingspan minus height">
          Ape index (cm)
        </span>
        <input
          className="input"
          type="number"
          min={-30}
          max={40}
          value={value.apeIndexCm}
          onChange={(e) => onChange({ ...value, apeIndexCm: Number(e.target.value) || 0 })}
        />
      </label>
    </div>
  );
}
