import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sentinel — Codebase AST & Blast-Radius Engine",
  description: "Zero-cloud codebase AST and blast-radius engine. Map dependencies, detect cycles, and trace impact before code merges.",
  metadataBase: new URL("https://sentinel-teal-two.vercel.app"),
  icons: {
    icon: "/sentinel_favicon.svg",
  },
  openGraph: {
    title: "Sentinel — Codebase AST & Blast-Radius Engine",
    description: "Zero-cloud codebase AST and blast-radius engine. Map dependencies, detect cycles, and trace impact before code merges.",
    url: "https://sentinel-teal-two.vercel.app",
    siteName: "Sentinel",
    images: [
      {
        url: "/image.png",
        width: 1200,
        height: 630,
        alt: "Sentinel Codebase AST & Blast-Radius Engine",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sentinel — Codebase AST & Blast-Radius Engine",
    description: "Zero-cloud codebase AST and blast-radius engine. Map dependencies, detect cycles, and trace impact before code merges.",
    images: ["/image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
