import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Is AI funny?",
  description: "AI makes memes from images and context. You be the judge.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
