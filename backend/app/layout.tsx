import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinguaQuest Teacher Portal",
  description: "LinguaQuest Teacher Dashboard & Audio Manager",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
