import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sentinel — Codebase AST & Blast-Radius Engine",
  description: "Zero-cloud codebase AST and blast-radius engine. Map dependencies, detect cycles, and trace impact before code merges.",
  icons: {
    icon: "/sentinel_favicon.svg",
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
