import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Add a climb" };

export default async function NewClimbPage(props: PageProps<"/climbs/new">) {
  const { gym } = await props.searchParams;
  const q = typeof gym === "string" ? `?gym=${encodeURIComponent(gym)}` : "";
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Add a climb</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href={`/climbs/new/camera${q}`} className="card block space-y-2 transition hover:border-orange-300">
          <p className="text-3xl">📷</p>
          <h2 className="font-semibold">From a photo</h2>
          <p className="text-sm text-stone-600">Photograph the wall, then tap each hold of the problem and mark the start and finish.</p>
        </Link>
        <Link href={`/climbs/new/sandbox${q}`} className="card block space-y-2 transition hover:border-orange-300">
          <p className="text-3xl">🧱</p>
          <h2 className="font-semibold">Sandbox builder</h2>
          <p className="text-sm text-stone-600">Set the wall size and angle and place holds of different types on a blank wall.</p>
        </Link>
      </div>
      {!q && (
        <p className="text-sm text-stone-500">
          To attach the climb to a gym, open the gym from <Link className="underline" href="/explore">Explore</Link> and add it there.
        </p>
      )}
    </div>
  );
}
