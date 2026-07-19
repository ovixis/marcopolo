import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AppHeader } from "@/components/app-header";
import { PageTransition } from "@/components/animation/page-transition";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display serif — warm, editorial, "explorer's journal" feel.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Marco Polo",
  description:
    "Open-source travel aggregator: flights, hotels, experiences, and trip planning in one desktop app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <AppHeader />
        <main className="relative min-h-0 flex-1 overflow-y-auto">
          <PageTransition>{children}</PageTransition>
        </main>
      </body>
    </html>
  );
}
