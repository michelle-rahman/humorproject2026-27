import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const maxDuration = 60;

type CaptionOption = { top: string; bottom: string };

function parseJsonObject(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    if (start < 0) throw new Error("No JSON object in model response");

    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < cleaned.length; index += 1) {
      const character = cleaned[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') inString = true;
      else if (character === "{") depth += 1;
      else if (character === "}") {
        depth -= 1;
        if (depth === 0) return JSON.parse(cleaned.slice(start, index + 1));
      }
    }
    throw new Error("Incomplete JSON object in model response");
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to make a meme." }, { status: 401 });
  }

  let body: { imagePath?: unknown; context?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Choose an image first." }, { status: 400 });
  }

  const imagePath = typeof body.imagePath === "string" ? body.imagePath : "";
  const context = typeof body.context === "string" ? body.context.trim() : "";
  if (!imagePath.startsWith(`${user.id}/`) || imagePath.includes("..")) {
    return NextResponse.json({ error: "That image could not be accessed." }, { status: 400 });
  }
  if (context.length > 500) {
    return NextResponse.json({ error: "Keep context under 500 characters." }, { status: 400 });
  }

  const { data: image, error: imageError } = await supabase.storage
    .from("meme-images")
    .download(imagePath);
  if (imageError || !image) {
    return NextResponse.json({ error: "Could not load that image. Try uploading it again." }, { status: 400 });
  }
  if (!IMAGE_TYPES.has(image.type) || image.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Use a JPG, PNG, or WebP image under 5 MB." }, { status: 400 });
  }

  const promptText = [
    "Look closely at the attached image and write three distinct, genuinely funny meme captions about what is actually visible. The goal is to test whether AI can be funny; do not claim that the result is funny or explain the joke.",
    "Avoid stock meme formats, familiar internet catchphrases, generic observations, and forced punchlines. Prefer precise, surprising details and concise writing. If context is provided, use it as the angle rather than merely repeating it.",
    "Return only valid JSON in this shape: {\"captions\":[{\"top\":\"...\",\"bottom\":\"...\"},{\"top\":\"...\",\"bottom\":\"...\"},{\"top\":\"...\",\"bottom\":\"...\"}]}.",
    "Each option has a short top line and a short bottom line. Keep the language natural, specific, dry, and concise.",
    "Give each option a different joke or observation. Avoid familiar meme templates, catchphrases, generic campus or city jokes, emojis, hashtags, and forced slang.",
    "Do not guess a person's identity, private traits, or feelings. Do not make the person the target of the joke.",
    `Additional context from the uploader: ${context || "None."}`,
  ].join("\n");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Caption generation is not configured yet." }, { status: 503 });
  }

  try {
    const base64Image = Buffer.from(await image.arrayBuffer()).toString("base64");
    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { inline_data: { mime_type: image.type, data: base64Image } },
              { text: promptText },
            ],
          }],
          generationConfig: {
            temperature: 1,
            maxOutputTokens: 500,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                captions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      top: { type: "string" },
                      bottom: { type: "string" },
                    },
                    required: ["top", "bottom"],
                  },
                },
              },
              required: ["captions"],
            },
          },
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(55_000),
      },
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null) as {
        error?: { message?: string; status?: string };
      } | null;
      const details = (errorBody?.error?.message ?? response.statusText)
        .replace(/AIza[\w-]{20,}/g, "[redacted]")
        .slice(0, 240);
      console.error("Gemini generation failed", response.status, errorBody?.error?.status ?? "unknown");

      let reason = `Gemini returned HTTP ${response.status}`;
      if (response.status === 401 || response.status === 403) {
        reason += ". Check that GEMINI_API_KEY is valid and has Gemini API access";
      } else if (response.status === 429) {
        reason += ". The API quota or rate limit was reached";
      } else if (response.status >= 500) {
        reason += ". The Gemini service is temporarily unavailable";
      }
      if (details) reason += `: ${details}`;
      return NextResponse.json({ error: reason }, { status: 502 });
    }

    let result: {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    try {
      result = await response.json();
    } catch {
      console.error("Gemini returned a non-JSON success response");
      return NextResponse.json(
        { error: "Gemini returned an unreadable response. Please try again." },
        { status: 502 },
      );
    }
    const rawText = result.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("")
      .trim();
    if (!rawText) {
      return NextResponse.json({ error: "No captions came back. Try another image." }, { status: 502 });
    }

    let parsed: { captions?: CaptionOption[] };
    try {
      parsed = parseJsonObject(rawText) as { captions?: CaptionOption[] };
    } catch {
      console.error("Gemini returned invalid JSON for generated captions");
      return NextResponse.json(
        { error: "Gemini's response did not contain complete caption data. Please try again." },
        { status: 502 },
      );
    }
    const captions = Array.isArray(parsed.captions)
      ? parsed.captions.slice(0, 3).map((caption) => ({
          top: typeof caption.top === "string" ? caption.top.trim().slice(0, 160) : "",
          bottom: typeof caption.bottom === "string" ? caption.bottom.trim().slice(0, 160) : "",
        })).filter((caption) => caption.top && caption.bottom)
      : [];

    if (captions.length !== 3) {
      return NextResponse.json({ error: "The captions came back in an unexpected format. Try again." }, { status: 502 });
    }

    return NextResponse.json({ captions, imagePath, context, promptText });
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("Gemini request could not be completed", errorName);
    if (errorName === "TimeoutError") {
      return NextResponse.json(
        { error: "Gemini took too long to respond. Please try again." },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: "The app could not connect to Gemini. Check this deployment's Runtime Logs." },
      { status: 502 },
    );
  }
}
