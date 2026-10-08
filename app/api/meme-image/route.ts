import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET(request: Request) {
  const supabase = await createClient();
  const imagePath = new URL(request.url).searchParams.get("path") ?? "";
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(imagePath)) {
    return new NextResponse(null, { status: 400 });
  }

  const { data: publishedMeme, error } = await supabase
    .from("caption_generations")
    .select("id")
    .eq("image_path", imagePath)
    .maybeSingle();
  if (error || !publishedMeme) return new NextResponse(null, { status: 404 });

  const { data } = supabase.storage.from("meme-images").getPublicUrl(imagePath);
  const response = await fetch(data.publicUrl, { cache: "no-store" });
  if (!response.ok) {
    return new NextResponse(null, { status: 404 });
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!ALLOWED_TYPES.has(contentType)) return new NextResponse(null, { status: 404 });

  return new NextResponse(response.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
      Vary: "Cookie",
    },
  });
}
