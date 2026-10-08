"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { JoinDialog } from "@/app/join-prompt";

type VoteButtonsProps = {
  generationId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  initialVote: number | null;
  signedIn: boolean;
};

export default function VoteButtons({
  generationId,
  initialUpvotes,
  initialDownvotes,
  initialVote,
  signedIn,
}: VoteButtonsProps) {
  const router = useRouter();
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [currentVote, setCurrentVote] = useState(initialVote);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);

  async function vote(value: 1 | -1) {
    if (!signedIn) {
      setJoinOpen(true);
      return;
    }
    if (saving) return;
    setSaving(true);
    setMessage(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Sign in before voting.");
      setSaving(false);
      router.refresh();
      return;
    }

    const { data: existingVote, error: lookupError } = await supabase
      .from("caption_votes")
      .select("id,vote")
      .eq("generation_id", generationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (lookupError) {
      setMessage("Could not check your vote. Please try again.");
      setSaving(false);
      return;
    }
    if (existingVote?.vote === value) {
      setMessage("Your vote is already recorded.");
      setSaving(false);
      return;
    }

    const result = existingVote
      ? await supabase.from("caption_votes").update({ vote: value }).eq("id", existingVote.id)
      : await supabase.from("caption_votes").insert({
          generation_id: generationId,
          user_id: user.id,
          vote: value,
        });

    if (result.error) {
      setMessage("Your vote could not be saved. Please try again.");
      setSaving(false);
      return;
    }

    setUpvotes((count) => count - (currentVote === 1 ? 1 : 0) + (value === 1 ? 1 : 0));
    setDownvotes((count) => count - (currentVote === -1 ? 1 : 0) + (value === -1 ? 1 : 0));
    setCurrentVote(value);
    setMessage(value === 1 ? "Upvote saved." : "Downvote saved.");
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="vote-area">
      <div className="vote-controls" aria-label="Rate this meme">
        <button
          aria-pressed={currentVote === 1}
          className={`vote-button ${currentVote === 1 ? "is-selected" : ""}`}
          disabled={saving}
          onClick={() => vote(1)}
          type="button"
        >
          <span aria-hidden="true">↑</span> <span>{upvotes}</span>
          <span className="sr-only">upvotes</span>
        </button>
        <button
          aria-pressed={currentVote === -1}
          className={`vote-button ${currentVote === -1 ? "is-selected" : ""}`}
          disabled={saving}
          onClick={() => vote(-1)}
          type="button"
        >
          <span aria-hidden="true">↓</span> <span>{downvotes}</span>
          <span className="sr-only">downvotes</span>
        </button>
        {!signedIn && <span className="signin-to-vote">Sign in to vote</span>}
      </div>
      {message && <p className="vote-message" role="status">{message}</p>}
      {joinOpen && <JoinDialog onClose={() => setJoinOpen(false)} />}
    </div>
  );
}
