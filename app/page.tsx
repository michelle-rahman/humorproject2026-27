import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { GoogleSignInButton, SignOutButton } from "@/app/auth-controls";
import { createClient } from "@/lib/supabase/server";
import VoteButtons from "@/app/vote-buttons";
import JoinPrompt from "@/app/join-prompt";

type CaptionGeneration = {
  id: string;
  image_path: string | null;
  caption_text: string;
  humor_style: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
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

      const { data: votes, error: votesError } = await supabase
        .from("caption_votes")
        .select("generation_id,vote")
        .eq("user_id", user.id);
      if (votesError) throw votesError;
      votesByGeneration = Object.fromEntries(
        (votes ?? []).map((vote) => [vote.generation_id, vote.vote]),
      );
    }

    const { data, error } = await supabase
      .from("caption_generations")
      .select("id,image_path,caption_text,humor_style,upvotes,downvotes,created_at")
      .not("image_path", "is", null)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) throw error;
    generations = (data ?? []) as CaptionGeneration[];
  } catch (error) {
    console.error("Caption feed could not load", error instanceof Error ? error.name : "UnknownError");
    feedError = "The caption feed is temporarily unavailable. Confirm that the Assignment 4 SQL has been run in Supabase.";
  }

  return (
    <main className="page-shell">
      <header className="site-header">
        <Link className="wordmark" href="#top" aria-label="Meme home">
          <span className="wordmark-icon" aria-hidden="true">m</span>
          meme
        </Link>
        <div className="home-header-right">
          {user ? (
            <nav className="account-nav" aria-label="Account navigation">
              <Link href="/profile">Profile</Link>
              <SignOutButton />
            </nav>
          ) : <GoogleSignInButton />}
        </div>
      </header>

      <section className="intro" id="top">
        <p className="eyebrow">AN OPEN QUESTION</p>
        <h1>Is AI funny?</h1>
        {user && showWelcome && (
          <p className="welcome-message" role="status">
            Welcome back{firstName ? `, ${firstName}` : ""}.
          </p>
        )}
        <p className="intro-copy">Give AI an image and some context. It takes a shot at the meme. You be the judge.</p>
        {user ? (
          <Link className="button button-primary hero-cta" href="/create">Create a meme</Link>
        ) : (
          <JoinPrompt className="button button-primary hero-cta" label="Create a meme" />
        )}
      </section>

      <section className="collection" aria-labelledby="collection-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FEED</p>
            <h2 id="collection-heading">The feed</h2>
            <p className="feed-description">AI-generated memes, rated by people.</p>
          </div>
        </div>

        {feedError ? (
          <div className="message-card" role="status">
            <span className="message-icon" aria-hidden="true">!</span>
            <div>
              <h3>Could not load the feed.</h3>
              <p>{feedError}</p>
            </div>
          </div>
        ) : generations.length === 0 ? (
          <div className="message-card empty-feed">
            <div>
              <h3>No memes yet.</h3>
              {user ? <Link className="text-link" href="/create">Create a meme</Link> : <JoinPrompt className="text-link" label="Create a meme" />}
            </div>
          </div>
        ) : (
          <div className="caption-grid">
            {generations.map((generation) => (
              <article className="caption-card" key={generation.id}>
                <div className="meme-image-wrap">
                  {generation.image_path && (
                    <img
                      className="meme-image"
                      src={`/api/meme-image?path=${encodeURIComponent(generation.image_path)}`}
                      alt="User-submitted meme image"
                    />
                  )}
                  <div className="meme-overlay" aria-label={generation.caption_text.replace("\n", ". ")}>
                    {generation.caption_text.split("\n").map((line, lineIndex) => (
                      <span className={lineIndex === 0 ? "meme-top-text" : "meme-bottom-text"} key={`${generation.id}-${lineIndex}`}>
                        {line}
                      </span>
                    ))}
                  </div>
                </div>
                <footer className="card-footer">
                  <span>{formatDate(generation.created_at)}</span>
                  <VoteButtons
                    key={`${generation.id}-${generation.upvotes}-${generation.downvotes}-${votesByGeneration[generation.id] ?? "none"}`}
                    generationId={generation.id}
                    initialUpvotes={generation.upvotes}
                    initialDownvotes={generation.downvotes}
                    initialVote={votesByGeneration[generation.id] ?? null}
                    signedIn={Boolean(user)}
                  />
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="site-footer">
        <span>Image / text</span>
        <span>Meme</span>
      </footer>
    </main>
  );
}
