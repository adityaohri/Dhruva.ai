"use client";

import { useState, useCallback, useEffect } from "react";

const CREAM = "#FDFBF1";
const PURPLE = "#3C2A6A";

type Step = 1 | 2;

const INDUSTRIES = [
  "Consulting",
  "Technology",
  "Finance",
  "Marketing",
  "Operations",
  "Product",
  "Data & Analytics",
  "Other",
];

const JOB_TYPES = [
  "Internship",
  "Full-time",
  "Part-time",
  "Contract",
  "Freelance",
];

const EXPERIENCE_LEVELS = [
  "Fresher",
  "0-1 years",
  "1-2 years",
  "2-5 years",
  "5+ years",
];

const HUNT_STATUS_MESSAGES = [
  "Scanning McKinsey & Company Career Portals...",
  "Searching Greenhouse & Lever ATS Boards...",
  "Filtering for your experience level...",
  "Checking Naukri & LinkedIn listings...",
  "Deduplicating and ranking results...",
];

type OpportunityResult = {
  title: string;
  url: string;
  snippet: string;
  source: string;
  isDirect: boolean;
  company?: string | null;
  /** Nomenclature from extractor: "Company: Role". */
  displayName?: string;
  /** Claude‑generated 3‑bullet job summary. */
  summary?: string | null;
  /** Prestige score from backend (higher = more sought after). */
  prestige_score?: number;
  /** Original index from backend result list, used for recency sort. */
  originalIndex?: number;
};

function getSummaryLines(summary?: string | null, fallbackSnippet?: string): string[] {
  const raw = (summary ?? fallbackSnippet ?? "").trim();
  if (!raw) return [];
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.slice(0, 3);
}

export type OpportunityFilters = {
  industry: string;
  jobType: string;
  experience: string;
  location: string;
  pay: string;
  companies: string;
  roles: string;
};

const STORAGE_KEY = "dhruva_opportunity_filters";

const initialFilters: OpportunityFilters = {
  industry: "",
  jobType: "",
  experience: "",
  location: "",
  pay: "",
  companies: "",
  roles: "",
};

function loadStoredFilters(): OpportunityFilters {
  if (typeof window === "undefined") return initialFilters;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialFilters;
    const parsed = JSON.parse(raw) as Partial<OpportunityFilters>;
    return { ...initialFilters, ...parsed };
  } catch {
    return initialFilters;
  }
}

function saveFilters(f: OpportunityFilters) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
  } catch {}
}

function getSourceBadge(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("greenhouse")) return "Greenhouse";
    if (host.includes("lever.co")) return "Lever";
    if (host.includes("workday")) return "Workday";
    if (host.includes("mckinsey")) return "McKinsey Direct";
    if (host.includes("apple.com")) return "Apple Direct";
    if (host.includes("google.com")) return "Google Direct";
    if (host.includes("microsoft")) return "Microsoft Direct";
    if (host.includes("naukri")) return "Naukri";
    if (host.includes("linkedin")) return "LinkedIn";
    if (host.includes("bain")) return "Bain Direct";
    if (host.includes("bcg")) return "BCG Direct";
    if (host.includes("deloitte")) return "Deloitte Direct";
    if (host.includes("kpmg") || host.includes("ey.com")) return "Direct";
    return host.replace(/^www\./, "").split(".")[0] || "Job Board";
  } catch {
    return "Job Board";
  }
}

function OpportunityCard({ r }: { r: OpportunityResult }) {
  const summaryLines = getSummaryLines(r.summary, r.snippet);

  return (
    <div className="flex flex-col rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-none transition-shadow hover:shadow-sm">
      <h3 className="font-semibold text-[#3C2A6A] line-clamp-2">
        {r.displayName || "Job listing"}
      </h3>
      {r.company && (
        <p className="mt-1.5 text-sm font-medium text-[#3C2A6A]/90">
          {r.company}
        </p>
      )}
      <p className="mt-1 text-xs text-slate-500 line-clamp-1">
        {getSourceBadge(r.url)}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="rounded-md bg-[#3C2A6A]/10 px-2 py-0.5 text-[10px] font-medium text-[#3C2A6A]">
          {getSourceBadge(r.url)}
        </span>
        {r.isDirect && (
          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
            Direct
          </span>
        )}
      </div>
      {summaryLines.length > 0 && (
        <ul className="mt-3 flex-1 space-y-1 text-xs text-slate-600">
          {summaryLines.map((line, idx) => (
            <li key={idx} className="flex gap-1">
              <span className="mt-[5px] h-1.5 w-1.5 flex-none rounded-full bg-[#3C2A6A]" />
              <span className="flex-1">{line}</span>
            </li>
          ))}
        </ul>
      )}
      <a
        href={r.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex w-full justify-center rounded-full bg-[#3C2A6A] py-2.5 text-sm font-medium text-[#FDFBF1] hover:bg-[#4a347f]"
      >
        Apply now
      </a>
    </div>
  );
}

export default function OpportunityPage() {
  const [step, setStep] = useState<Step>(1);
  const [filters, setFilters] = useState<OpportunityFilters>(initialFilters);
  const [results, setResults] = useState<OpportunityResult[]>([]);
  const [resultsByCompany, setResultsByCompany] = useState<Record<string, OpportunityResult[]>>({});
  useEffect(() => {
    setFilters(loadStoredFilters());
  }, []);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatusIndex, setLoadingStatusIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [sortMode, setSortMode] = useState<"prestige" | "recency">("prestige");

  const updateFilter = useCallback(<K extends keyof OpportunityFilters>(
    key: K,
    value: OpportunityFilters[K]
  ) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      saveFilters(next);
      return next;
    });
  }, []);

  const runHunt = useCallback(async () => {
    setError(null);
    setLoading(true);
    setLoadingProgress(0);
    setLoadingStatusIndex(0);

    const progressInterval = setInterval(() => {
      setLoadingProgress((p) => Math.min(p + 4, 90));
    }, 180);
    const statusInterval = setInterval(() => {
      setLoadingStatusIndex((i) => (i + 1) % HUNT_STATUS_MESSAGES.length);
    }, 1200);

    try {
      const res = await fetch("/api/discovery/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: filters.industry,
          jobType: filters.jobType,
          experience: filters.experience,
          location: filters.location || undefined,
          pay: filters.pay || undefined,
          companies: filters.companies
            ? filters.companies.split(",").map((s) => s.trim()).filter(Boolean)
            : undefined,
          roles: filters.roles
            ? filters.roles.split(",").map((s) => s.trim()).filter(Boolean)
            : undefined,
        }),
      });
      const data = await res.json();
      clearInterval(progressInterval);
      clearInterval(statusInterval);
      setLoadingProgress(100);

      if (!res.ok) {
        setError(data.error || "Hunt failed");
        setResults([]);
        return;
      }
      const baseResults: OpportunityResult[] = data.results || [];
      const withIndex = baseResults.map((r, idx) => ({
        ...r,
        originalIndex: idx,
      }));
      setResults(withIndex);
      setResultsByCompany(data.resultsByCompany || {});
      setHasCompletedOnboarding(true);
    } catch (e) {
      clearInterval(progressInterval);
      clearInterval(statusInterval);
      setError(e instanceof Error ? e.message : "Something went wrong");
      setResults([]);
      setResultsByCompany({});
    } finally {
      setLoading(false);
      setLoadingProgress(0);
    }
  }, [filters]);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    setStep(1);
    setResults([]);
    setResultsByCompany({});
    setError(null);
    setHasCompletedOnboarding(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const canProceedFromStep1 =
    filters.industry && filters.jobType && filters.experience;

  if (loading) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FDFBF1] px-4"
        style={{ backgroundColor: CREAM }}
      >
        <p className="font-serif text-sm font-semibold uppercase tracking-[0.2em] text-[#3C2A6A]">
          Live Hunt
        </p>
        <div className="mt-6 w-full max-w-md">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
            <div
              className="h-full rounded-full bg-[#3C2A6A] transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>
        <p className="mt-6 max-w-md text-center text-sm text-[#3C2A6A]/80">
          {HUNT_STATUS_MESSAGES[loadingStatusIndex]}
        </p>
      </div>
    );
  }

  if (!hasCompletedOnboarding && !results.length) {
    return (
      <div
        className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-4 py-12"
        style={{ backgroundColor: CREAM }}
      >
        <div className="w-full max-w-2xl">
          <p className="text-center font-serif text-2xl font-semibold text-[#3C2A6A] sm:text-3xl">
            {step === 1 ? "What are you looking for?" : "Add more details (optional)"}
          </p>

          {step === 1 && (
            <div className="mt-10 space-y-10">
              <div>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-[#3C2A6A]/80">
                  Industry
                </p>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRIES.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => updateFilter("industry", opt)}
                      className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                        filters.industry === opt
                          ? "border-[#3C2A6A] bg-[#3C2A6A] text-[#FDFBF1]"
                          : "border-[#E5E7EB] bg-white text-[#3C2A6A] hover:border-[#3C2A6A]/50"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-[#3C2A6A]/80">
                  Job type
                </p>
                <div className="flex flex-wrap gap-2">
                  {JOB_TYPES.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => updateFilter("jobType", opt)}
                      className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                        filters.jobType === opt
                          ? "border-[#3C2A6A] bg-[#3C2A6A] text-[#FDFBF1]"
                          : "border-[#E5E7EB] bg-white text-[#3C2A6A] hover:border-[#3C2A6A]/50"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-[#3C2A6A]/80">
                  Experience
                </p>
                <div className="flex flex-wrap gap-2">
                  {EXPERIENCE_LEVELS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => updateFilter("experience", opt)}
                      className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                        filters.experience === opt
                          ? "border-[#3C2A6A] bg-[#3C2A6A] text-[#FDFBF1]"
                          : "border-[#E5E7EB] bg-white text-[#3C2A6A] hover:border-[#3C2A6A]/50"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!canProceedFromStep1}
                  className="rounded-full bg-[#3C2A6A] px-8 py-3 text-sm font-medium text-[#FDFBF1] transition-opacity disabled:opacity-40 hover:bg-[#4a347f]"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="mt-10 space-y-6">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-[#3C2A6A]/80">
                  Location
                </label>
                <input
                  type="text"
                  value={filters.location}
                  onChange={(e) => updateFilter("location", e.target.value)}
                  placeholder="e.g. India, Bangalore"
                  className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#3C2A6A] placeholder:text-slate-400 focus:border-[#3C2A6A]/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-[#3C2A6A]/80">
                  Desired pay (INR)
                </label>
                <input
                  type="text"
                  value={filters.pay}
                  onChange={(e) => updateFilter("pay", e.target.value)}
                  placeholder="e.g. 8-12 LPA"
                  className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#3C2A6A] placeholder:text-slate-400 focus:border-[#3C2A6A]/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-[#3C2A6A]/80">
                  Target company
                </label>
                <input
                  type="text"
                  value={filters.companies}
                  onChange={(e) => updateFilter("companies", e.target.value)}
                  placeholder="e.g. McKinsey, Apple (comma-separated)"
                  className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#3C2A6A] placeholder:text-slate-400 focus:border-[#3C2A6A]/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-[#3C2A6A]/80">
                  Specific role
                </label>
                <input
                  type="text"
                  value={filters.roles}
                  onChange={(e) => updateFilter("roles", e.target.value)}
                  placeholder="e.g. Analyst, Consultant (comma-separated)"
                  className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#3C2A6A] placeholder:text-slate-400 focus:border-[#3C2A6A]/50 focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-3 pt-4">
                <button
                  type="button"
                  onClick={runHunt}
                  className="rounded-full bg-[#3C2A6A] px-8 py-3 text-sm font-medium text-[#FDFBF1] hover:bg-[#4a347f]"
                >
                  Start Hunt
                </button>
                <button
                  type="button"
                  onClick={runHunt}
                  className="rounded-full border border-[#3C2A6A]/30 bg-white px-8 py-3 text-sm font-medium text-[#3C2A6A] hover:bg-[#3C2A6A]/5"
                >
                  Skip & start hunt
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const sortedResults = [...results].sort((a, b) => {
    if (sortMode === "prestige") {
      const pa = a.prestige_score ?? 0;
      const pb = b.prestige_score ?? 0;
      if (pb !== pa) return pb - pa;
    }
    const ia = a.originalIndex ?? 0;
    const ib = b.originalIndex ?? 0;
    return ia - ib;
  });

  return (
    <div className="space-y-6" style={{ backgroundColor: CREAM }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-2xl font-semibold text-[#3C2A6A]">
          Opportunity Intelligence
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-medium text-[#3C2A6A]">Sort by</span>
            <select
              value={sortMode}
              onChange={(e) =>
                setSortMode(e.target.value === "recency" ? "recency" : "prestige")
              }
              className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs text-[#3C2A6A] focus:border-[#3C2A6A]/60 focus:outline-none"
            >
              <option value="prestige">Most Sought After</option>
              <option value="recency">Recency</option>
            </select>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-full border border-[#3C2A6A]/30 bg-white px-5 py-2 text-sm font-medium text-[#3C2A6A] hover:bg-[#3C2A6A]/5"
          >
            Reset filters
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {results.length === 0 && !loading && hasCompletedOnboarding && (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white/80 px-6 py-10 text-center">
          <p className="font-serif text-lg text-[#3C2A6A]">No opportunities found for this search.</p>
          <p className="mt-2 text-sm text-slate-600">Try resetting filters or changing industry / role.</p>
        </div>
      )}

      {results.length > 0 && (
        <>
          {/* By company: one layer deeper than aggregate — individual roles per company */}
          {Object.keys(resultsByCompany).length > 0 && (
            <div className="space-y-8">
              <h2 className="font-serif text-lg font-semibold text-[#3C2A6A]">
                By company
              </h2>
              {Object.entries(resultsByCompany)
                .filter(([name]) => name !== "Other")
                .sort(([, a], [, b]) => b.length - a.length)
                .map(([companyName, companyResults]) => (
                  <div key={companyName} className="space-y-3">
                    <h3 className="text-sm font-medium uppercase tracking-wider text-[#3C2A6A]/80">
                      {companyName}
                      <span className="ml-2 font-normal normal-case tracking-normal text-slate-500">
                        ({companyResults.length} role{companyResults.length !== 1 ? "s" : ""})
                      </span>
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {companyResults.map((r, i) => (
                        <OpportunityCard key={`${r.url}-${i}`} r={r} />
                      ))}
                    </div>
                  </div>
                ))}
              {resultsByCompany["Other"] && resultsByCompany["Other"].length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium uppercase tracking-wider text-[#3C2A6A]/80">
                    Other
                    <span className="ml-2 font-normal normal-case tracking-normal text-slate-500">
                      ({resultsByCompany["Other"].length} role{resultsByCompany["Other"].length !== 1 ? "s" : ""})
                    </span>
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {resultsByCompany["Other"].map((r, i) => (
                      <OpportunityCard key={`${r.url}-${i}`} r={r} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Flat list (all results) */}
          <div className="mt-8 space-y-4">
            <h2 className="font-serif text-lg font-semibold text-[#3C2A6A]">
              All opportunities
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedResults.map((r, i) => (
                <OpportunityCard key={`${r.url}-${i}`} r={r} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
