"use client";

import type Konva from "konva";
import { useEffect, useMemo, useRef, useState } from "react";
import { Arrow, Circle, Group, Image as KImage, Layer, Line, Rect, RegularPolygon, Stage, Text } from "react-konva";
import { HOLD_INFO, makeHold, type Hold, type HoldType, type Wall } from "@/lib/holds";
import type { BodyState, Limb } from "@/lib/solver/types";

export interface WallCanvasProps {
  wall: Wall;
  onChange?: (wall: Wall) => void;
  photoUrl?: string | null;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  /** hold type to drop on tap/click; null disables placing */
  placeType?: HoldType | null;
  body?: BodyState | null;
  /** limb that just moved, highlighted with an arrow from its previous hold */
  lastMove?: { limb: Limb; from: string | null; to: string | null } | null;
  highlightIds?: string[];
  climberHeightCm?: number;
  /** cap on canvas height in px; the wall is scaled down to fit */
  maxHeightPx?: number;
}

const RADIUS_CM: Record<HoldType, number> = {
  jug: 9,
  crimp: 5,
  sloper: 10,
  pinch: 7,
  pocket: 6,
  sidepull: 7,
  undercling: 7,
  volume: 18,
  foot: 4,
};

const LIMB_COLOR: Record<Limb, string> = { LH: "#f43f5e", RH: "#0ea5e9", LF: "#fb7185", RF: "#38bdf8" };

function usePhoto(url: string | null | undefined) {
  const [loaded, setLoaded] = useState<{ url: string; img: HTMLImageElement } | null>(null);
  useEffect(() => {
    if (!url) return;
    const i = new window.Image();
    i.crossOrigin = "anonymous";
    i.onload = () => setLoaded({ url, img: i });
    i.src = url;
  }, [url]);
  return url && loaded?.url === url ? loaded.img : null;
}

export default function WallCanvas({
  wall,
  onChange,
  photoUrl,
  selectedId,
  onSelect,
  placeType,
  body,
  lastMove,
  highlightIds = [],
  climberHeightCm = 175,
  maxHeightPx,
}: WallCanvasProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxWidth, setBoxWidth] = useState(0);
  const photo = usePhoto(photoUrl);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setBoxWidth(Math.max(200, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Until the container is measured, render nothing so the canvas can't inflate the layout.
  let scale = boxWidth / wall.widthCm;
  if (maxHeightPx && wall.heightCm * scale > maxHeightPx) scale = maxHeightPx / wall.heightCm;
  const W = wall.widthCm * scale;
  const H = wall.heightCm * scale;
  const toPx = (h: { x: number; y: number }) => ({ x: h.x * scale, y: (wall.heightCm - h.y) * scale });
  const toCm = (p: { x: number; y: number }) => ({
    x: Math.round(Math.min(wall.widthCm, Math.max(0, p.x / scale))),
    y: Math.round(Math.min(wall.heightCm, Math.max(0, wall.heightCm - p.y / scale))),
  });
  const byId = useMemo(() => new Map(wall.holds.map((h) => [h.id, h])), [wall.holds]);
  const editable = Boolean(onChange);

  const handleStageTap = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Only taps on empty wall (stage, background, grid) place holds.
    if (e.target.getParent()?.name() === "hold") return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    if (editable && placeType) {
      const { x, y } = toCm(pos);
      const hold = makeHold(placeType, x, y);
      onChange!({ ...wall, holds: [...wall.holds, hold] });
      onSelect?.(hold.id);
    } else {
      onSelect?.(null);
    }
  };

  const moveHold = (id: string, p: { x: number; y: number }) => {
    const { x, y } = toCm(p);
    onChange?.({ ...wall, holds: wall.holds.map((h) => (h.id === id ? { ...h, x, y } : h)) });
  };

  const grid: number[] = [];
  for (let c = 50; c < Math.max(wall.widthCm, wall.heightCm); c += 50) grid.push(c);

  return (
    <div ref={boxRef} className="w-full min-w-0 overflow-hidden" data-testid="wall-canvas">
      {boxWidth > 0 && (
      <Stage
        width={W}
        height={H}
        onClick={handleStageTap}
        onTap={handleStageTap}
        className="mx-auto overflow-hidden rounded-lg"
        style={{ cursor: editable && placeType ? "crosshair" : "default", touchAction: editable ? "none" : "auto" }}
      >
        <Layer>
          {photo ? (
            <KImage image={photo} width={W} height={H} />
          ) : (
            <>
              <Rect width={W} height={H} fill="#e7e2d8" />
              {grid.map((c) =>
                c < wall.widthCm ? (
                  <Line key={`v${c}`} points={[c * scale, 0, c * scale, H]} stroke="#cfc8ba" strokeWidth={c % 100 ? 0.5 : 1} />
                ) : null,
              )}
              {grid.map((c) =>
                c < wall.heightCm ? (
                  <Group key={`h${c}`}>
                    <Line points={[0, H - c * scale, W, H - c * scale]} stroke="#cfc8ba" strokeWidth={c % 100 ? 0.5 : 1} />
                    {c % 100 === 0 && <Text x={4} y={H - c * scale - 12} text={`${c / 100} m`} fontSize={10} fill="#8a8273" />}
                  </Group>
                ) : null,
              )}
            </>
          )}
        </Layer>

        <Layer>
          {wall.holds.map((h) => (
            <HoldShape
              key={h.id}
              hold={h}
              pos={toPx(h)}
              r={Math.max(5, RADIUS_CM[h.type] * scale)}
              selected={h.id === selectedId}
              highlighted={highlightIds.includes(h.id)}
              draggable={editable}
              onSelect={() => onSelect?.(h.id)}
              onDragEnd={(p) => moveHold(h.id, p)}
              onPhoto={Boolean(photo)}
            />
          ))}
        </Layer>

        {body && (
          <Layer listening={false}>
            <BodyOverlay body={body} byId={byId} toPx={toPx} scale={scale} heightCm={climberHeightCm} wallHeightCm={wall.heightCm} />
            {lastMove?.from && lastMove.to && byId.get(lastMove.from) && byId.get(lastMove.to) && (
              <Arrow
                points={[
                  toPx(byId.get(lastMove.from)!).x,
                  toPx(byId.get(lastMove.from)!).y,
                  toPx(byId.get(lastMove.to)!).x,
                  toPx(byId.get(lastMove.to)!).y,
                ]}
                stroke={LIMB_COLOR[lastMove.limb]}
                fill={LIMB_COLOR[lastMove.limb]}
                strokeWidth={2}
                dash={[6, 4]}
                pointerLength={8}
                pointerWidth={8}
              />
            )}
          </Layer>
        )}
      </Stage>
      )}
    </div>
  );
}

function HoldShape({
  hold,
  pos,
  r,
  selected,
  highlighted,
  draggable,
  onSelect,
  onDragEnd,
  onPhoto,
}: {
  hold: Hold;
  pos: { x: number; y: number };
  r: number;
  selected: boolean;
  highlighted: boolean;
  draggable: boolean;
  onSelect: () => void;
  onDragEnd: (p: { x: number; y: number }) => void;
  onPhoto: boolean;
}) {
  const info = HOLD_INFO[hold.type];
  // On a photo, draw outlines so the real hold stays visible.
  const fill = onPhoto ? "rgba(0,0,0,0.05)" : info.color;
  const stroke = onPhoto ? info.color : "#1c1917";
  const select = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    onSelect();
  };
  return (
    <Group
      name="hold"
      x={pos.x}
      y={pos.y}
      draggable={draggable}
      onClick={select}
      onTap={select}
      onDragStart={onSelect}
      onDragEnd={(e) => onDragEnd({ x: e.target.x(), y: e.target.y() })}
    >
      {hold.type === "volume" ? (
        <RegularPolygon sides={5} radius={r} fill={fill} stroke={stroke} strokeWidth={onPhoto ? 3 : 1.5} rotation={hold.orientationDeg} />
      ) : (
        <Circle radius={r} fill={fill} stroke={stroke} strokeWidth={onPhoto ? 3 : 1.5} />
      )}
      {(hold.type === "sidepull" || hold.type === "undercling" || hold.type === "crimp") && (
        // A small tick shows which way the hold faces.
        <Line
          points={[0, 0, 0, r * 0.9]}
          stroke={onPhoto ? info.color : "#1c1917"}
          strokeWidth={2}
          rotation={hold.orientationDeg + (hold.type === "sidepull" ? 90 : hold.type === "undercling" ? 180 : 0)}
        />
      )}
      {hold.role && (
        <>
          <Circle radius={r + 5} stroke={hold.role === "start" ? "#16a34a" : "#dc2626"} strokeWidth={3} />
          <Text
            text={hold.role === "start" ? "S" : "F"}
            x={r + 2}
            y={-r - 14}
            fontSize={13}
            fontStyle="bold"
            fill={hold.role === "start" ? "#16a34a" : "#dc2626"}
          />
        </>
      )}
      {highlighted && <Circle radius={r + 9} stroke="#f59e0b" strokeWidth={3} dash={[4, 3]} />}
      {selected && <Circle radius={r + 4} stroke="#ffffff" strokeWidth={2} dash={[3, 3]} shadowColor="#000" shadowBlur={4} />}
    </Group>
  );
}

function BodyOverlay({
  body,
  byId,
  toPx,
  scale,
  heightCm,
  wallHeightCm,
}: {
  body: BodyState;
  byId: Map<string, Hold>;
  toPx: (p: { x: number; y: number }) => { x: number; y: number };
  scale: number;
  heightCm: number;
  wallHeightCm: number;
}) {
  const lh = byId.get(body.LH);
  const rh = byId.get(body.RH);
  if (!lh || !rh) return null;
  const minHandY = Math.min(lh.y, rh.y);
  const smear = (side: -1 | 1) => ({
    x: (lh.x + rh.x) / 2 + side * 15,
    y: Math.max(0, minHandY - 0.55 * heightCm),
  });
  const lf = body.LF ? byId.get(body.LF)! : smear(-1);
  const rf = body.RF ? byId.get(body.RF)! : smear(1);

  // Hips between the feet and a bit below the hands; shoulders above the hips toward the hands.
  const hip = {
    x: (lh.x + rh.x + lf.x + rf.x) / 4,
    y: Math.min((lf.y + rf.y) / 2 + 0.45 * heightCm, (lh.y + rh.y) / 2 - 0.15 * heightCm),
  };
  const shoulder = {
    x: (hip.x * 2 + (lh.x + rh.x) / 2) / 3,
    y: Math.min(hip.y + 0.3 * heightCm, Math.max(lh.y, rh.y) - 0.05 * heightCm),
  };
  const head = { x: shoulder.x, y: Math.min(wallHeightCm, shoulder.y + 0.12 * heightCm) };
  const P = (p: { x: number; y: number }) => {
    const q = toPx(p);
    return [q.x, q.y];
  };
  const limb = (from: { x: number; y: number }, to: { x: number; y: number }, color: string) => (
    <Line points={[...P(from), ...P(to)]} stroke={color} strokeWidth={Math.max(3, 4 * scale)} lineCap="round" opacity={0.85} />
  );
  const marker = (p: { x: number; y: number }, label: string, color: string, smearing = false) => {
    const q = toPx(p);
    return (
      <Group x={q.x} y={q.y}>
        <Circle radius={9} fill={smearing ? "transparent" : color} stroke={color} strokeWidth={2} dash={smearing ? [3, 2] : undefined} />
        <Text text={label} x={-7} y={-5} fontSize={9} fontStyle="bold" fill={smearing ? color : "#fff"} width={14} align="center" />
      </Group>
    );
  };

  return (
    <Group>
      {limb(hip, shoulder, "#292524")}
      {limb(shoulder, lh, LIMB_COLOR.LH)}
      {limb(shoulder, rh, LIMB_COLOR.RH)}
      {limb(hip, lf, LIMB_COLOR.LF)}
      {limb(hip, rf, LIMB_COLOR.RF)}
      <Circle x={toPx(head).x} y={toPx(head).y} radius={Math.max(8, 11 * scale)} fill="#292524" opacity={0.85} />
      {marker(lh, "LH", LIMB_COLOR.LH)}
      {marker(rh, "RH", LIMB_COLOR.RH)}
      {marker(lf, "LF", LIMB_COLOR.LF, !body.LF)}
      {marker(rf, "RF", LIMB_COLOR.RF, !body.RF)}
    </Group>
  );
}
