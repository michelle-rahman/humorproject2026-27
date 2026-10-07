import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const STYLE_LABELS: Record<string, string> = {
  observational: "sharp, relatable observation",
  absurdist: "playful absurdity",
  wholesome: "warm and gently funny",
  campus_lore: "Columbia campus life and the perspective of a newcomer to New York City",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in before generating a caption." }, { status: 401 });
  }

  let body: { sourceText?: unknown; humorStyle?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a short scene to caption." }, { status: 400 });
  }

  const sourceText = typeof body.sourceText === "string" ? body.sourceText.trim() : "";
  const humorStyle = typeof body.humorStyle === "string" ? body.humorStyle : "";
  if (sourceText.length < 8 || sourceText.length > 500) {
    return NextResponse.json({ error: "Describe a scene in 8 to 500 characters." }, { status: 400 });
  }
  if (!(humorStyle in STYLE_LABELS)) {
    return NextResponse.json({ error: "Choose one of the available humor styles." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Caption generation is not configured yet." }, { status: 503 });
  }

  const promptText = [
    "Write one original, funny caption for a student-life humor feed.",
    `Humor direction: ${STYLE_LABELS[humorStyle]}.`,
    "Keep it under 25 words, specific, and easy to understand without extra context.",
    "Punch up at situations, not at protected traits or a real person's appearance.",
    "Return only the caption, with no quotation marks, explanation, or list.",
    `Scene from the user: ${sourceText}`,
  ].join("\n");

  let generatedCaption: string;
  try {
    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: promptText }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 100 },
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(25_000),
      },
    );

    if (!response.ok) {
      console.error("Gemini generation failed with status", response.status);
      return NextResponse.json(
        { error: "The caption generator is unavailable right now. Please try again shortly." },
        { status: 502 },
      );
    }

    const result = await response.json();
    generatedCaption = result.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join(" ")
      .trim();
    if (!generatedCaption) {
      return NextResponse.json({ error: "The model returned an empty caption. Try another scene." }, { status: 502 });
    }
    generatedCaption = generatedCaption.replace(/^['"“”]+|['"“”]+$/g, "").slice(0, 500);
  } catch (error) {
    console.error("Gemini request could not be completed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json(
      { error: "Could not reach the caption generator. Please try again." },
      { status: 502 },
    );
  }

  const { data: savedRows, error: insertError } = await supabase.rpc("publish_caption_generation", {
    p_source_text: sourceText,
    p_humor_style: humorStyle,
    p_prompt_text: promptText,
    p_caption_text: generatedCaption,
  });
  const generation = Array.isArray(savedRows) ? savedRows[0] : savedRows;

  if (insertError || !generation) {
    console.error("Could not save caption generation", insertError?.code ?? "unknown");
    return NextResponse.json(
      { error: "The caption was generated but could not be saved. Check the Supabase assignment 4 SQL." },
      { status: 500 },
    );
  }

  return NextResponse.json({ generation }, { status: 201 });
}
