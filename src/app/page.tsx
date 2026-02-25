import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthed = !!user;

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center">
      <main className="mx-auto flex w-full max-w-4xl flex-col items-center gap-10 text-center">
        <div className="space-y-4">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-[#3C2A6A] sm:text-4xl">
            The AI layer for early career clarity
          </h1>
          <p className="mx-auto max-w-xl text-sm text-slate-700">
            Turn your CV and target roles into a minimalist, always-on
            intelligence workspace that surfaces real trajectories, gaps, and
            next moves.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <Button
            asChild
            size="lg"
            className="rounded-full bg-[#3C2A6A] px-10 text-sm font-medium text-[#FDFBF1] hover:bg-[#4a347f]"
          >
            <Link href={isAuthed ? "/dashboard" : "/login"}>
              {isAuthed ? "Go to Profile Audit" : "Get Started"}
            </Link>
          </Button>
          <span className="text-xs text-slate-500">
            You can adjust your profile and discovery targets anytime in the
            Profile Audit workspace.
          </span>
        </div>

        <section className="mt-8 w-full space-y-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500">
            Built by a team from
          </p>
          <div className="marquee-container mx-auto w-full max-w-4xl">
            {/* gradient masks */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#FDFBF1] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#FDFBF1] to-transparent" />

            <div className="marquee-track whitespace-nowrap">
              {[1, 2].map((loop) => (
                <div
                  key={loop}
                  className="flex items-center gap-16 px-8"
                  aria-hidden={loop === 2}
                >
                  <img
                    src="/partners/mckinsey.png"
                    alt="McKinsey & Company"
                    className="partner-logo"
                  />
                  <img
                    src="/partners/srcc.png"
                    alt="SRCC"
                    className="partner-logo"
                  />
                  <img
                    src="/partners/sig.png"
                    alt="SIG"
                    className="partner-logo"
                  />
                  <img
                    src="/partners/ycp-auctus.png"
                    alt="YCP Auctus"
                    className="partner-logo"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
