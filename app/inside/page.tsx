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
          <span className="wordmark-icon" aria-hidden="true">S</span>
          side notes
        </Link>
        <nav className="account-nav" aria-label="Account navigation">
          <Link href="/profile">Profile</Link>
          <SignOutButton />
        </nav>
      </header>

      <section className="gated-card">
        <p className="eyebrow"><span className="status-dot" /> MEMBERS ONLY</p>
        <h1>You made <span>it inside.</span></h1>
        <p className="intro-copy">
          {name ? `Welcome, ${name}. ` : "Welcome. "}This members-only corner is visible after you sign in.
        </p>
        <div className="gated-note">
          <span className="gated-star" aria-hidden="true">✳</span>
          <div>
            <p className="eyebrow">A PRIVATE LITTLE PREVIEW</p>
            <p>The best campus stories usually start with “you had to be there.” This space is just for the people who were.</p>
          </div>
        </div>
        <Link className="text-link" href="/profile">Edit your profile <span aria-hidden="true">→</span></Link>
      </section>

      <footer className="site-footer">
        <Link href="/">← Back to the collection</Link>
        <span>Side Notes · Members</span>
      </footer>
    </main>
  );
}
