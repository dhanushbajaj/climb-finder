import type { Metadata } from "next";
import { Suspense } from "react";
import ClimbBuilder from "@/components/builder/ClimbBuilder";

export const metadata: Metadata = { title: "Sandbox builder" };

export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Sandbox builder</h1>
      <Suspense>
        <ClimbBuilder mode="sandbox" />
      </Suspense>
    </div>
  );
}
