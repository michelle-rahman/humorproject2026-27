"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function GoogleSignInButton() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  }

  return (
    <div className="auth-control">
      <button className="button button-primary" type="button" onClick={signIn} disabled={loading}>
        <GoogleMark />
        {loading ? "Opening Google…" : "Continue with Google"}
      </button>
      {error && <p className="auth-error">{error}</p>}
    </div>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signOut();
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="auth-control">
      <button className="button button-quiet" type="button" onClick={signOut} disabled={loading}>
        {loading ? "Signing out…" : "Sign out"}
      </button>
      {error && <p className="auth-error">{error}</p>}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="google-mark" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 4)" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.73 7.18l7.62 5.91c4.45-4.11 7.15-10.17 7.15-17.56Z" />
      <path fill="#FBBC05" d="M10.53 28.59A14.37 14.37 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.89 23.89 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z" transform="translate(0 4)" />
      <path fill="#34A853" d="M24 48c6.47 0 11.91-2.13 15.88-5.79l-7.62-5.91c-2.12 1.42-4.83 2.26-8.26 2.26-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
    </svg>
  );
}
