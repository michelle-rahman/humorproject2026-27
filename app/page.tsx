type CaptionEntry = {
  id: number;
  caption: string;
  humor_flavor: string;
  prompt_name: string;
  upvotes: number;
  downvotes: number;
  status: "draft" | "published" | "archived";
  created_at: string;
};

async function getCaptionEntries(): Promise<{
  entries: CaptionEntry[];
  error: string | null;
}> {
  const projectUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!projectUrl || !anonKey) {
    return {
      entries: [],
      error: "Add SUPABASE_URL and SUPABASE_ANON_KEY to your environment variables.",
    };
  }

  try {
    const response = await fetch(
      `${projectUrl}/rest/v1/caption_entries?select=id,caption,humor_flavor,prompt_name,upvotes,downvotes,status,created_at&order=created_at.desc`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return {
        entries: [],
        error: `Supabase returned an error (${response.status}). Check that caption_entries exists and allows public reads.`,
      };
    }

    return { entries: (await response.json()) as CaptionEntry[], error: null };
  } catch {
    return {
      entries: [],
      error: "Could not connect to Supabase. Check the project URL and try again.",
    };
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function Home() {
  const { entries, error } = await getCaptionEntries();

  return (
    <main className="page-shell">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Side Notes home">
          <span className="wordmark-icon" aria-hidden="true">S</span>
          side notes
        </a>
        <span className="header-label">A tiny humor archive</span>
      </header>

      <section className="intro" id="top">
        <p className="eyebrow"><span className="status-dot" /> THE CAPTION COLLECTION</p>
        <h1>Little observations.<br /><span>Big campus energy.</span></h1>
        <p className="intro-copy">
          A growing collection of AI-generated captions inspired by the small,
          familiar absurdities of student life.
        </p>
        <div className="collection-count">
          <span className="count-number">{entries.length.toString().padStart(2, "0")}</span>
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
        ) : entries.length === 0 ? (
          <div className="message-card">
            <span className="message-icon" aria-hidden="true">✳</span>
            <div>
              <h3>The collection is waiting for its first note.</h3>
              <p>Add a row to <code>caption_entries</code> in Supabase and it will show up here.</p>
            </div>
          </div>
        ) : (
          <div className="caption-grid">
            {entries.map((entry, index) => (
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
