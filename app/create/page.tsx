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
        <p className="intro-copy">Add an image and a topic or context. AI will take a shot at the caption; people will rate the result.</p>
      </section>

      <section className="generator-panel" aria-labelledby="generator-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">NEW POST</p>
            <h2 id="generator-heading">Give it something to work with.</h2>
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
