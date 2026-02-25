import type { Metadata } from "next";
import Link from "next/link";
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
        <div className="flex min-h-screen flex-col bg-[#FDFBF1] text-slate-900">
          <header className="sticky top-0 z-40 px-4 pt-4">
            <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl bg-white px-5 shadow-sm sm:h-16 sm:px-6">
              <Link href="/" className="flex items-center gap-2">
                <div className="dhruva-logo-wrap flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                  <img
                    src="/dhruva-star.png?v=2"
                    alt="dhruva.ai logo"
                    className="h-11 w-11 object-contain"
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

          <main className="flex-1 mx-auto max-w-6xl px-4 py-8 sm:py-10">
            {children}
          </main>

          <footer className="mt-auto border-t border-slate-200 bg-white">
            <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:flex-row sm:items-start sm:justify-between sm:py-10">
              <div className="flex flex-col gap-3 max-w-sm">
                <div className="flex items-center gap-2">
                  <div className="dhruva-logo-wrap flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                    <img
                      src="/dhruva-star.png?v=2"
                      alt="dhruva.ai logo"
                      className="h-11 w-11 object-contain"
                    />
                  </div>
                  <span className="font-serif text-lg font-semibold tracking-tight text-[#3C2A6A]">
                    dhruva.ai
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Your North Star for early career success. Human-led, AI-powered
                  from New Delhi.
                </p>
              </div>
              <div className="flex flex-col items-start gap-4 sm:items-end">
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                  <Link
                    href="/privacy"
                    className="transition-colors hover:text-[#3C2A6A]"
                  >
                    Privacy Policy
                  </Link>
                  <Link
                    href="/terms"
                    className="transition-colors hover:text-[#3C2A6A]"
                  >
                    Terms of Service
                  </Link>
                  <Link
                    href="/contact"
                    className="transition-colors hover:text-[#3C2A6A]"
                  >
                    Contact Us
                  </Link>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
