import Link from "next/link";
import HomeSearch from "./HomeSearch";

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="mx-auto max-w-2xl space-y-5 pt-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Find a climb. Get the beta.</h1>
        <p className="text-stone-600">
          See outdoor crags and indoor gyms around any place, add problems from a photo or a sandbox wall, and get a move-by-move
          sequence worked out for your height and reach.
        </p>
        <div className="card text-left">
          <HomeSearch />
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        <Feature title="Explore an area" href="/explore" body="Outdoor crags from OpenBeta and indoor gyms from OpenStreetMap and the community, on one map." />
        <Feature title="Photograph a wall" href="/climbs/new/camera" body="Snap the wall, tap the holds of your problem, mark start and finish." />
        <Feature title="Build in the sandbox" href="/climbs/new/sandbox" body="Drop jugs, crimps, slopers, pinches and more on a blank wall at any angle." />
      </section>
    </div>
  );
}

function Feature({ title, body, href }: { title: string; body: string; href: string }) {
  return (
    <Link href={href} className="card block transition hover:border-orange-300 hover:shadow">
      <h2 className="font-semibold">{title} →</h2>
      <p className="mt-1 text-sm text-stone-600">{body}</p>
    </Link>
  );
}
