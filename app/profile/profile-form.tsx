"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ProfileFormProps = {
  userId: string;
  initialFirstName: string;
  initialLastName: string;
  initialAvatarUrl: string | null;
};

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function ProfileForm({
  userId,
  initialFirstName,
  initialLastName,
  initialAvatarUrl,
}: ProfileFormProps) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setError(null);
    setMessage(null);

    if (!file) {
      setPhoto(null);
      setPhotoPreview(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setError("Choose an image smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    if (!trimmedFirstName || !trimmedLastName) {
      setError("Add both your first name and last name to continue.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    let nextAvatarUrl = avatarUrl;

    if (photo) {
      const extension = photo.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${userId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, photo, { contentType: photo.type, upsert: false });

      if (uploadError) {
        setError(`Photo upload failed: ${uploadError.message}`);
        setSaving(false);
        return;
      }

      nextAvatarUrl = supabase.storage.from("avatars").getPublicUrl(filePath).data.publicUrl;
    }

    const { error: updateError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        avatar_url: nextAvatarUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (updateError) {
      setError(`Could not save your profile: ${updateError.message}`);
      setSaving(false);
      return;
    }

    setAvatarUrl(nextAvatarUrl);
    setPhoto(null);
    setPhotoPreview(null);
    setMessage("Your profile is saved.");
    setSaving(false);
    router.refresh();
  }

  return (
    <form className="profile-form" onSubmit={saveProfile}>
      <div className="avatar-editor">
        <div className="avatar-preview" aria-label="Profile photo preview">
          {photoPreview || avatarUrl ? (
            // Supabase Storage is a remote public bucket; a regular img supports its URL directly.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoPreview ?? avatarUrl ?? ""} alt="Your profile" />
          ) : (
            <span aria-hidden="true">{firstName.trim().charAt(0) || "·"}</span>
          )}
        </div>
        <label className="upload-control">
          <span className="eyebrow">PROFILE PHOTO</span>
          <span className="upload-link">Choose a photo</span>
          <span className="upload-help">JPG, PNG, or WebP · up to 5 MB</span>
          <input accept="image/jpeg,image/png,image/webp" type="file" onChange={selectPhoto} />
        </label>
      </div>

      <div className="profile-fields">
        <label className="form-field">
          <span>First name</span>
          <input
            autoComplete="given-name"
            name="first_name"
            onChange={(event) => setFirstName(event.target.value)}
            required
            value={firstName}
          />
        </label>
        <label className="form-field">
          <span>Last name</span>
          <input
            autoComplete="family-name"
            name="last_name"
            onChange={(event) => setLastName(event.target.value)}
            required
            value={lastName}
          />
        </label>
      </div>

      {error && <p className="form-message form-error" role="alert">{error}</p>}
      {message && <p className="form-message form-success" role="status">{message}</p>}

      <button className="button button-primary save-button" disabled={saving} type="submit">
        {saving ? "Saving your profile…" : "Save profile"}
      </button>
    </form>
  );
}
