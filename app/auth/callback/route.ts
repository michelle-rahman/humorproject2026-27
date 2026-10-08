import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/?auth=error", requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/?auth=error", requestUrl.origin));
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return NextResponse.redirect(new URL("/?auth=error", requestUrl.origin));
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("first_name,last_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profileError && (!profile?.first_name?.trim() || !profile?.last_name?.trim())) {
    return NextResponse.redirect(new URL("/profile", requestUrl.origin));
  }

  return NextResponse.redirect(new URL("/inside", requestUrl.origin));
}
