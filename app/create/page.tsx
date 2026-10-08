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
          <span className="wordmark-icon" aria-hidden="true">m</span>
          meme
        </Link>
        <nav className="account-nav" aria-label="Account navigation">
          <Link href="/profile">Profile</Link>
          <SignOutButton />
        </nav>
      </header>

      <section className="account-intro">
        <p className="eyebrow">PUT AI TO THE TEST</p>
        <h1>Can AI be funny?</h1>
        <p className="intro-copy">Start with a topic for text-only captions, or add an image and context for an image meme. Pick one of three options to publish.</p>
      </section>

      <section className="generator-panel" aria-labelledby="generator-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">NEW POST</p>
            <h2 id="generator-heading">Choose a format.</h2>
          </div>
        </div>
        <GenerationForm />
      </section>

      <footer className="site-footer">
        <Link href="/">← Back to the feed</Link>
        <span>Meme</span>
      </footer>
    </main>
  );
}
