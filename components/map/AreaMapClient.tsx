"use client";

import dynamic from "next/dynamic";

/** Leaflet touches `window` on import, so the map renders client-side only. */
const AreaMapClient = dynamic(() => import("./AreaMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-lg bg-stone-200" />,
});

export default AreaMapClient;
