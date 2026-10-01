import Link from "next/link";
import { GoogleSignInButton, SignOutButton } from "@/app/auth-controls";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function Home() {
  const supabase = await createClient();
  const [{ data: { user } }, { data: entries, error: captionsError }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("caption_entries")
      .select("id,caption,humor_flavor,prompt_name,upvotes,downvotes,status,created_at")
      .order("created_at", { ascending: false }),
  ]);
  const error = captionsError
    ? "Check that caption_entries exists and allows public reads."
    : null;
  const captionEntries = entries ?? [];

  return (
    <main className="page-shell">
      <header className="site-header">
        <Link className="wordmark" href="#top" aria-label="Side Notes home">
          <span className="wordmark-icon" aria-hidden="true">S</span>
          side notes
        </Link>
        <div className="home-header-right">
          {user ? (
            <nav className="account-nav" aria-label="Account navigation">
              <Link href="/inside">Members</Link>
              <Link href="/profile">Profile</Link>
              <SignOutButton />
            </nav>
          ) : <GoogleSignInButton />}
        </div>
      </header>

      <section className="intro" id="top">
        <p className="eyebrow"><span className="status-dot" /> THE CAPTION COLLECTION</p>
        <h1>Little observations.<br /><span>Big campus energy.</span></h1>
        <p className="intro-copy">
          A growing collection of AI-generated captions inspired by the small,
          familiar absurdities of student life.
        </p>
        <div className="collection-count">
          <span className="count-number">{captionEntries.length.toString().padStart(2, "0")}</span>
          <span className="count-label">captions in the collection</span>
        </div>
      </section>

      <section className="collection" aria-labelledby="collection-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FRESH FROM THE DATABASE</p>
            <h2 id="collection-heading">The latest notes</h2>
          </div>
          <span className="live-label"><span className="status-dot" /> LIVE COLLECTION</span>
        </div>

        {error ? (
          <div className="message-card" role="status">
            <span className="message-icon" aria-hidden="true">!</span>
            <div>
              <h3>We couldn’t load the captions.</h3>
              <p>{error}</p>
            </div>
          </div>
        ) : captionEntries.length === 0 ? (
          <div className="message-card">
            <span className="message-icon" aria-hidden="true">✳</span>
            <div>
              <h3>The collection is waiting for its first note.</h3>
              <p>Add a row to <code>caption_entries</code> in Supabase and it will show up here.</p>
            </div>
          </div>
        ) : (
          <div className="caption-grid">
            {captionEntries.map((entry, index) => (
              <article className="caption-card" key={entry.id}>
                <div className="card-topline">
                  <span className="card-index">NOTE {String(index + 1).padStart(2, "0")}</span>
                  <span className={`status-tag status-${entry.status}`}>{entry.status}</span>
                </div>
                <p className="caption-text">“{entry.caption}”</p>
                <div className="tag-row">
                  <span className="flavor-tag">{entry.humor_flavor}</span>
                  <span className="prompt-label">{entry.prompt_name}</span>
                </div>
                <footer className="card-footer">
                  <span>{formatDate(entry.created_at)}</span>
                  <span className="votes" aria-label={`${entry.upvotes} upvotes and ${entry.downvotes} downvotes`}>
                    <span>↑ {entry.upvotes}</span>
                    <span>↓ {entry.downvotes}</span>
                  </span>
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="site-footer">
        <span>Made for the moments between classes.</span>
        <span>One caption at a time <span aria-hidden="true">✳</span></span>
      </footer>
    </main>
  );
}
