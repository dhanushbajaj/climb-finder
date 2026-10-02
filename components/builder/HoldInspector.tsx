"use client";

import { HOLD_INFO, HOLD_TYPES, type Hold, type HoldRole, type HoldType, type HoldUsage } from "@/lib/holds";

export default function HoldInspector({
  hold,
  onChange,
  onDelete,
}: {
  hold: Hold | null;
  onChange: (h: Hold) => void;
  onDelete: () => void;
}) {
  if (!hold) {
    return <p className="text-sm text-stone-500">Pick a hold type and tap the wall to place it. Tap a hold to edit it, drag to move it.</p>;
  }
  const roles: { value: HoldRole; label: string }[] = [
    { value: null, label: "Normal" },
    { value: "start", label: "Start" },
    { value: "finish", label: "Finish" },
  ];
  return (
    <div className="space-y-3 text-sm" data-testid="hold-inspector">
      <div className="flex items-center justify-between">
        <span className="font-semibold">
          {HOLD_INFO[hold.type].label} · {(hold.y / 100).toFixed(2)} m up
        </span>
        <button type="button" onClick={onDelete} className="text-red-600 hover:underline">
          Delete
        </button>
      </div>
      <label className="block">
        <span className="label">Type</span>
        <select
          className="input"
          value={hold.type}
          onChange={(e) => {
            const type = e.target.value as HoldType;
            onChange({ ...hold, type, usage: HOLD_INFO[type].defaultUsage });
          }}
        >
          {HOLD_TYPES.map((t) => (
            <option key={t} value={t}>
              {HOLD_INFO[t].label}
            </option>
          ))}
        </select>
      </label>
      <div>
        <span className="label">Role</span>
        <div className="flex gap-1.5">
          {roles.map((r) => (
            <button
              key={r.label}
              type="button"
              aria-pressed={hold.role === r.value}
              className={`chip ${hold.role === r.value ? "chip-on" : ""}`}
              onClick={() => onChange({ ...hold, role: r.value, usage: r.value && hold.usage === "foot" ? "both" : hold.usage })}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="label">Usable by</span>
        <select className="input" value={hold.usage} onChange={(e) => onChange({ ...hold, usage: e.target.value as HoldUsage })}>
          <option value="both">Hands and feet</option>
          <option value="hand">Hands only</option>
          <option value="foot">Feet only</option>
        </select>
      </label>
      <label className="block">
        <span className="label">Facing ({hold.orientationDeg}°)</span>
        <input
          type="range"
          min={-180}
          max={180}
          step={15}
          value={hold.orientationDeg}
          onChange={(e) => onChange({ ...hold, orientationDeg: Number(e.target.value) })}
          className="w-full"
        />
      </label>
    </div>
  );
}
