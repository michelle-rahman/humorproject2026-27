import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meme — Image to caption",
  description: "Make a meme from an image and a line of text.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
