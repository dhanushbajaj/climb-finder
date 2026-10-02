import type { Metadata } from "next";
import { Suspense } from "react";
import Explore from "./Explore";

export const metadata: Metadata = { title: "Explore" };

export default function ExplorePage() {
  return (
    <Suspense>
      <Explore />
    </Suspense>
  );
}
