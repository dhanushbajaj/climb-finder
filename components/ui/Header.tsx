"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/lib/hooks";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/climbs/new", label: "Add climb" },
  { href: "/climbs", label: "My climbs" },
];

export default function Header() {
  const pathname = usePathname();
  const { user } = useUser();
  return (
    <header className="sticky top-0 z-[1000] border-b border-stone-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto whitespace-nowrap px-4 py-3 text-sm">
        <Link href="/" className="mr-2 flex items-center gap-2 font-bold tracking-tight sm:mr-4" aria-label="Climb Finder home">
          <span aria-hidden className="text-lg">🧗</span> <span className="hidden sm:inline">Climb Finder</span>
        </Link>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-md px-2 py-1.5 sm:px-3 ${pathname === l.href ? "bg-stone-100 font-semibold" : "text-stone-600 hover:text-stone-900"}`}
          >
            {l.label}
          </Link>
        ))}
        <span className="ml-auto" />
        {isSupabaseConfigured && (
          <Link href={user ? "/profile" : "/login"} className="btn-secondary">
            {user ? "Profile" : "Sign in"}
          </Link>
        )}
        {!isSupabaseConfigured && (
          <Link href="/profile" className="text-stone-600 hover:text-stone-900">
            My size
          </Link>
        )}
      </nav>
    </header>
  );
}
