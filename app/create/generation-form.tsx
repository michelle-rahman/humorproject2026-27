"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

type GeneratedCaption = {
  id: string;
  caption_text: string;
  humor_style: string;
  upvotes: number;
  downvotes: number;
};

const HUMOR_STYLES = [
  { value: "campus_lore", label: "Campus & city lore" },
  { value: "observational", label: "Sharp observation" },
  { value: "absurdist", label: "Playful absurdity" },
  { value: "wholesome", label: "Warm and wholesome" },
];

export default function GenerationForm() {
  const [sourceText, setSourceText] = useState("");
  const [humorStyle, setHumorStyle] = useState(HUMOR_STYLES[0].value);
  const [generation, setGeneration] = useState<GeneratedCaption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setGeneration(null);
    setLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText, humorStyle }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Could not generate a caption.");
      } else {
        setGeneration(result.generation as GeneratedCaption);
        setSourceText("");
      }
    } catch {
      setError("Could not reach the caption engine. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="generator-content">
      <form className="generator-form" onSubmit={generate}>
        <label className="form-field" htmlFor="scene-input">
          <span>Your scene</span>
          <textarea
            id="scene-input"
            maxLength={500}
            minLength={8}
            onChange={(event) => setSourceText(event.target.value)}
            placeholder="A Midwesterner on the subway trying to tell whether the person next to them is singing or just talking loudly on AirPods…"
            required
            rows={5}
            value={sourceText}
          />
          <span className="character-count">{sourceText.length}/500 · Leave out real names and private details.</span>
        </label>

        <label className="form-field" htmlFor="humor-style">
          <span>Humor direction</span>
          <select id="humor-style" onChange={(event) => setHumorStyle(event.target.value)} value={humorStyle}>
            {HUMOR_STYLES.map((style) => <option key={style.value} value={style.value}>{style.label}</option>)}
          </select>
        </label>

        {error && <p className="form-message form-error" role="alert">{error}</p>}

        <button className="button button-primary generate-button" disabled={loading || sourceText.trim().length < 8} type="submit">
          {loading ? <><span className="loading-dot" /> Finding the funny…</> : "Generate my caption"}
        </button>
        <p className="prompt-note">Your scene and the exact prompt are saved with the caption so the experiment stays traceable.</p>
      </form>

      {generation && (
        <section className="generated-result" aria-live="polite">
          <p className="eyebrow"><span className="status-dot" /> YOUR CAPTION IS IN THE FEED</p>
          <blockquote>“{generation.caption_text}”</blockquote>
          <div className="result-footer">
            <span className="flavor-tag">{HUMOR_STYLES.find((style) => style.value === generation.humor_style)?.label ?? generation.humor_style}</span>
            <Link className="text-link" href="/">See the caption in the feed →</Link>
          </div>
        </section>
      )}
    </div>
  );
}
