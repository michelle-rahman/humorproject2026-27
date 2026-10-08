"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type CaptionOption = { top: string; bottom: string };
type GenerationType = "caption-only" | "image-caption";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export default function GenerationForm() {
  const router = useRouter();
  const [generationType, setGenerationType] = useState<GenerationType>("image-caption");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [context, setContext] = useState("");
  const [captions, setCaptions] = useState<CaptionOption[]>([]);
  const [promptText, setPromptText] = useState("");
  const [selectedCaption, setSelectedCaption] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setError(null);
    setCaptions([]);
    setImagePath(null);
    setPublished(false);
    setPhoto(null);
    setPreview(null);

    if (!file) {
      setPhoto(null);
      setPreview(null);
      return;
    }
    if (!IMAGE_EXTENSIONS[file.type]) {
      setError("Choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Images must be under 5 MB.");
      event.target.value = "";
      return;
    }

    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  async function uploadPhoto() {
    if (imagePath) return imagePath;
    if (!photo) throw new Error("Choose an image first.");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sign in to make a meme.");

    const path = `${user.id}/${crypto.randomUUID()}.${IMAGE_EXTENSIONS[photo.type]}`;
    const { error: uploadError } = await supabase.storage
      .from("meme-images")
      .upload(path, photo, { contentType: photo.type, upsert: false });
    if (uploadError) throw new Error("Image upload failed. Check the Assignment 4 Storage policies.");

    setImagePath(path);
    return path;
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCaptions([]);
    setPublished(false);
    setWorking(true);

    try {
      const path = generationType === "image-caption" ? await uploadPhoto() : null;
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath: path, context }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not generate captions.");

      setCaptions(result.captions as CaptionOption[]);
      setPromptText(result.promptText as string);
      setSelectedCaption(0);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Could not generate captions.");
    } finally {
      setWorking(false);
    }
  }

  async function publish() {
    const caption = captions[selectedCaption];
    if (!caption || (generationType === "image-caption" && !imagePath)) return;
    setError(null);
    setWorking(true);

    try {
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePath: generationType === "image-caption" ? imagePath : null,
          context,
          promptText,
          ...caption,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not publish this meme.");
      setPublished(true);
      router.refresh();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Could not publish this meme.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="meme-maker">
      <form className="generator-form" onSubmit={generate}>
        <fieldset className="generation-modes">
          <legend>Choose a format</legend>
          <label className={generationType === "caption-only" ? "is-active" : ""}>
            <input
              checked={generationType === "caption-only"}
              name="generation-type"
              onChange={() => {
                setGenerationType("caption-only");
                setCaptions([]);
                setPromptText("");
                setPublished(false);
                setError(null);
              }}
              type="radio"
              value="caption-only"
            />
            <span>Caption only</span>
            <small>Start with a topic or situation.</small>
          </label>
          <label className={generationType === "image-caption" ? "is-active" : ""}>
            <input
              checked={generationType === "image-caption"}
              name="generation-type"
              onChange={() => {
                setGenerationType("image-caption");
                setCaptions([]);
                setPromptText("");
                setPublished(false);
                setError(null);
              }}
              type="radio"
              value="image-caption"
            />
            <span>Image + captions</span>
            <small>Upload a photo for AI to caption.</small>
          </label>
        </fieldset>

        {generationType === "image-caption" && (
          <>
            <label className="form-field" htmlFor="meme-image">
              <span>Image</span>
              <input
                id="meme-image"
                accept="image/jpeg,image/png,image/webp"
                onChange={choosePhoto}
                required
                type="file"
              />
              <span className="character-count">JPG, PNG, or WebP · up to 5 MB</span>
            </label>

            {preview && (
              <div className="image-preview-wrap">
                <img className="image-preview" src={preview} alt="Selected upload preview" />
              </div>
            )}
          </>
        )}

        <label className="form-field" htmlFor="image-context">
          <span>
            {generationType === "caption-only" ? "Topic or situation" : "Topic or context"}
            {generationType === "caption-only"
              ? <span className="optional-label">Required</span>
              : <span className="optional-label">Optional</span>}
          </span>
          <textarea
            id="image-context"
            maxLength={500}
            onChange={(event) => {
              setContext(event.target.value);
              setCaptions([]);
              setPromptText("");
              setPublished(false);
            }}
            placeholder={generationType === "caption-only"
              ? "A situation, opinion, or small annoyance for AI to turn into a meme"
              : "A place, situation, inside joke, or detail to riff on"}
            required={generationType === "caption-only"}
            rows={2}
            value={context}
          />
        </label>

        {error && <p className="form-message form-error" role="alert">{error}</p>}

        <button
          className="button button-primary generate-button"
          disabled={working || (generationType === "image-caption" ? !photo : !context.trim())}
          type="submit"
        >
          {working && captions.length === 0
            ? "Giving it a shot…"
            : generationType === "caption-only" ? "Generate captions" : "Generate image captions"}
        </button>
      </form>

      {captions.length > 0 && !published && (
        <section className="caption-options" aria-live="polite">
          <div className="options-heading">
            <h3>Choose one</h3>
            <button className="text-button" disabled={working} onClick={(event) => {
              event.preventDefault();
              const form = event.currentTarget.closest(".meme-maker")?.querySelector("form");
              form?.requestSubmit();
            }} type="button">Try again</button>
          </div>
          <div className="caption-option-list">
            {captions.map((caption, index) => (
              <button
                aria-pressed={selectedCaption === index}
                className={`caption-option${selectedCaption === index ? " is-selected" : ""}`}
                key={`${caption.top}-${caption.bottom}`}
                onClick={() => setSelectedCaption(index)}
                type="button"
              >
                <span className="sr-only">Option {index + 1}. Top text:</span>
                <span className="meme-top-text">{caption.top}</span>
                <span className="sr-only">Bottom text:</span>
                <span className="meme-bottom-text">{caption.bottom}</span>
              </button>
            ))}
          </div>
          <button className="button button-primary generate-button" disabled={working} onClick={publish} type="button">
            {working ? "Publishing…" : "Publish"}
          </button>
        </section>
      )}

      {published && (
        <div className="published-note" role="status">
          <span>Published.</span>
          <Link className="text-link" href="/">View feed</Link>
        </div>
      )}
    </div>
  );
}
