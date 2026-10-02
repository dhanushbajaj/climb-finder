"use client";

import dynamic from "next/dynamic";

/** Konva needs the browser canvas, so the wall is rendered client-side only. */
const WallCanvasClient = dynamic(() => import("./WallCanvas"), {
  ssr: false,
  loading: () => <div className="aspect-[3/4] w-full animate-pulse rounded-lg bg-stone-200" />,
});

export default WallCanvasClient;
