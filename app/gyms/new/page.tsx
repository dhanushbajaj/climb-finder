import type { Metadata } from "next";
import { Suspense } from "react";
import NewGym from "./NewGym";

export const metadata: Metadata = { title: "Add a gym" };

export default function NewGymPage() {
  return (
    <Suspense>
      <NewGym />
    </Suspense>
  );
}
