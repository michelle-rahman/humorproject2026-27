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
          <Link href="/profile">Profile</Link>
          <SignOutButton />
        </nav>
      </header>

      <section className="gated-card member-home" aria-labelledby="member-home-title">
        <p className="eyebrow">THE MEME TEST</p>
        <h1 id="member-home-title">Is AI funny?</h1>
        <p className="member-greeting">Welcome back{name ? `, ${name}` : ""}.</p>
        <p className="intro-copy">
          Start with a topic for a text-only meme, or add an image and context for an image meme. AI writes three captions; pick one to publish, then vote on other posts. The question is whether AI can make a funny meme.
        </p>

        <div className="member-home-actions">
          <Link className="button button-primary" href="/create">Make a meme</Link>
          <Link className="button member-secondary-action" href="/#collection-heading">Judge the feed</Link>
        </div>

        <ol className="member-steps" aria-label="How it works">
          <li>
            <span className="member-step-number">01</span>
            <h2>Choose a format</h2>
            <p>Start with a topic alone, or give the model a photo and context.</p>
          </li>
          <li>
            <span className="member-step-number">02</span>
            <h2>Pick a caption</h2>
            <p>Review three options and publish the one you want people to rate.</p>
          </li>
          <li>
            <span className="member-step-number">03</span>
            <h2>Judge the result</h2>
            <p>Upvote or downvote memes in the feed. Your vote is the verdict.</p>
          </li>
        </ol>
      </section>

      <footer className="site-footer">
        <Link href="/">Back to feed</Link>
        <span>Meme</span>
      </footer>
    </main>
  );
}
