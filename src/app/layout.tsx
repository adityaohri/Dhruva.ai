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
        <div className="min-h-screen bg-[#FDFBF1] text-slate-900">
          <header className="sticky top-0 z-40 border-b border-[#3C2A6A]/10 bg-[#FDFBF1]/80 backdrop-blur-md">
            <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center">
                  <img
                    src="https://lh3.googleusercontent.com/rd-d/ALs6j_G3kdxY-Jbtwl7e4iPu2Gn8xdIR4vlLjv6kYXXj2J8MEXFuGHdGit45lg7EibHpTINeuf-7k37LJ1c9xwBj1AZqBopWPTrtassMBShB1t-0-DHP26SvY7gl-G8NiuvhR56Hy0QtOJIor1V8yJ9uihB4ggay5GyJcBAH3jz1P6O7A-lyM3GaCie2_PlcY6sb3QsdIR7GywpCGGMdkWn8qiIpoydc4UPQvjCUtkp0dCVzm9t1f-0U72ke2QI9nVCke5pECSjJH_aB_WDCDZofbYPOu8uDa1rbtnSihefmrCjQKErlDE9b4ps14yhENUngvgjfaS8BBbAiVvEkl3vGmKSddkpR1zT3iggr51ePE4mWNwR1vMDGF0moguj3i_w0yqOXRwtb5-NTaljJ-7BJAYb_dw-b5K7ipcT08e49MRLwM0wZpj-1u4zlV1ywO5STjH_nmKZTa_ua8EzBtjeww7vRjVUJcRvqLxa_a_A_uzwk3uF9-B--VNQFAe-ZrsiCYCV-urpCmz__RA5dpL6jT2Atro4SloYsnrbgjOFmt_aWwX7QV6kRQdwnLWwscsmzAwd0leJh9TuOJAswtImJ2GNssYZoLxpBC-HbU-WbVNKc850m6xzQ6YLfu8n6WqhwY9T2Rt_G_leI4LD4fcKicqSRmECZg830eEO1Sha-0dT3bHi8AQdpb7eFIJd063dJ8-Hyrd8-8EeoSOHdjb0nDXu9JRlmp0pHNm_WTnzu-h3R6wRJe2X2iaJ4uycfS7smwhphZ4A2RyIIeDUZW5J7rP5-l-w1KTe-xH-2wY1ZUHY1GO70EClCaPTx_HvFShhlJbsOeTv-hSM0kfNJWTjzuhkB-UvUwz8vy4dvjh7VQrcee4QB-T-xlR802JkzKGpHOnUkLvPTrZOwKQBHxPfYjkeIaGtkXVt51NNCSYFKi5K55oi_Eyvun1e0R5u1myEHK0sD-zQ0WRTpOfliWkoJ7wQMoTbHuELtnboh8UIIa3rPa9pevLogYSWOW4Jc5tsHsLlI9aISLFCAbpIuA5i7iHKP7loWf3MvxuhOQUwSH5QPazgHvBx9chPP5Ja2H-BhLCmj7HyN90lVSudvi2EppNkBzytfvMveb0s4n86mg966=s1600"
                    alt="dhruva.ai logo"
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
