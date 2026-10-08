import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "non-human memes — Is AI funny?",
  description: "AI-generated captions and image memes. Is AI funny? You decide.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
