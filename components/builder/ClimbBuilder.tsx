"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import BetaPanel from "@/components/beta/BetaPanel";
import ClimberFields from "@/components/beta/ClimberFields";
import { useBeta } from "@/components/beta/useBeta";
import { getGym, saveClimb } from "@/lib/data";
import { HOLD_INFO, validateWall, type Hold, type HoldType, type Wall } from "@/lib/holds";
import { useClimber, useUser } from "@/lib/hooks";
import { loadAndShrink } from "@/lib/image";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Gym } from "@/lib/types";
import HoldInspector from "./HoldInspector";
import HoldPalette from "./HoldPalette";
import WallCanvas from "./WallCanvasClient";

type Mode = "sandbox" | "camera";

const EMPTY_WALL: Wall = { widthCm: 300, heightCm: 420, angleDeg: 0, holds: [] };

export default function ClimbBuilder({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const gymId = params.get("gym");
  const { user } = useUser();
  const [climber, setClimber] = useClimber();

  const [wall, setWallRaw] = useState<Wall>(EMPTY_WALL);
  const [past, setPast] = useState<Wall[]>([]);
  const [future, setFuture] = useState<Wall[]>([]);
  const [photo, setPhoto] = useState<{ dataUrl: string; width: number; height: number } | null>(null);
  const [placeType, setPlaceType] = useState<HoldType | null>("jug");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [gym, setGym] = useState<Gym | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const beta = useBeta();
  const { reset: resetBeta } = beta;

  useEffect(() => {
    if (gymId) getGym(gymId).then(setGym).catch(() => setGym(null));
  }, [gymId]);

  /** Every edit goes through here so undo works and stale beta is cleared. */
  const setWall = useCallback(
    (next: Wall) => {
      setPast((p) => [...p.slice(-49), wall]);
      setFuture([]);
      setWallRaw(next);
      resetBeta();
    },
    [wall, resetBeta],
  );

  const undo = () => {
    const prev = past[past.length - 1];
    if (!prev) return;
    setPast(past.slice(0, -1));
    setFuture([wall, ...future]);
    setWallRaw(prev);
    resetBeta();
  };
  const redo = () => {
    const next = future[0];
    if (!next) return;
    setFuture(future.slice(1));
    setPast([...past, wall]);
    setWallRaw(next);
    resetBeta();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, select, textarea")) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        setWall({ ...wall, holds: wall.holds.filter((h) => h.id !== selectedId) });
        setSelectedId(null);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const selected = wall.holds.find((h) => h.id === selectedId) ?? null;
  const updateHold = (h: Hold) => {
    // Only one or two starts/finishes make sense; demote extras when a third is marked.
    let holds = wall.holds.map((x) => (x.id === h.id ? h : x));
    if (h.role) {
      const same = holds.filter((x) => x.role === h.role);
      if (same.length > 2) holds = holds.map((x) => (x.id === same.find((s) => s.id !== h.id)!.id ? { ...x, role: null } : x));
    }
    setWall({ ...wall, holds });
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const p = await loadAndShrink(file);
      setPhoto(p);
      const heightCm = wall.heightCm;
      setWall({ ...wall, heightCm, widthCm: Math.round((heightCm * p.width) / p.height), holds: [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load that photo.");
    }
  };

  const setWallHeight = (heightCm: number) => {
    if (!heightCm || heightCm < 100) return setWallRaw({ ...wall, heightCm: heightCm || wall.heightCm });
    const k = heightCm / wall.heightCm;
    // Rescale so holds stay on the same spot of the photo.
    setWall({
      ...wall,
      heightCm,
      widthCm: photo ? Math.round((heightCm * photo.width) / photo.height) : wall.widthCm,
      holds: photo ? wall.holds.map((h) => ({ ...h, x: Math.round(h.x * k), y: Math.round(h.y * k) })) : wall.holds,
    });
  };

  const problems = validateWall(wall);

  const save = async () => {
    setError(null);
    if (!name.trim()) return setError("Give the climb a name.");
    if (problems.length) return setError(problems.join(" "));
    setSaving(true);
    try {
      const id = await saveClimb({
        name: name.trim(),
        grade: grade.trim() || null,
        gymId,
        wall,
        photoDataUrl: photo?.dataUrl ?? null,
      });
      router.push(`/climbs/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
      setSaving(false);
    }
  };

  if (mode === "camera" && !photo) {
    return (
      <div className="card mx-auto max-w-lg space-y-4 text-center">
        <h2 className="text-lg font-semibold">Photograph the wall</h2>
        <p className="text-sm text-stone-600">
          Stand back and shoot the wall straight on, floor to top. Next you&apos;ll tap each hold of the climb on the photo.
        </p>
        <label className="btn-primary inline-flex cursor-pointer">
          📷 Take or choose a photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            data-testid="photo-input"
            onChange={(e) => onPhoto(e.target.files?.[0])}
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0 space-y-3">
        <HoldPalette value={placeType} onChange={setPlaceType} />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button type="button" className="btn-secondary" onClick={undo} disabled={!past.length}>
            ↶ Undo
          </button>
          <button type="button" className="btn-secondary" onClick={redo} disabled={!future.length}>
            ↷ Redo
          </button>
          <span className="text-stone-500">{wall.holds.length} holds</span>
          {wall.holds.length > 0 && (
            <button
              type="button"
              className="ml-auto text-stone-500 hover:text-red-600"
              onClick={() => {
                setWall({ ...wall, holds: [] });
                setSelectedId(null);
              }}
            >
              Clear all
            </button>
          )}
        </div>
        <WallCanvas
          wall={wall}
          onChange={setWall}
          photoUrl={photo?.dataUrl}
          selectedId={selectedId}
          onSelect={setSelectedId}
          placeType={placeType}
          body={beta.body}
          lastMove={beta.lastMove}
          highlightIds={beta.highlightIds}
          climberHeightCm={climber.heightCm}
          maxHeightPx={760}
        />
        <Legend />
      </section>

      <aside className="min-w-0 space-y-4">
        <div className="card space-y-3">
          <h2 className="font-semibold">Wall</h2>
          <div className="grid grid-cols-3 gap-2 text-sm">
            {mode === "sandbox" && (
              <label>
                <span className="label">Width (cm)</span>
                <input
                  className="input"
                  type="number"
                  min={100}
                  max={2000}
                  value={wall.widthCm}
                  onChange={(e) => setWallRaw({ ...wall, widthCm: Math.max(100, Number(e.target.value) || 100) })}
                />
              </label>
            )}
            <label>
              <span className="label">Height (cm)</span>
              <input className="input" type="number" min={100} max={2000} value={wall.heightCm} onChange={(e) => setWallHeight(Number(e.target.value))} />
            </label>
            <label>
              <span className="label">Angle (°)</span>
              <input
                className="input"
                type="number"
                min={-45}
                max={90}
                value={wall.angleDeg}
                title="0 = vertical, positive = overhang, negative = slab"
                onChange={(e) => {
                  setWallRaw({ ...wall, angleDeg: Number(e.target.value) || 0 });
                  resetBeta();
                }}
              />
            </label>
          </div>
          {mode === "camera" && (
            <p className="text-xs text-stone-500">Set the real height of the photographed wall so reach distances come out right.</p>
          )}
        </div>

        <div className="card">
          <HoldInspector
            hold={selected}
            onChange={updateHold}
            onDelete={() => {
              setWall({ ...wall, holds: wall.holds.filter((h) => h.id !== selectedId) });
              setSelectedId(null);
            }}
          />
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold">Beta</h2>
          <ClimberFields value={climber} onChange={setClimber} />
          <button
            type="button"
            className="btn-primary w-full"
            disabled={problems.length > 0 || beta.solving}
            onClick={() => beta.solveNow(wall, climber)}
          >
            Solve this climb
          </button>
          {problems.length > 0 && <p className="text-xs text-stone-500">{problems.join(" ")}</p>}
          <BetaPanel
            wall={wall}
            result={beta.result}
            solving={beta.solving}
            step={beta.step}
            onStep={beta.setStep}
            playing={beta.playing}
            onPlayingChange={beta.setPlaying}
          />
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold">Save</h2>
          {gym && <p className="text-sm">At <strong>{gym.name}</strong></p>}
          <div className="grid grid-cols-[1fr_90px] gap-2 text-sm">
            <label>
              <span className="label">Name</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Blue corner problem" />
            </label>
            <label>
              <span className="label">Grade</span>
              <input className="input" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="V3" />
            </label>
          </div>
          <button type="button" className="btn-primary w-full" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save climb"}
          </button>
          {!user && (
            <p className="text-xs text-stone-500">
              {isSupabaseConfigured ? (
                <>
                  Not signed in: this climb will only be saved in this browser. <Link href="/login" className="underline">Sign in</Link> to share it.
                </>
              ) : (
                "Running in local mode: climbs are saved in this browser."
              )}
            </p>
          )}
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        </div>
      </aside>
    </div>
  );
}

function Legend() {
  return (
    <p className="text-xs text-stone-500">
      <span className="font-semibold text-green-700">S</span> start · <span className="font-semibold text-red-700">F</span> finish ·{" "}
      {Object.values(HOLD_INFO)
        .map((i) => i.label)
        .join(", ")}
    </p>
  );
}
