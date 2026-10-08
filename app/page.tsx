import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { GoogleSignInButton, SignOutButton } from "@/app/auth-controls";
import { createClient } from "@/lib/supabase/server";
import VoteButtons from "@/app/vote-buttons";

type CaptionGeneration = {
  id: string;
  caption_text: string;
  humor_style: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
};

const STYLE_LABELS: Record<string, string> = {
  campus_lore: "Campus & city lore",
  observational: "Sharp observation",
  absurdist: "Playful absurdity",
  wholesome: "Warm and wholesome",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const showWelcome = params.welcome === "1";
  let user: User | null = null;
  let generations: CaptionGeneration[] = [];
  let votesByGeneration: Record<string, number> = {};
  let feedError: string | null = null;
  let firstName: string | null = null;

  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    user = userData.user;

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .maybeSingle();
      firstName = profile?.first_name?.trim() || null;

      const { data, error } = await supabase
        .from("caption_generations")
        .select("id,caption_text,humor_style,upvotes,downvotes,created_at")
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      generations = (data ?? []) as CaptionGeneration[];

      const { data: votes, error: votesError } = await supabase
        .from("caption_votes")
        .select("generation_id,vote")
        .eq("user_id", user.id);
      if (votesError) throw votesError;
      votesByGeneration = Object.fromEntries(
        (votes ?? []).map((vote) => [vote.generation_id, vote.vote]),
      );
    }
  } catch (error) {
    console.error("Caption feed could not load", error instanceof Error ? error.name : "UnknownError");
    feedError = "The caption feed is temporarily unavailable. Confirm that the Assignment 4 SQL has been run in Supabase.";
  }

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
        {user && showWelcome && (
          <p className="welcome-message" role="status">
            Welcome back{firstName ? `, ${firstName}` : ""}! Your caption collection is ready.
          </p>
        )}
        <p className="intro-copy">
          Side Notes turns campus and city moments into captions, then lets the
          community decide what lands. New York is weird enough already.
        </p>
        {user && <div className="collection-count">
          <span className="count-number">{generations.length.toString().padStart(2, "0")}</span>
          <span className="count-label">community captions</span>
        </div>}
      </section>

      <section className="collection" aria-labelledby="collection-heading">
        {user ? (
          <>
            <div className="section-heading">
              <div>
                <p className="eyebrow">MADE HERE, RATED HERE</p>
                <h2 id="collection-heading">The latest notes</h2>
              </div>
              <div className="feed-actions">
                <span className="live-label"><span className="status-dot" /> LIVE FEED</span>
                <Link className="button button-primary create-cta" href="/create">Make a caption <span aria-hidden="true">↗</span></Link>
              </div>
            </div>

            {feedError ? (
              <div className="message-card" role="status">
                <span className="message-icon" aria-hidden="true">!</span>
                <div>
                  <h3>We couldn’t load the captions.</h3>
                  <p>{feedError}</p>
                </div>
              </div>
            ) : generations.length === 0 ? (
              <div className="message-card empty-feed">
                <span className="message-icon" aria-hidden="true">✳</span>
                <div>
                  <h3>The feed is waiting for its first caption.</h3>
                  <p>Make the first note from a small campus or city moment.</p>
                  <Link className="text-link" href="/create">Open the prompt studio →</Link>
                </div>
              </div>
            ) : (
              <div className="caption-grid">
                {generations.map((generation, index) => (
                  <article className="caption-card" key={generation.id}>
                    <div className="card-topline">
                      <span className="card-index">NOTE {String(index + 1).padStart(2, "0")}</span>
                      <span className="status-tag status-published">AI GENERATED</span>
                    </div>
                    <p className="caption-text">“{generation.caption_text}”</p>
                    <div className="tag-row">
                      <span className="flavor-tag">{STYLE_LABELS[generation.humor_style] ?? generation.humor_style}</span>
                      <span className="prompt-label">Side Notes caption engine</span>
                    </div>
                    <footer className="card-footer">
                      <span>{formatDate(generation.created_at)}</span>
                      <VoteButtons
                        key={`${generation.id}-${generation.upvotes}-${generation.downvotes}-${votesByGeneration[generation.id] ?? "none"}`}
                        generationId={generation.id}
                        initialUpvotes={generation.upvotes}
                        initialDownvotes={generation.downvotes}
                        initialVote={votesByGeneration[generation.id] ?? null}
                        signedIn
                      />
                    </footer>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="member-gate">
            <p className="eyebrow">MEMBERS ONLY</p>
            <h2 id="collection-heading">Captions are available to signed-in users.</h2>
            <p>Sign in with Google to explore the caption feed, create captions, and vote on them.</p>
            <GoogleSignInButton />
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
