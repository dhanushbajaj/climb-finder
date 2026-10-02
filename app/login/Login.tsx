"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

export default function Login() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error") ? "Sign-in link was invalid or expired." : null);
  const sb = getSupabase();

  if (!sb) {
    return (
      <div className="card mx-auto max-w-md">
        <p>Accounts aren&apos;t set up on this deployment (no Supabase keys). Climbs are saved in your browser instead.</p>
      </div>
    );
  }

  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const magicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    if (error) setError(error.message);
    else setSent(true);
  };

  const google = async () => {
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) setError(error.message);
  };

  return (
    <div className="card mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Sign in</h1>
      {sent ? (
        <p>Check {email} for a sign-in link.</p>
      ) : (
        <form onSubmit={magicLink} className="space-y-3">
          <label className="block text-sm">
            <span className="label">Email</span>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className="btn-primary w-full">Email me a link</button>
        </form>
      )}
      <div className="flex items-center gap-2 text-xs text-stone-400">
        <span className="h-px flex-1 bg-stone-200" /> or <span className="h-px flex-1 bg-stone-200" />
      </div>
      <button type="button" className="btn-secondary w-full" onClick={google}>
        Continue with Google
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
