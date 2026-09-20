import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://vidsbit.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "VIDSBIT",
  title: {
    default: "VIDSBIT | Free Local-First Video Editor",
    template: "%s | VIDSBIT",
  },
  description:
    "VIDSBIT is a free, local-first video editor for browser-based editing, trimming, timeline work, and exporting without subscriptions or watermarks.",
  keywords: [
    "video editor",
    "local-first video editor",
    "browser video editor",
    "free video editor",
    "timeline editor",
    "video trimming",
    "FFmpeg editor",
    "clip editor",
    "no watermark video editor",
    "VIDSBIT",
  ],
  authors: [{ name: "VIDSBIT" }],
  creator: "VIDSBIT",
  publisher: "VIDSBIT",
  category: "multimedia",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    title: "VIDSBIT | Free Local-First Video Editor",
    description:
      "Edit videos locally in the browser with a simple timeline, media library, and export workflow.",
    url: siteUrl,
    siteName: "VIDSBIT",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "VIDSBIT logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VIDSBIT | Free Local-First Video Editor",
    description:
      "A privacy-friendly browser video editor for trimming, arranging, and exporting clips locally.",
    images: ["/android-chrome-512x512.png"],
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
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