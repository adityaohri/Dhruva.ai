import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const runtime = "nodejs";

type UserProfile = {
  user_id: string;
  name: string | null;
  focus_sections: unknown;
  target_industries: string | null;
  target_functions: string | null;
  onboarding_complete: boolean | null;
};

type SignalRow = {
  company_name: string | null;
  signal_type: string | null;
  scraped_at: string | null;
};

type JobRow = {
  company: string | null;
  title: string | null;
  posted_at: string | null;
};

function getGreeting(name: string | null | undefined): string {
  const now = new Date();
  const hour = now.getHours();

  const safeName = name && name.trim().length > 0 ? name.trim() : "there";

  if (hour >= 5 && hour < 12) return `Rise and Shine, ${safeName}`;
  if (hour >= 12 && hour < 17) return `Good Afternoon, ${safeName}`;
  if (hour >= 17 && hour < 21) return `Tea Time Jobs, ${safeName}`;
  return `Last stretch before bed, ${safeName}`;
}

function getFocusActionsCount(focusSections: unknown): number {
  if (!focusSections) return 0;
  if (Array.isArray(focusSections)) return focusSections.length;
  if (typeof focusSections === "string") {
    const trimmed = focusSections
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    return trimmed.length;
  }
  return 0;
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileRow } = await supabase
    .from("user_profiles")
    .select(
      "user_id, name, focus_sections, target_industries, target_functions, onboarding_complete"
    )
    .eq("user_id", user.id)
    .maybeSingle<UserProfile>();

  if (!profileRow?.onboarding_complete) {
    // User is signed in but not onboarded: nudge them back to home to start onboarding from Get Started.
    redirect("/");
  }

  const focusActionsCount = getFocusActionsCount(profileRow.focus_sections);

  // Jobs count based on user's target industries / functions
  const jobsFilters: string[] = [];
  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  let jobsQuery = supabase.from("jobs_index").select("id", { count: "exact", head: true });
  if (profileRow.target_industries) {
    jobsQuery = jobsQuery.ilike("industry", `%${profileRow.target_industries}%`);
  }
  if (profileRow.target_functions) {
    jobsQuery = jobsQuery.ilike("function", `%${profileRow.target_functions}%`);
  }
  const { count: jobsCount } = await jobsQuery;
  const matchesFound = jobsCount ?? 0;

  // New updates from signals_index in last 24h
  const { count: signalsCount } = await supabase
    .from("signals_index")
    .select("id", { count: "exact", head: true })
    .gte("scraped_at", since24h);
  const newUpdates = signalsCount ?? 0;

  // Recent activity: latest signals + jobs in last 24h
  const [{ data: recentSignals }, { data: recentJobs }] = await Promise.all([
    supabase
      .from("signals_index")
      .select("company_name, signal_type, scraped_at")
      .gte("scraped_at", since24h)
      .order("scraped_at", { ascending: false })
      .limit(10)
      .returns<SignalRow[]>(),
    supabase
      .from("jobs_index")
      .select("company, title, posted_at")
      .gte("posted_at", since24h)
      .order("posted_at", { ascending: false })
      .limit(10)
      .returns<JobRow[]>(),
  ]);

  const activities: { type: "signal" | "job"; title: string; company: string; when: string }[] = [];

  (recentSignals ?? []).forEach((s) => {
    const company = s.company_name ?? "Unknown company";
    activities.push({
      type: "signal",
      company,
      title: `New hiring signal — ${company}`,
      when: s.scraped_at ?? "",
    });
  });

  (recentJobs ?? []).forEach((j) => {
    const company = j.company ?? "Unknown company";
    const role = j.title ?? "New role";
    activities.push({
      type: "job",
      company,
      title: `New job match — ${role} at ${company}`,
      when: j.posted_at ?? "",
    });
  });

  activities.sort((a, b) => {
    const ta = new Date(a.when || 0).getTime();
    const tb = new Date(b.when || 0).getTime();
    return tb - ta;
  });

  const topActivities = activities.slice(0, 10);

  const greeting = getGreeting(profileRow.name);

  return (
    <div className="relative min-h-screen bg-[#fdfbf1]">
      <div className="pointer-events-none absolute inset-0 z-0">
        {/* Grid background could be reused here if desired */}
      </div>
      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pb-16 pt-12">
        {/* SECTION 1 — Greeting header */}
        <section>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#3c2a6a]">
            {greeting}
          </h1>
        </section>

        {/* SECTION 2 — Chat with Dhruva callout */}
        <section>
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-[rgba(60,42,106,0.1)] bg-white px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3c2a6a] text-xs font-semibold uppercase tracking-wide text-[#fdfbf1]">
                d
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[rgba(60,42,106,0.6)]">
                  Talk to Dhruva anytime
                </p>
                <p className="mt-1 text-xs text-[rgba(60,42,106,0.8)]">
                  Update your profile or ask about your matches.
                </p>
              </div>
            </div>
            <Link
              href="/chat"
              className="rounded-full bg-[#3c2a6a] px-5 py-2 text-xs font-medium text-[#fdfbf1] shadow-sm hover:bg-[#4b3786] transition-colors"
            >
              Chat
            </Link>
          </div>
        </section>

        {/* SECTION 3 — Three feature cards */}
        <section>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Card 1 — Profile Audit */}
            <Link
              href="/profile-audit"
              className="flex flex-col justify-between rounded-2xl bg-[#3c2a6a] px-6 py-8 text-[#fdfbf1] shadow-sm transition-transform duration-300 ease-out hover:-translate-y-1"
            >
              <div>
                <p className="text-[11px] font-medium text-[rgba(253,251,241,0.7)]">
                  Improve your chances.
                </p>
                <p className="mt-3 font-serif text-4xl font-semibold">
                  {focusActionsCount} Actions Identified
                </p>
              </div>
              <div className="mt-6">
                <p className="text-base font-semibold">Profile Audit</p>
                {focusActionsCount === 0 && (
                  <p className="mt-1 text-xs text-[rgba(253,251,241,0.8)]">
                    Build your personalised plan →
                  </p>
                )}
              </div>
            </Link>

            {/* Card 2 — Opportunity Intelligence */}
            <Link
              href="/opportunities"
              className="flex flex-col justify-between rounded-2xl bg-[#3c2a6a] px-6 py-8 text-[#fdfbf1] shadow-sm transition-transform duration-300 ease-out hover:-translate-y-1"
            >
              <div>
                <p className="text-[11px] font-medium text-[rgba(253,251,241,0.7)]">
                  Find your matches.
                </p>
                <p className="mt-3 font-serif text-4xl font-semibold">
                  {matchesFound} Matches Found
                </p>
              </div>
              <div className="mt-6">
                <p className="text-base font-semibold">Opportunities</p>
              </div>
            </Link>

            {/* Card 3 — Outreach Copilot */}
            <Link
              href="/outreach"
              className="flex flex-col justify-between rounded-2xl bg-[#3c2a6a] px-6 py-8 text-[#fdfbf1] shadow-sm transition-transform duration-300 ease-out hover:-translate-y-1"
            >
              <div>
                <p className="text-[11px] font-medium text-[rgba(253,251,241,0.7)]">
                  Get the right catches.
                </p>
                <p className="mt-3 font-serif text-4xl font-semibold">
                  {newUpdates} New Updates
                </p>
              </div>
              <div className="mt-6">
                <p className="text-base font-semibold">Outreach</p>
              </div>
            </Link>
          </div>
        </section>

        {/* SECTION 4 — Recent Activity */}
        <section className="space-y-4">
          <h2 className="font-serif text-xl font-semibold text-[#3c2a6a]">
            Recent Activity
          </h2>
          {topActivities.length === 0 ? (
            <p className="text-sm text-[rgba(60,42,106,0.75)]">
              You&apos;re all caught up! Check back tomorrow.
            </p>
          ) : (
            <div className="space-y-3">
              {topActivities.map((item, idx) => {
                const initial = item.company.charAt(0).toUpperCase();
                return (
                  <div
                    key={`${item.type}-${idx}-${item.title}`}
                    className="flex items-center gap-3 rounded-xl border border-[rgba(60,42,106,0.08)] bg-white px-4 py-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3c2a6a] text-xs font-semibold text-[#fdfbf1]">
                      {initial || "D"}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-[#3c2a6a]">{item.title}</p>
                      <p className="text-[11px] text-[rgba(60,42,106,0.7)]">
                        {timeAgo(item.when)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
