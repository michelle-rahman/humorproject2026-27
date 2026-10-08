"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { GoogleSignInButton } from "@/app/auth-controls";

type JoinPromptProps = {
  label: string;
  className?: string;
  children?: ReactNode;
};

export default function JoinPrompt({ label, className, children }: JoinPromptProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className={`${className ?? "button button-primary"}${className === "text-link" ? " join-prompt-link" : ""}`} type="button" onClick={() => setOpen(true)}>
        {children ?? label}
      </button>
      {open && <JoinDialog onClose={() => setOpen(false)} />}
    </>
  );
}

export function JoinDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="join-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="join-dialog" role="dialog" aria-modal="true" aria-labelledby="join-title">
        <button className="join-close" type="button" aria-label="Close" onClick={onClose}>×</button>
        <p className="eyebrow">MAKE AN ACCOUNT</p>
        <h2 id="join-title">Vote and make your own memes.</h2>
        <p>Sign in to rate captions, upload an image, and generate captions of your own.</p>
        <GoogleSignInButton />
      </section>
    </div>
  );
}
