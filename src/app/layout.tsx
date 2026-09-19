import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VIDSBIT",
  description: "A free, local-first video editor.",
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