import { createClient } from "@/lib/supabase/server";
import { HeroClient } from "@/app/components/HeroClient";
import { GetStartedButton } from "@/app/components/GetStartedButton";
import { StatsClient } from "@/app/components/StatsClient";
import { ScrollAnimator } from "@/app/components/ScrollAnimator";
import { GridBackground } from "@/components/GridBackground";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthed = !!user;

  const logos = [
    { src: "/partners/mckinsey.png", alt: "McKinsey & Company" },
    { src: "/partners/bain.png", alt: "Bain & Company" },
    { src: "/partners/sig.png", alt: "SIG" },
  ];

  return (
    <div className="relative min-h-screen bg-[#FDFBF1]">
      <main className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 sm:px-8">
        <HeroClient isAuthed={isAuthed} logos={logos} />

        {/* THE PROBLEM */}
        <section
          id="problem"
          data-section
          className="section-fade w-full pt-16 sm:pt-20"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-10">
            <header className="space-y-2 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[rgba(60,42,106,0.45)]">
                The Problem
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#3c2a6a]">
                A market that rewards navigation over merit
              </h2>
            </header>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  number: "01",
                  title: "Blind profile positioning",
                  body:
                    "Candidates who desire a certain role at a certain set of firms are unaware of the necessary spikes. Without benchmarking, effort is misdirected.",
                },
                {
                  number: "02",
                  title: "Noise over signal in discovery",
                  body:
                    "What job boards do in volume, they fail to do in quality. Candidates lost in the noise struggle to find opportunities that suit their profile and needs.",
                },
                {
                  number: "03",
                  title: "Cold outreach with no infrastructure",
                  body:
                    "Candidates either avoid cold outreach entirely, or face miserable conversion rates when they do — with no structured system to improve.",
                },
              ].map((card) => (
                <div
                  key={card.number}
                  className="group flex h-full flex-col rounded-2xl border border-[rgba(60,42,106,0.08)] bg-[#fdfbf1] p-6 text-left shadow-[0_0_0_1px_rgba(60,42,106,0.06),0_4px_24px_rgba(60,42,106,0.07)] transition-all duration-[350ms] ease-out hover:-translate-y-[6px] hover:border-[rgba(60,42,106,0.18)] hover:shadow-[0_0_0_1px_rgba(60,42,106,0.12),0_8px_40px_rgba(60,42,106,0.18),0_0_60px_rgba(60,42,106,0.08)]"
                >
                  <span className="text-xs font-semibold tracking-[0.28em] text-[rgba(60,42,106,0.45)]">
                    {card.number}
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-[#3c2a6a]">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm text-[rgba(60,42,106,0.75)]">
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHO WE BUILD FOR */}
        <section
          id="who"
          data-section
          className="section-fade w-full border-t border-slate-200 py-16 sm:py-20"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-10">
            <header className="space-y-2 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[rgba(60,42,106,0.45)]">
                Who We Build For
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#3c2a6a]">
                The career-anxious Indian graduate
              </h2>
            </header>

            <div className="space-y-8">
              <p className="max-w-3xl text-sm sm:text-base text-[rgba(60,42,106,0.75)]">
                The career-anxious Indian student or graduate, aged 19–27 — talented and
                motivated, yet disadvantaged by a market that rewards navigation over merit.
              </p>

              <StatsClient />
            </div>
          </div>
        </section>

        {/* PLATFORM / WHAT WE BUILD */}
        <section
          id="platform"
          data-section
          className="section-fade w-full border-t border-slate-200 py-16 sm:py-20"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-10">
            <header className="space-y-2 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[rgba(60,42,106,0.45)]">
                The Platform
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#3c2a6a]">
                One integrated intelligence layer
              </h2>
              <p className="max-w-2xl text-sm sm:text-base text-[rgba(60,42,106,0.75)]">
                Not three tools stitched together. A single data-driven workflow where
                each engine feeds the next.
              </p>
            </header>

            <div className="space-y-6">
              {[
                {
                  number: "01",
                  title: "Profile Intelligence",
                  subtitle: "Audit & Benchmarking",
                  body:
                    "Benchmarks your CV and LinkedIn against successful candidates. Surfaces skill gaps and positioning fixes that directly improve shortlist probability.",
                },
                {
                  number: "02",
                  title: "Opportunity Intelligence",
                  subtitle: "Dynamic Role Aggregation + Signal Detection",
                  body:
                    "A live, personalised role pipeline ranked by fit. Powered by a signal feed that surfaces companies likely to hire before the job posting exists.",
                },
                {
                  number: "03",
                  title: "Outreach Intelligence",
                  subtitle: "Network & Execution Copilot",
                  body:
                    "Scores decision-makers by relevance and generates personalised outreach grounded in live company signals — not templates.",
                },
              ].map((block, idx) => (
                <div
                  key={block.number}
                  className={[
                    "platform-card-with-cloud flex flex-col gap-6 rounded-3xl border bg-[#1a1025] p-6 text-left text-[#FDFBF1] shadow-sm transition-transform duration-400 ease-out",
                    idx === 0
                      ? "border-t-[1px] border-t-[rgba(139,92,246,0.3)] hover:-translate-y-1 hover:bg-gradient-to-br hover:from-[#1a1025] hover:to-[#2d1f4e] hover:border-t-[rgba(139,92,246,0.9)]"
                      : idx === 1
                      ? "border-t-[1px] border-t-[rgba(99,76,168,0.3)] hover:-translate-y-1 hover:bg-gradient-to-br hover:from-[#1a1025] hover:to-[#241840] hover:border-t-[rgba(99,76,168,0.9)]"
                      : "border-t-[1px] border-t-[rgba(167,139,250,0.3)] hover:-translate-y-1 hover:bg-gradient-to-br hover:from-[#1a1025] hover:to-[#1f1535] hover:border-t-[rgba(167,139,250,0.9)]",
                  ].join(" ")}
                >
                  <div className="platform-card-cloud" aria-hidden />
                  <div className="platform-card-content space-y-3 text-left">
                    <span className="text-xs font-semibold tracking-[0.28em] text-slate-300">
                      {block.number}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-[#FDFBF1]">
                        {block.title}
                      </h3>
                      <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-300">
                        {block.subtitle}
                      </p>
                    </div>
                    <p className="text-sm text-slate-200">
                      {block.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CLOSING CTA */}
        <section
          id="closing"
          data-section
          className="section-fade w-full border-t border-slate-200 pb-16 pt-12 sm:pb-20 sm:pt-16"
        >
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl px-6 py-10 text-center sm:px-10 breathe-gradient">
            <div className="cta-stars-container" aria-hidden>
              <div className="shooting-star" />
              <div className="shooting-star" />
              <div className="shooting-star" />
              <div className="shooting-star" />
              <div className="shooting-star" />
            </div>
            <div className="relative z-10">
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#FDFBF1]">
                Your north star for early career success.
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-[#E5E7EB]">
                Human-led, AI-powered. Built in New Delhi.
              </p>
              <div className="mt-6 flex justify-center">
                <GetStartedButton isAuthed={isAuthed} />
              </div>
            </div>
          </div>
        </section>
        <ScrollAnimator />
      </main>
    </div>
  );
}
