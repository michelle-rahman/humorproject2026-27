import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });

  const imagePath = new URL(request.url).searchParams.get("path") ?? "";
  if (!imagePath || imagePath.length > 512 || imagePath.includes("..")) {
    return new NextResponse(null, { status: 400 });
  }

  const { data: image, error } = await supabase.storage
    .from("meme-images")
    .download(imagePath);
  if (error || !image || !ALLOWED_TYPES.has(image.type)) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(image, {
    headers: {
      "Content-Type": image.type,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      Vary: "Cookie",
    },
  });
}
