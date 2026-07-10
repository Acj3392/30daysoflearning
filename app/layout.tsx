import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marginalia — a 30-day apprenticeship in writing",
  description:
    "30 days, 3 lessons a day: sentence craft, writing technique, and literary theory, with an AI writing tutor.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
