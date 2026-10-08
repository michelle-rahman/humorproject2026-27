import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/app/auth-controls";
import { createClient } from "@/lib/supabase/server";

export default async function MembersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name,last_name")
    .eq("id", user.id)
    .maybeSingle();
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");

  return (
    <main className="page-shell account-shell">
      <header className="site-header">
        <Link className="wordmark" href="/">
          <span className="wordmark-icon" aria-hidden="true">m</span>
          meme
        </Link>
        <nav className="account-nav" aria-label="Account navigation">
          <Link href="/">Feed</Link>
          <SignOutButton />
        </nav>
      </header>

      <section className="gated-card">
        <p className="eyebrow">ACCOUNT</p>
        <h1>{name ? `Hello, ${name}.` : "Hello."}</h1>
        <p className="intro-copy">You’re signed in.</p>
        <Link className="text-link" href="/profile">Edit profile</Link>
      </section>

      <footer className="site-footer">
        <Link href="/">Back to feed</Link>
        <span>Meme</span>
      </footer>
    </main>
  );
}
