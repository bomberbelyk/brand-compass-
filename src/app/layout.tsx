import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Request Architect",
  description: "AI interview that turns vague client requests into working briefs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}

