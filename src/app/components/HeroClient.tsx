'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GridBackground } from "@/components/GridBackground";

type Logo = { src: string; alt: string };

export function HeroClient({
  isAuthed,
  logos,
}: {
  isAuthed: boolean;
  logos: Logo[];
}) {
  return (
    <section
      id="hero"
      data-section
      className="section-fade relative -mx-4 flex min-h-screen w-[calc(100vw)] flex-col items-center justify-center bg-transparent text-center sm:-mx-8"
    >
      <GridBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-4 sm:px-8">
        <div className="max-w-3xl space-y-6">
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-[#3c2a6a] sm:text-5xl md:text-6xl">
            The AI layer for early career clarity
          </h1>
          <p className="mx-auto max-w-2xl text-sm sm:text-base text-[rgba(60,42,106,0.75)]">
            The first integrated career intelligence platform for India&apos;s 7.9 million job-seeking graduates.
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <div
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: "180px",
                height: "80px",
                borderRadius: "9999px",
                background:
                  "radial-gradient(ellipse, rgba(60,42,106,0.35) 0%, transparent 70%)",
                filter: "blur(12px)",
                animation: "pulse-glow 2.5s ease-in-out infinite",
                zIndex: 0,
                pointerEvents: "none",
              }}
            />
            <Button
              asChild
              size="lg"
              className="rounded-full bg-[#3C2A6A] px-10 text-sm font-medium text-[#FDFBF1] hover:bg-[#4a347f]"
            >
              <Link href={isAuthed ? "/dashboard" : "/login"}>
                {isAuthed ? "Go to Profile Audit" : "Get Started"}
              </Link>
            </Button>
          </div>
          <span className="text-xs text-[rgba(60,42,106,0.6)]">
            Built by a team from McKinsey &amp; Company, Bain &amp; Company, and SIG
          </span>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-80">
          {logos.map((logo, idx) => (
            <div
              key={idx}
              className={`partner-logo-wrapper ${
                logo.alt === "Bain & Company" ? "partner-logo-bain" : ""
              }`}
            >
              <img src={logo.src} alt={logo.alt} className="partner-logo-img" />
            </div>
          ))}
        </div>

        <a
          href="#problem"
          className="mt-12 flex flex-col items-center gap-1 text-[10px] font-medium uppercase tracking-[0.22em] text-[rgba(60,42,106,0.45)]"
        >
          <span>Scroll</span>
          <span className="inline-block h-8 w-px bg-slate-300" />
        </a>
      </div>
    </section>
  );
}

