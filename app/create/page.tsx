import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/app/auth-controls";
import { createClient } from "@/lib/supabase/server";
import GenerationForm from "./generation-form";

export default async function CreatePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

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

      <section className="account-intro">
        <p className="eyebrow"><span className="status-dot" /> MAKE A NEW NOTE</p>
        <h1>Turn a moment <span>into a caption.</span></h1>
        <p className="intro-copy">A weird subway moment, a dorm-room ritual, a very long line for coffee. Give the caption engine a scene; the community will decide if it lands.</p>
      </section>

      <section className="generator-panel" aria-labelledby="generator-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE PROMPT STUDIO</p>
            <h2 id="generator-heading">What happened?</h2>
          </div>
          <span className="live-label">GEMINI · CAPTION ENGINE</span>
        </div>
        <GenerationForm />
      </section>

      <footer className="site-footer">
        <Link href="/">← Back to the feed</Link>
        <span>Side Notes · Create</span>
      </footer>
    </main>
  );
}
