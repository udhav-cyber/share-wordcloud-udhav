import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Learning Word Cloud",
  description: "A lightweight shared word cloud for learning topics."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
