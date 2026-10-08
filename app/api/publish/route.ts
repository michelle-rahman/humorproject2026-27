import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to publish a meme." }, { status: 401 });
  }

  let body: {
    imagePath?: unknown;
    context?: unknown;
    promptText?: unknown;
    top?: unknown;
    bottom?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Choose a caption before publishing." }, { status: 400 });
  }

  const imagePath = typeof body.imagePath === "string" ? body.imagePath : "";
  const context = typeof body.context === "string" ? body.context.trim() : "";
  const promptText = typeof body.promptText === "string" ? body.promptText : "";
  const top = typeof body.top === "string" ? body.top.trim() : "";
  const bottom = typeof body.bottom === "string" ? body.bottom.trim() : "";

  if (!imagePath.startsWith(`${user.id}/`) || imagePath.includes("..")) {
    return NextResponse.json({ error: "That image could not be accessed." }, { status: 400 });
  }
  if (context.length > 500) {
    return NextResponse.json({ error: "Keep context under 500 characters." }, { status: 400 });
  }
  if (!top || !bottom || top.length > 160 || bottom.length > 160) {
    return NextResponse.json({ error: "Choose a valid caption." }, { status: 400 });
  }
  if (!promptText || promptText.length > 4000) {
    return NextResponse.json({ error: "Caption prompt is missing. Generate again." }, { status: 400 });
  }

  const { error: imageError } = await supabase.storage
    .from("meme-images")
    .download(imagePath);
  if (imageError) {
    return NextResponse.json({ error: "Could not access the uploaded image. Generate again." }, { status: 400 });
  }

  const { data: savedRows, error } = await supabase.rpc("publish_caption_generation", {
    p_source_text: context || null,
    p_humor_style: "observational",
    p_prompt_text: promptText,
    p_caption_text: `${top}\n${bottom}`,
    p_image_path: imagePath,
  });
  const generation = Array.isArray(savedRows) ? savedRows[0] : savedRows;

  if (error || !generation) {
    console.error("Could not save meme", error?.code ?? "unknown");
    return NextResponse.json(
      { error: "Could not publish this meme. Check the Assignment 4 SQL and try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ generation }, { status: 201 });
}
