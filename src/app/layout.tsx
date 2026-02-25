import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Inter, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "dhruva.ai",
  description: "The AI layer for early career clarity",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${geistMono.variable} ${playfair.variable} antialiased`}
      >
        <div className="min-h-screen bg-[#FDFBF1] text-slate-900">
          <header className="sticky top-0 z-40 border-b border-[#3C2A6A]/10 bg-[#FDFBF1]/80 backdrop-blur-md">
            <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center">
                  <Image
                    src="/dhruva-logo.png"
                    alt="dhruva.ai logo"
                    width={28}
                    height={28}
                    className="h-7 w-7"
                  />
                </div>
                <span className="font-serif text-lg font-semibold tracking-tight text-[#3C2A6A]">
                  dhruva.ai
                </span>
              </Link>

              <div className="flex items-center gap-5 text-xs font-medium text-slate-700 sm:text-sm">
                <Link
                  href="/"
                  className="transition-colors hover:text-[#3C2A6A]"
                >
                  Home
                </Link>
                <Link
                  href="/dashboard"
                  className="transition-colors hover:text-[#3C2A6A]"
                >
                  Profile Audit
                </Link>
                <Link
                  href="/opportunity"
                  className="transition-colors hover:text-[#3C2A6A]"
                >
                  Opportunity Intelligence
                </Link>
                <Link
                  href="/outreach"
                  className="transition-colors hover:text-[#3C2A6A]"
                >
                  Outreach Copilot
                </Link>
              </div>
            </nav>
          </header>

          <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
