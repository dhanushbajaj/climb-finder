import Link from "next/link";
import { HOLD_INFO } from "@/lib/holds";
import type { Climb } from "@/lib/types";

export default function ClimbCard({ climb }: { climb: Climb }) {
  const w = climb.wall;
  return (
    <Link href={`/climbs/${climb.id}`} className="card flex gap-3 !p-3 transition hover:border-orange-300">
      <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md bg-[#e7e2d8]">
        {climb.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={climb.photoUrl} alt="" className="absolute inset-0 size-full object-cover" />
        )}
        <svg viewBox={`0 0 ${w.widthCm} ${w.heightCm}`} className="absolute inset-0 size-full" preserveAspectRatio="none">
          {w.holds.map((h) => (
            <circle
              key={h.id}
              cx={h.x}
              cy={w.heightCm - h.y}
              r={Math.max(w.widthCm, w.heightCm) / 40}
              fill={climb.photoUrl ? "none" : HOLD_INFO[h.type].color}
              stroke={climb.photoUrl ? HOLD_INFO[h.type].color : "#1c1917"}
              strokeWidth={Math.max(w.widthCm, w.heightCm) / 120}
            />
          ))}
        </svg>
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold">{climb.name}</p>
        <p className="text-sm text-stone-600">{climb.grade ?? "Ungraded"}</p>
        <p className="text-xs text-stone-500">
          {w.holds.length} holds · {w.angleDeg}°{climb.local ? " · this browser only" : ""}
        </p>
      </div>
    </Link>
  );
}
