import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/app/auth-controls";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name,last_name,avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const userMetadata = user.user_metadata ?? {};
  const firstName = profile?.first_name ??
    (typeof userMetadata.given_name === "string" ? userMetadata.given_name : "");
  const lastName = profile?.last_name ??
    (typeof userMetadata.family_name === "string" ? userMetadata.family_name : "");
  const profileNeedsNames = !firstName.trim() || !lastName.trim();

  return (
    <main className="page-shell account-shell">
      <header className="site-header">
        <Link className="wordmark" href="/">
          <span className="wordmark-icon" aria-hidden="true">S</span>
          side notes
        </Link>
        <nav className="account-nav" aria-label="Account navigation">
          <Link href="/inside">Members</Link>
          <SignOutButton />
        </nav>
      </header>

      <section className="account-intro">
        <p className="eyebrow"><span className="status-dot" /> YOUR CORNER OF THE ARCHIVE</p>
        <h1>Your <span>profile.</span></h1>
        <p className="intro-copy">A little about the person behind the punchline.</p>
      </section>

      <section className="profile-panel" aria-labelledby="profile-heading">
        <div className="profile-panel-heading">
          <div>
            <p className="eyebrow">PROFILE DETAILS</p>
            <h2 id="profile-heading">The essentials</h2>
          </div>
          <span className="email-chip">{user.email}</span>
        </div>

        {profileNeedsNames && (
          <div className="profile-prompt" role="status">
            <span aria-hidden="true">✳</span>
            <p><strong>One small thing before you explore:</strong> add your first and last name to finish setting up your profile.</p>
          </div>
        )}

        <ProfileForm
          userId={user.id}
          initialFirstName={firstName}
          initialLastName={lastName}
          initialAvatarUrl={profile?.avatar_url ?? null}
        />
      </section>

      <footer className="site-footer">
        <Link href="/">← Back to the collection</Link>
        <span>Side Notes · Profile</span>
      </footer>
    </main>
  );
}
