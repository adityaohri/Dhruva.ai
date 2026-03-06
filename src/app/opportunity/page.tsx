"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import {
  scoreAgainstIndustry,
  getTopCompanies,
  getRoleVariants,
  type IndustryName,
} from "@/lib/industryKeywords";
const CREAM = "#FDFBF1";
const PURPLE = "#3C2A6A";

type OnboardingStep = 1 | 2;
type FlowStep = "filters" | "confirm_profile" | "results";
type Section = "matches" | "signals" | "radar";

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
   /** CV-to-JD match analysis. */
  match_score?: number;
  match_band?: "Strong" | "Good" | "Moderate" | "Stretch";
  match_strengths?: string[];
  match_gaps?: string[];
  match_action_item?: string;
  /** Origin bucket from Serp Query Engine, when present. */
  bucket?: "A" | "B" | "C" | "D" | "E";
  /** Recency score for LinkedIn jobs (higher = more recent). */
  recencyScore?: number;
  /** True if job posted within last ~week. */
  isFresh?: boolean;
  /** Optional location for display. */
  location?: string | null;
  /** Optional human-readable posted time, e.g. "3 days ago". */
  posted_at?: string | null;
  /** Optional explicit verified flag (defaults to credible source). */
  isVerified?: boolean;
};

type LazyMatch = {
  score: number;
  band: "Strong" | "Good" | "Moderate" | "Stretch";
  strengths: string[];
  gaps: string[];
  actionItem: string;
};

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

function resolveCompany(r: OpportunityResult): string | null {
  let company = (r.company ?? "").trim();
  if (company && company.toLowerCase() !== "unknown company") return company;

  const rawTitle = (r.title ?? "").trim();

  // Pattern 1: "Software Engineering Intern @ Persona AI Inc" → "Persona AI Inc"
  const atMatch = rawTitle.match(/\s@\s+(.+)$/);
  if (atMatch) return atMatch[1].trim();

  // Pattern 2: "in India - BCG - Boston Consulting Group" → "Boston Consulting Group"
  const inIndiaMatch = rawTitle.match(/in\s+india\s*[-–]\s*.+?[-–]\s*(.+)$/i);
  if (inIndiaMatch) return inIndiaMatch[1].trim();

  // Pattern 3: "Unknown Company: Ema" → "Ema" (only if remainder is not a job title)
  const colonMatch = rawTitle.match(/^unknown company:\s*(.+)$/i);
  if (colonMatch) {
    const remainder = colonMatch[1].trim();
    const JOB_WORDS = [
      "engineer",
      "analyst",
      "manager",
      "developer",
      "intern",
      "consultant",
      "associate",
      "director",
      "specialist",
      "hire",
      "hiring",
      "post",
      "software",
      "technical",
      "member",
      "partner",
      "trainee",
      "apprentice",
    ];
    const tokens = remainder.toLowerCase().split(/[\s@\-–]+/);
    const isJobTitle = JOB_WORDS.some(
      (w) => tokens.includes(w) || remainder.toLowerCase().startsWith(w)
    );
    if (!isJobTitle && remainder.length < 40) return remainder;
  }

  return null;
}

function resolveTitle(r: OpportunityResult, company: string | null): string {
  const rawTitle = (r.title ?? "").trim();

  let role = rawTitle
    .replace(/^unknown company:\s*/i, "")
    .replace(/\s*@\s+.+$/, "")
    .replace(/\s*in\s+india.*/i, "")
    .replace(/\s*\(india\)\s*/i, " ")
    .trim();

  // Remove trailing " - CompanyName" only if it looks like a company (not a location/seniority word)
  role = role
    .replace(/\s*[-–]\s*([A-Z][^-–]{2,})$/, (match, tail: string) => {
      const KEEP = [
        "senior",
        "junior",
        "lead",
        "principal",
        "bangalore",
        "mumbai",
        "delhi",
        "hyderabad",
        "pune",
        "chennai",
        "india",
        "remote",
        "hybrid",
        "gurugram",
      ];
      return KEEP.some((w) => tail.toLowerCase().startsWith(w)) ? match : "";
    })
    .trim();

  // If company leaked into the start of role, strip it
  if (company && role.toLowerCase().startsWith(company.toLowerCase())) {
    role = role.slice(company.length).replace(/^[\s:\-–—|,]+/, "").trim();
  }

  // If role and company are the same string, role is empty
  if (company && role.toLowerCase() === company.toLowerCase()) {
    role = "";
  }

  return role;
}

const JUNK_DOMAINS = [
  // Indian business/general news
  "techcrunch.com",
  "financialexpress.com",
  "thehindubusinessline.com",
  "business-standard.com",
  "globenewswire.com",
  "economictimes.com",
  "livemint.com",
  "moneycontrol.com",
  "yourstory.com",
  "inc42.com",
  "entrackr.com",
  "reuters.com",
  "bloomberg.com",
  "forbes.com",
  "timesofindia.com",
  "ndtv.com",
  "thehindu.com",
  "businesstoday.in",
  "peoplematters.in",
  "indiatoday.in",
  "scroll.in",
  "thewire.in",
  "theprint.in",
  "outlookindia.com",
  "hindustantimes.com",
  "deccanherald.com",
  "vccircle.com",
  "dealstreetasia.com",
  "analyticsindiamag.com",
  "cnbc.com",
  "cnbctv18.com",
  "ft.com",
  "wsj.com",
  "shrm.org",
  "hbr.org",
  "apnews.com",
  "afr.com",
  // Consulting-specific news aggregators
  "consultancy.in",
  "consultancy.eu",
  "consultancy.uk",
  "consultancy.asia",
  "consultancy.com",
  "consulting.us",
  // Wire services and PR
  "prnewswire.com",
  "businesswire.com",
  "newswire.com",
  "globenewswire.com",
  "accesswire.com",
  "einpresswire.com",
  // India news (additional)
  "dnaindia.com",
  "thehansindia.com",
  "knocksense.com",
  "apnnews.com",
  "odishatv.in",
  "zeebiz.com",
  "wionews.com",
  "aninews.in",
  "uniindia.com",
  // General content / opinion
  "medium.com",
  "substack.com",
  "quora.com",
  "reddit.com",
  "wikipedia.org",
];

const JOB_DOMAINS = [
  "linkedin.com/jobs",
  "naukri.com",
  "iimjobs.com",
  "internshala.com",
  "greenhouse.io",
  "lever.co",
  "myworkdayjobs.com",
  "ashbyhq.com",
  "smartrecruiters.com",
  "jobs.mckinsey.com",
  "careers.bcg.com",
  "careers.bain.com",
  "careers.google.com",
  "careers.microsoft.com",
  "amazon.jobs",
  "metacareers.com",
  "instahyre.com",
  "wellfound.com",
  "angel.co",
  "cutshort.io",
];

const isNewsArticle = (r: OpportunityResult): boolean => {
  try {
    const host = new URL(r.url).hostname.toLowerCase().replace("www.", "");
    return JUNK_DOMAINS.some(
      (d) => host === d || host.endsWith("." + d)
    );
  } catch {
    return false;
  }
};

const isLinkedInPost = (r: OpportunityResult): boolean => {
  try {
    const url = r.url.toLowerCase();
    const host = new URL(r.url).hostname.toLowerCase();
    return (
      host.includes("linkedin.com") &&
      (url.includes("/posts/") ||
        url.includes("/pulse/") ||
        url.includes("/feed/"))
    );
  } catch {
    return false;
  }
};

const CREDIBLE_ALLOWLIST = [
  // ATS platforms — always credible
  "greenhouse.io",
  "boards.greenhouse.io",
  "lever.co",
  "jobs.lever.co",
  "myworkdayjobs.com",
  "ashbyhq.com",
  "smartrecruiters.com",
  "jobvite.com",
  "icims.com",
  "taleo.net",
  "successfactors.com",
  "workable.com",
  "apply.workable.com",
  "recruitee.com",

  // Direct company career pages — MBB and Big 4
  "jobs.mckinsey.com",
  "careers.bcg.com",
  "careers.bain.com",
  "careers.deloitte.com",
  "careers.kpmg.com",
  "careers.ey.com",
  "pwc.com",
  "careers.accenture.com",
  "careers.capgemini.com",

  // Direct company career pages — Tech
  "careers.google.com",
  "careers.microsoft.com",
  "amazon.jobs",
  "metacareers.com",
  "jobs.apple.com",
  "linkedin.com",

  // Quality Indian job boards
  "naukri.com",
  "iimjobs.com",
  "instahyre.com",
  "wellfound.com",
  "cutshort.io",
  "internshala.com",
];

const isCareerSubdomain = (host: string): boolean => {
  return (
    host.startsWith("careers.") ||
    host.startsWith("jobs.") ||
    host.startsWith("career.") ||
    host.startsWith("job.") ||
    host.includes(".greenhouse.io") ||
    host.includes(".lever.co") ||
    host.includes(".myworkdayjobs.com") ||
    host.includes(".ashbyhq.com")
  );
};

const isFromCredibleSource = (r: OpportunityResult): boolean => {
  try {
    const host = new URL(r.url).hostname.toLowerCase().replace("www.", "");
    if (CREDIBLE_ALLOWLIST.some((d) => host === d || host.endsWith("." + d))) {
      return true;
    }
    if (isCareerSubdomain(host)) return true;
    return false;
  } catch {
    return false;
  }
};

const isJobListing = (
  r: OpportunityResult,
  jobType: string,
  experience: string
): boolean => {
  // Gate 0: basic URL presence
  if (!r.url || r.url.trim() === "") return false;

  // Gate 1: credible source allowlist
  if (!isFromCredibleSource(r)) return false;

  // Gate 2: not a LinkedIn post (those go to Hiring Signals)
  if (isLinkedInPost(r)) return false;

  // Gate 3: not buckets C or E
  if (r.bucket === "C" || r.bucket === "E") return false;

  // Gate 4: article/news-style titles
  const title = (r.title ?? "").toLowerCase();
  const ARTICLE_PATTERNS = [
    "opinion",
    "analysis",
    "why ",
    "how ",
    "what is",
    "layoff",
    "funding",
    "raises",
    "opens office",
    "expands",
    "report:",
    "survey:",
    "study:",
  ];
  if (ARTICLE_PATTERNS.some((p) => title.includes(p))) return false;

  // Gate 5: Internshala only for internship job type
  try {
    const host = new URL(r.url).hostname.toLowerCase();
    if (
      host.includes("internshala") &&
      !jobType.toLowerCase().includes("intern")
    ) {
      return false;
    }
  } catch {
    // ignore
  }

  // Gate 6: Experience hard mismatch block (for junior profiles)
  const expLower = (experience ?? "").toLowerCase();
  const snippet = (r.snippet ?? "").toLowerCase();
  const titleLower = (r.title ?? "").toLowerCase();
  const combined = `${titleLower} ${snippet}`;

  if (expLower.includes("fresher") || expLower.includes("0-1")) {
    const SENIOR_INDICATORS = [
      "3+ years",
      "3-6 years",
      "5+ years",
      "5-10 years",
      "7+ years",
      "10+ years",
      "senior consultant",
      "senior manager",
      "associate director",
      "director",
      "mtech mandatory",
      "phd required",
      "must have experience",
      "minimum 3 years",
    ];
    if (SENIOR_INDICATORS.some((ind) => combined.includes(ind))) {
      return false;
    }
  }

  return true;
};

const toReadableSnippet = (raw: string | undefined, maxLen = 180): string => {
  if (!raw) return "";
  const cleaned = raw
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")
    .replace(/\[\s*[^\]]+\]\([^)]+\)/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen)
    .replace(/[^.!?,:]*$/, "")
    .trim();
  return cleaned;
};

const POSITIVE_SIGNAL_PATTERNS = [
  // Funding signals
  "funding",
  "raises",
  "raised",
  "series a",
  "series b",
  "series c",
  "seed round",
  "investment",
  "backed",
  "valuation",
  // Expansion signals
  "new office",
  "expands",
  "expansion",
  "opens",
  "launches",
  "entering",
  "new market",
  "new hub",
  "sets up",
  "establishes",
  "new team",
  "new practice",
  "new division",
  // Hiring signals
  "hiring",
  "to hire",
  "will hire",
  "plans to hire",
  "headcount",
  "adding jobs",
  "creating jobs",
  "new roles",
  "recruitment drive",
  "talent acquisition",
  "workforce expansion",
  // Appointments
  "appoints",
  "welcomes",
  "names",
  "promotes",
  "joins as",
  "strengthens team",
  "bolsters",
];

const NEGATIVE_SIGNAL_PATTERNS = [
  "layoff",
  "laid off",
  "job cuts",
  "retrenchment",
  "firing",
  "employees lose",
  "jobs lost",
  "redundan",
  "downsizing",
  "cost cutting",
  "restructuring",
  "bankruptcy",
  "shutdown",
  "closing down",
  "winding up",
  "losses",
  "deficit",
];

const isPositiveSignal = (r: OpportunityResult): boolean => {
  const title = (r.title ?? "").toLowerCase();
  const snippet = (r.snippet ?? "").toLowerCase();
  const combined = `${title} ${snippet}`;

  if (NEGATIVE_SIGNAL_PATTERNS.some((p) => combined.includes(p))) {
    return false;
  }

  return POSITIVE_SIGNAL_PATTERNS.some((p) => combined.includes(p));
};

const getReachOutReason = (r: OpportunityResult, company: string): string => {
  const title = (r.title ?? "").toLowerCase();
  const snippet = (r.snippet ?? "").toLowerCase();
  const combined = `${title} ${snippet}`;

  const label = company || "This company";

  if (
    combined.includes("series") ||
    combined.includes("funding") ||
    combined.includes("raises") ||
    combined.includes("raised") ||
    combined.includes("investment")
  ) {
    return `${label} recently raised funding — teams typically expand within 60–90 days of a funding round. Reaching out now puts you ahead of the formal job posting.`;
  }
  if (
    combined.includes("new office") ||
    combined.includes("expands") ||
    combined.includes("new hub") ||
    combined.includes("sets up")
  ) {
    return `${label} is opening a new office or expanding operations — they will need to staff up quickly. Early outreach significantly improves your chances.`;
  }
  if (
    combined.includes("hiring") ||
    combined.includes("to hire") ||
    combined.includes("recruitment drive") ||
    combined.includes("headcount")
  ) {
    return `${label} is actively expanding headcount. Reaching out directly to the hiring team or a relevant leader is more effective than applying through a job board.`;
  }
  if (
    combined.includes("appoints") ||
    combined.includes("welcomes") ||
    combined.includes("joins as") ||
    combined.includes("new practice")
  ) {
    return `A new senior hire or practice launch at ${label} often signals team building below. Reaching out to the new leader directly can open doors before roles are posted.`;
  }
  return `${label} is showing growth signals. Early outreach to the right person puts you ahead of the hiring curve.`;
};

const isCredibleSource = (url: string): boolean => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const CREDIBLE = [
      "greenhouse.io",
      "lever.co",
      "myworkdayjobs.com",
      "ashbyhq.com",
      "jobs.mckinsey.com",
      "careers.bcg.com",
      "careers.bain.com",
      "careers.google.com",
      "careers.microsoft.com",
      "amazon.jobs",
      "metacareers.com",
      "linkedin.com",
      "naukri.com",
      "iimjobs.com",
    ];
    return CREDIBLE.some((d) => host === d || host.endsWith("." + d));
  } catch {
    return false;
  }
};

function OpportunityCard({
  r,
  matchData,
  loadingMatch,
  onCheckMatch,
}: {
  r: OpportunityResult;
  matchData?: LazyMatch | null;
  loadingMatch?: boolean;
  onCheckMatch?: () => void;
}) {
  const score =
    matchData != null
      ? Math.round(Math.max(0, Math.min(100, matchData.score)))
      : typeof r.match_score === "number"
        ? Math.round(Math.max(0, Math.min(100, r.match_score)))
        : null;

  const band: OpportunityResult["match_band"] | null =
    matchData != null
      ? matchData.band
      : r.match_band && score !== null
        ? r.match_band
        : score !== null
          ? score >= 80
            ? "Strong"
            : score >= 65
              ? "Good"
              : score >= 50
                ? "Moderate"
                : "Stretch"
          : null;

  const strengths = matchData?.strengths ?? r.match_strengths;
  const gaps = matchData?.gaps ?? r.match_gaps;
  const actionItem = matchData?.actionItem ?? r.match_action_item;
  const hasMatchDetails = Boolean(strengths?.length || gaps?.length || actionItem);

  const verified = r.isVerified ?? isCredibleSource(r.url);

  let bandColor =
    "border-slate-300 text-slate-600 bg-white";
  if (band === "Strong") {
    bandColor = "border-emerald-500 text-emerald-800 bg-emerald-50";
  } else if (band === "Good") {
    bandColor = "border-sky-500 text-sky-800 bg-sky-50";
  } else if (band === "Moderate") {
    bandColor = "border-amber-500 text-amber-800 bg-amber-50";
  } else if (band === "Stretch") {
    bandColor = "border-rose-500 text-rose-800 bg-rose-50";
  }

  return (
    <div className="flex flex-col rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-none transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-[#3C2A6A] line-clamp-2">
            {(() => {
              const company = resolveCompany(r);
              const role = resolveTitle(r, company);

              if (!role && !company) return r.title || "Job listing";
              if (!role) return company!;
              if (!company) return role;
              return `${company}: ${role}`;
            })()}
          </h3>
          {resolveCompany(r) && (
            <p className="mt-1.5 text-sm font-medium text-[#3C2A6A]/90">
              {resolveCompany(r)}
            </p>
          )}
          {r.location && (
            <p className="mt-0.5 text-xs text-slate-500">
              📍 {r.location}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500 line-clamp-1">
            {getSourceBadge(r.url)}
            {r.posted_at && (
              <span className="ml-2 text-slate-400">· {r.posted_at}</span>
            )}
          </p>
        </div>
        {score !== null && band && (
          <div className="flex flex-col items-center gap-1">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-xs font-semibold ${bandColor}`}
            >
              {score}
            </div>
            <span className="text-[10px] font-medium text-slate-600">
              {band}
            </span>
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="rounded-md bg-[#3C2A6A]/10 px-2 py-0.5 text-[10px] font-medium text-[#3C2A6A]">
          {getSourceBadge(r.url)}
        </span>
        {r.isFresh && (
          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 uppercase tracking-wide">
            🟢 Fresh
          </span>
        )}
        {r.isDirect && (
          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
            Direct
          </span>
        )}
        {verified && (
          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
            Verified Source
          </span>
        )}
      </div>
      {(r.summary || r.snippet) && (
        <p className="mt-3 line-clamp-2 flex-1 text-xs text-slate-600">
          {r.summary || r.snippet}
        </p>
      )}
      {hasMatchDetails && (
        <div className="mt-3 border-t border-dashed border-slate-200 pt-3 text-xs text-slate-700 space-y-1.5">
          {strengths?.length ? (
            <p>
              <span className="font-semibold text-[#3C2A6A]">Strengths: </span>
              <span>{strengths.slice(0, 2).join("; ")}</span>
            </p>
          ) : null}
          {gaps?.length ? (
            <p>
              <span className="font-semibold text-[#3C2A6A]">Gaps: </span>
              <span>{gaps.slice(0, 2).join("; ")}</span>
            </p>
          ) : null}
          {actionItem ? (
            <p>
              <span className="font-semibold text-[#3C2A6A]">Action: </span>
              <span>{actionItem}</span>
            </p>
          ) : null}
        </div>
      )}
      <div className="mt-4 flex flex-col gap-2">
        {onCheckMatch && matchData == null ? (
          <button
            type="button"
            onClick={onCheckMatch}
            disabled={loadingMatch}
            className="inline-flex w-full justify-center rounded-full border-2 border-[#3C2A6A] bg-white py-2.5 text-sm font-medium text-[#3C2A6A] hover:bg-[#3C2A6A]/5 disabled:opacity-60"
          >
            {loadingMatch ? "Checking…" : "Check Profile Match"}
          </button>
        ) : null}
        <a
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full justify-center rounded-full bg-[#3C2A6A] py-2.5 text-sm font-medium text-[#FDFBF1] hover:bg-[#4a347f]"
        >
          Apply now
        </a>
      </div>
    </div>
  );
}

export default function OpportunityPage() {
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(1);
  const [flowStep, setFlowStep] = useState<FlowStep>("filters");
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
  const [sortMode, setSortMode] = useState<"match" | "prestige" | "recency">(
    "match"
  );
  const [matchByUrl, setMatchByUrl] = useState<Record<string, LazyMatch>>({});
  const [loadingMatchUrl, setLoadingMatchUrl] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("matches");
  const [peopleByCompany, setPeopleByCompany] = useState<
    Record<
      string,
      {
        full_name?: string;
        job_title?: string;
        job_company_name?: string;
        linkedin_url?: string;
      }[]
    >
  >({});
  const [loadingPeopleCompany, setLoadingPeopleCompany] = useState<string | null>(
    null
  );
  const [signalsLimit, setSignalsLimit] = useState(20);
  const [radarLimit, setRadarLimit] = useState(10);
  const [radarReasonByUrl, setRadarReasonByUrl] = useState<Record<string, string>>(
    {}
  );
  const [loadingRadarReasonUrl, setLoadingRadarReasonUrl] = useState<string | null>(
    null
  );
  const [benchmarkProfile, setBenchmarkProfile] = useState<{
    top_skills?: string | null;
    latest_company?: string | null;
    highest_degree?: string | null;
  } | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null);

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

  useEffect(() => {
    if (flowStep !== "confirm_profile") return;
    setBenchmarkError(null);
    setBenchmarkLoading(true);
    const supabase = createSupabaseClient();
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setBenchmarkError("Please log in to confirm your profile.");
          setBenchmarkProfile(null);
          return;
        }

        const { data, error } = await supabase
          .from("user_profiles")
          .select("skills, internships, university")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          setBenchmarkError(
            "We couldn't load your saved CV details. You can still run the hunt or update your profile."
          );
          setBenchmarkProfile(null);
        } else if (data) {
          setBenchmarkProfile({
            top_skills: (data as any).skills ?? null,
            latest_company: (data as any).internships ?? null,
            highest_degree: (data as any).university ?? null,
          });
        } else {
          setBenchmarkError(
            "No saved CV found. You can still run the hunt or update your profile."
          );
          setBenchmarkProfile(null);
        }
      } catch (e) {
        setBenchmarkError(
          "Failed to load your profile. You can still run the hunt or update your profile."
        );
        setBenchmarkProfile(null);
      } finally {
        setBenchmarkLoading(false);
      }
    })();
  }, [flowStep]);

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
      const sentinelPayload = {
        industry: filters.industry,
        jobType: filters.jobType,
        experience: filters.experience,
        location: filters.location || undefined,
        pay: filters.pay || undefined,
        companies: filters.companies
          ? filters.companies
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
        roles: filters.roles
          ? filters.roles
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      };

      const [res, radarResults, hiringResults] = await Promise.all([
        fetch("/api/discovery/sentinel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sentinelPayload),
        }),
        fetch("/api/discovery/radar-signals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            industry: filters.industry,
            topCompanies: getTopCompanies(
              filters.industry as IndustryName,
              12
            ),
            location: filters.location || undefined,
          }),
        }).then(async (r) => (r.ok ? r.json() : { signals: [] })),
        fetch("/api/discovery/hiring-signals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            industry: filters.industry,
            topCompanies: getTopCompanies(
              filters.industry as IndustryName,
              10
            ),
            roleVariants: getRoleVariants(
              filters.industry as IndustryName
            ).slice(0, 4),
            location: filters.location || undefined,
            jobType: filters.jobType,
            experience: filters.experience,
          }),
        }).then(async (r) => (r.ok ? r.json() : { signals: [] })),
      ]);

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

      const withoutLegacySignals = baseResults.filter(
        (r) => r.bucket !== "C" && r.bucket !== "E"
      );

      const serpHiringSignals: OpportunityResult[] = baseResults
        .filter((r) => r.bucket === "C")
        .map((r) => ({ ...r, source: r.source ?? "LinkedIn" }));

      const serpRadarSignals: OpportunityResult[] = baseResults
        .filter((r) => r.bucket === "E")
        .map((r) => ({ ...r, source: r.source ?? "News" }));

      const radarSignals: OpportunityResult[] = (radarResults?.signals ?? []).map(
        (s: any) => ({
          title: String(s.title ?? ""),
          url: String(s.url ?? ""),
          snippet: String(s.snippet ?? ""),
          source: String(s.source ?? "News"),
          isDirect: false,
          company: null,
          bucket: "E",
        })
      );

      const hiringData = hiringResults ?? {};

      const hiringSignalsFromApi: OpportunityResult[] = (
        hiringData.signals ?? []
      ).map((s: any) => ({
        title: String(s.title ?? ""),
        url: String(s.url ?? ""),
        snippet: String(s.snippet ?? ""),
        source: "LinkedIn",
        isDirect: false,
        company: null,
        bucket: "C",
      }));

      const linkedInJobsMapped: OpportunityResult[] = (
        hiringData.linkedInJobs ?? []
      ).map((job: any, idx: number) => {
        const rawTitle = String(job.title ?? "");

        const extractCompany = (title: string): string => {
          const atMatch = title.match(/\bat\s+(.+)$/i);
          if (atMatch) return atMatch[1].trim();
          const colonMatch = title.match(/^([^:]{2,40}):\s+/);
          if (colonMatch) return colonMatch[1].trim();
          return "";
        };

        const extractTitle = (title: string, company: string): string => {
          if (company) {
            return title
              .replace(new RegExp(`\\s+at\\s+${company}`, "i"), "")
              .replace(new RegExp(`^${company}:\\s+`, "i"), "")
              .trim();
          }
          return title;
        };

        const rawCompany = extractCompany(rawTitle);
        const cleanTitle = extractTitle(rawTitle, rawCompany);

        const snippetStr = String(job.snippet ?? "");
        const snippetLower = snippetStr.toLowerCase();
        const CITIES = [
          "mumbai",
          "delhi",
          "bangalore",
          "bengaluru",
          "gurgaon",
          "gurugram",
          "hyderabad",
          "pune",
          "chennai",
          "kolkata",
          "noida",
          "ahmedabad",
          "remote",
        ];
        const foundCity = CITIES.find((c) => snippetLower.includes(c));
        const location =
          foundCity != null
            ? foundCity.charAt(0).toUpperCase() + foundCity.slice(1)
            : "India";

        const publishedDate = job.publishedDate as string | undefined;
        const posted_at =
          publishedDate && !Number.isNaN(Date.parse(publishedDate))
            ? (() => {
                const days = Math.floor(
                  (Date.now() - new Date(publishedDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                if (days === 0) return "Today";
                if (days === 1) return "Yesterday";
                if (days <= 7) return `${days} days ago`;
                if (days <= 30) return `${Math.floor(days / 7)} weeks ago`;
                return `${Math.floor(days / 30)} months ago`;
              })()
            : null;

        return {
          title: cleanTitle || rawTitle,
          company: rawCompany || null,
          url: String(job.url ?? ""),
          snippet: snippetStr,
          source: "LinkedIn",
          bucket: "B",
          displayName: rawCompany || null,
          originalIndex: idx,
          recencyScore: Number(job.recencyScore ?? 0),
          isFresh: Boolean(job.isFresh),
          isVerified: true,
          isDirect: false,
          match_score: undefined,
          prestige_score: undefined,
          location,
          posted_at,
        } as OpportunityResult;
      });

      const merged: OpportunityResult[] = [
        ...withoutLegacySignals,
        ...linkedInJobsMapped,
        // On The Radar — Exa + SerpApi merged
        ...radarSignals,
        ...serpRadarSignals,
        // Hiring Signals — Exa + SerpApi merged
        ...hiringSignalsFromApi,
        ...serpHiringSignals,
      ];

      const withIndex = merged.map((r, idx) => ({
        ...r,
        originalIndex: idx,
      }));

      setResults(withIndex);
      setResultsByCompany(data.resultsByCompany || {});
      setMatchByUrl({});
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

  const fetchMatchForJob = useCallback(
    async (job: OpportunityResult) => {
      setLoadingMatchUrl(job.url);
      try {
        const res = await fetch("/api/discovery/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job: {
              title: job.displayName || job.title,
              company: job.company,
              description: job.summary || job.snippet,
              url: job.url,
              source: job.source,
              seniorityHint: filters.experience,
            },
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Match check failed");
          return;
        }
        setMatchByUrl((prev) => ({
          ...prev,
          [job.url]: {
            score: data.score,
            band: data.band,
            strengths: data.strengths ?? [],
            gaps: data.gaps ?? [],
            actionItem: data.actionItem ?? "",
          },
        }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Check failed");
      } finally {
        setLoadingMatchUrl(null);
      }
    },
    [filters.experience]
  );

  const fetchPeopleForCompany = useCallback(
    async (company: string) => {
      if (!company) return;
      setLoadingPeopleCompany(company);
      setError(null);
      try {
        const res = await fetch("/api/opportunity/people", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Could not load people for outreach");
          return;
        }
        const people = Array.isArray(data.people) ? data.people : [];
        setPeopleByCompany((prev) => ({
          ...prev,
          [company]: people,
        }));
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not load people for outreach"
        );
      } finally {
        setLoadingPeopleCompany(null);
      }
    },
    []
  );

  const fetchRadarReason = useCallback(
    async (job: OpportunityResult, company: string) => {
      if (!job.url || loadingRadarReasonUrl === job.url) return;
      setLoadingRadarReasonUrl(job.url);
      try {
        const res = await fetch("/api/opportunity/radar-explanation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company,
            title: job.title,
            snippet: job.snippet,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          console.warn(
            "[opportunity] radar explanation failed for",
            job.url,
            data?.error
          );
          return;
        }
        if (typeof data.reason === "string" && data.reason.trim()) {
          setRadarReasonByUrl((prev) => ({
            ...prev,
            [job.url]: data.reason.trim(),
          }));
        }
      } catch (e) {
        console.warn("[opportunity] radar explanation call error", e);
      } finally {
        setLoadingRadarReasonUrl(null);
      }
    },
    [loadingRadarReasonUrl]
  );

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    setOnboardingStep(1);
    setFlowStep("filters");
    setResults([]);
    setResultsByCompany({});
    setMatchByUrl({});
    setError(null);
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

  if (flowStep === "filters") {
    return (
      <div
        className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-4 py-12"
        style={{ backgroundColor: CREAM }}
      >
        <div className="w-full max-w-2xl">
          <p className="text-center font-serif text-2xl font-semibold text-[#3C2A6A] sm:text-3xl">
            {onboardingStep === 1
              ? "What are you looking for?"
              : "Add more details (optional)"}
          </p>

          {onboardingStep === 1 && (
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
                  onClick={() => setOnboardingStep(2)}
                  disabled={!canProceedFromStep1}
                  className="rounded-full bg-[#3C2A6A] px-8 py-3 text-sm font-medium text-[#FDFBF1] transition-opacity disabled:opacity-40 hover:bg-[#4a347f]"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {onboardingStep === 2 && (
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
                  onClick={() => setFlowStep("confirm_profile")}
                  className="rounded-full bg-[#3C2A6A] px-8 py-3 text-sm font-medium text-[#FDFBF1] hover:bg-[#4a347f]"
                >
                  Start Hunt
                </button>
                <button
                  type="button"
                  onClick={() => setFlowStep("confirm_profile")}
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

  if (flowStep === "confirm_profile") {
    const bp = benchmarkProfile as any | null;
    // Normalise skills snippet (supports string or array) – include all skills
    let skillsSnippet: string | null = null;
    if (Array.isArray(bp?.top_skills)) {
      skillsSnippet = (bp.top_skills as any[])
        .map((s) => String(s).trim())
        .filter(Boolean)
        .join(", ");
    } else if (typeof bp?.top_skills === "string" && bp.top_skills.trim()) {
      skillsSnippet = bp.top_skills
        .split(/[,|]/)
        .map((s: string) => s.trim())
        .filter(Boolean)
        .join(", ");
    }

    // Normalise experience snippet (supports string or array) – include all titles
    let companySnippet: string | null = null;
    if (Array.isArray(bp?.latest_company)) {
      companySnippet = (bp.latest_company as any[])
        .map((s) => String(s).trim())
        .filter(Boolean)
        .join(", ");
    } else if (
      typeof bp?.latest_company === "string" &&
      bp.latest_company.trim()
    ) {
      companySnippet = bp.latest_company
        .split(/[,|]/)
        .map((s: string) => s.trim())
        .filter(Boolean)
        .join(", ");
    }

    const degreeSnippet =
      typeof bp?.highest_degree === "string" && bp.highest_degree.trim()
        ? bp.highest_degree.trim()
        : null;

    const activeSections: string[] = [];
    if (skillsSnippet) activeSections.push("Skills");
    if (companySnippet) activeSections.push("Internships / Experience");
    if (degreeSnippet) activeSections.push("Education");

    const confirmLine =
      activeSections.length > 0
        ? `We will use the ${activeSections.join(
            ", "
          )} section${activeSections.length > 1 ? "s" : ""} from your uploaded CV to power Opportunity Intelligence.`
        : "We will use your uploaded CV to power Opportunity Intelligence.";

    return (
      <div
        className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-4 py-12"
        style={{ backgroundColor: CREAM }}
      >
        <div className="w-full max-w-2xl space-y-6">
          <div className="rounded-2xl border border-white bg-white p-6 text-[#3C2A6A] shadow-sm">
            <h3 className="text-sm font-semibold text-[#3C2A6A]">
              Executive summary
            </h3>
            <div className="mt-2 space-y-1 text-sm">
              {skillsSnippet && (
                <p>
                  <span className="font-semibold text-[#3C2A6A]">Skills: </span>
                  <span className="text-[#3C2A6A]">{skillsSnippet}</span>
                </p>
              )}
              {companySnippet && (
                <p>
                  <span className="font-semibold text-[#3C2A6A]">
                    Experience:{" "}
                  </span>
                  <span className="text-[#3C2A6A]">{companySnippet}</span>
                </p>
              )}
              {degreeSnippet && (
                <p>
                  <span className="font-semibold text-[#3C2A6A]">
                    Education:{" "}
                  </span>
                  <span className="text-[#3C2A6A]">{degreeSnippet}</span>
                </p>
              )}
              {!skillsSnippet && !companySnippet && !degreeSnippet && (
                <p className="text-[#3C2A6A]">
                  We will benchmark roles against your uploaded CV profile.
                </p>
              )}
            </div>
            <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-[#3C2A6A]/80">
              Identity confirmation
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {benchmarkLoading
                ? "Pulling your benchmarking attributes from your uploaded CV..."
                : confirmLine}
            </p>
            {benchmarkError && (
              <p className="mt-2 text-xs text-red-600">
                {benchmarkError}
              </p>
            )}
            <p className="mt-4 text-[11px] text-slate-500">
              Benchmarking grounded in your verified history for maximum match accuracy.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={async () => {
                await runHunt();
                setFlowStep("results");
              }}
              className="rounded-full bg-[#3C2A6A] px-8 py-3 text-sm font-medium text-[#FDFBF1] hover:bg-[#4a347f]"
              disabled={benchmarkLoading}
            >
              Confirm &amp; Start Hunt
            </button>
            <Link
              href="/dashboard"
              className="rounded-full border border-[#3C2A6A]/30 bg-white px-8 py-3 text-sm font-medium text-[#3C2A6A] hover:bg-[#3C2A6A]/5"
            >
              Update Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const deduplicatedResults = (() => {
    const seen = new Map<string, OpportunityResult>();

    const sorted = [...results].sort((a, b) => {
      const aCredible = isFromCredibleSource(a) ? 0 : 1;
      const bCredible = isFromCredibleSource(b) ? 0 : 1;
      return aCredible - bCredible;
    });

    const STOP_WORDS = new Set([
      "intern",
      "senior",
      "associate",
      "manager",
      "the",
      "and",
      "for",
      "with",
      "our",
      "new",
      "india",
      "delhi",
      "mumbai",
      "bangalore",
      "gurgaon",
    ]);

    for (const r of sorted) {
      if (seen.has(r.url)) continue;

      const company = (resolveCompany(r) ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 15);

      const titleWords = (r.title ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(
          (w) => w.length > 3 && !STOP_WORDS.has(w)
        )
        .sort()
        .slice(0, 4)
        .join("|");

      const fuzzyKey = `${company}__${titleWords}`;

      if (!seen.has(fuzzyKey)) {
        seen.set(r.url, r);
        seen.set(fuzzyKey, r);
      }
    }

    const urlEntries = [...seen.entries()].filter(([k]) => k.startsWith("http"));
    return [...new Map(urlEntries).values()];
  })();

  const yourMatches = deduplicatedResults.filter((r) =>
    isJobListing(r, filters.jobType, filters.experience)
  );

  const hiringSignals = deduplicatedResults.filter((r) => {
    if (r.bucket === "C") return true;
    if (isLinkedInPost(r)) return true;
    return false;
  });

  const onTheRadar = deduplicatedResults.filter((r) => {
    const isRadarSource =
      r.bucket === "E" ||
      isNewsArticle(r) ||
      (() => {
        try {
          const host = new URL(r.url).hostname.toLowerCase().replace("www.", "");
          return JUNK_DOMAINS.some(
            (d) => host === d || host.endsWith("." + d)
          );
        } catch {
          return false;
        }
      })();

    if (!isRadarSource) return false;
    return isPositiveSignal(r);
  });

  const TIER1_SIGNAL_COMPANIES = getTopCompanies(
    filters.industry as IndustryName,
    8
  ).map((c) => c.toLowerCase());

  function scoreResult(
    r: OpportunityResult,
    industry: string,
    jobType: string,
    experience: string,
    cvSkills?: string | null,
    cvExperience?: string | null
  ): number {
    const text = `${r.title ?? ""} ${r.snippet ?? ""} ${r.company ?? ""}`.toLowerCase();
    let score = 0;

    // Delegate to repository scoring — covers roles, companies, skills, signals
    const industryScore = scoreAgainstIndustry(text, industry as IndustryName);
    score += industryScore;

    // Penalise if repository returns zero or negative score
    if (industryScore <= 0) {
      score -= 20;
    }

    // CV skills match — high weight
    if (cvSkills) {
      const rawSkills: any = cvSkills as any;
      let skillsSource: string | null = null;
      if (Array.isArray(rawSkills)) {
        skillsSource = rawSkills
          .map((s: any) => String(s).trim())
          .filter(Boolean)
          .join(", ");
      } else if (typeof rawSkills === "string") {
        skillsSource = rawSkills;
      }
      if (skillsSource) {
        const skillTokens = skillsSource
          .toLowerCase()
          .split(/[,|;\n]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 2);
        const skillMatches = skillTokens.filter((sk) => text.includes(sk)).length;
        score += skillMatches * 8;
      }
    }

    // CV experience / past companies match
    if (cvExperience) {
      const rawExp: any = cvExperience as any;
      let expSource: string | null = null;
      if (Array.isArray(rawExp)) {
        expSource = rawExp
          .map((s: any) => String(s).trim())
          .filter(Boolean)
          .join(", ");
      } else if (typeof rawExp === "string") {
        expSource = rawExp;
      }
      if (expSource) {
        const expTokens = expSource
          .toLowerCase()
          .split(/[,|;\n]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 2);
        const expMatches = expTokens.filter((ex) => text.includes(ex)).length;
        score += expMatches * 6;
      }
    }

    // Experience level seniority match — penalise mismatches
    const expLower = (experience || "").toLowerCase();
    const isJunior =
      expLower.includes("fresher") || expLower.includes("0-1");
    const isSenior = expLower.includes("5+");

    const textHasSeniorTerms =
      text.includes("senior") ||
      text.includes(" vp ") ||
      text.includes("director") ||
      text.includes("head of");
    const textHasJuniorTerms =
      text.includes("intern") ||
      text.includes("fresher") ||
      text.includes("entry level");

    const seniorityMismatch =
      (isJunior && textHasSeniorTerms) || (isSenior && textHasJuniorTerms);
    if (seniorityMismatch) {
      score -= 25;
    }

    // Light bonus if job type and experience string appear in text
    if (jobType && text.includes(jobType.toLowerCase())) {
      score += 10;
    }
    if (experience && text.toLowerCase().includes(experience.toLowerCase())) {
      score += 10;
    }

    return score;
  }

  const hiringSignalsSorted = [...hiringSignals].sort((a, b) => {
    const aText = `${(a.title ?? "")} ${(a.company ?? "")} ${(a.snippet ?? "")}`.toLowerCase();
    const bText = `${(b.title ?? "")} ${(b.company ?? "")} ${(b.snippet ?? "")}`.toLowerCase();

    const aIsTier1 = TIER1_SIGNAL_COMPANIES.some((c) => aText.includes(c));
    const bIsTier1 = TIER1_SIGNAL_COMPANIES.some((c) => bText.includes(c));
    if (aIsTier1 && !bIsTier1) return -1;
    if (!aIsTier1 && bIsTier1) return 1;

    const bp = benchmarkProfile;
    const sa = scoreResult(
      a,
      filters.industry,
      filters.jobType,
      filters.experience,
      bp?.top_skills ?? null,
      bp?.latest_company ?? null
    );
    const sb = scoreResult(
      b,
      filters.industry,
      filters.jobType,
      filters.experience,
      bp?.top_skills ?? null,
      bp?.latest_company ?? null
    );
    return sb - sa;
  });

  const getSourceTier = (r: OpportunityResult): number => {
    try {
      const host = new URL(r.url).hostname.toLowerCase();

      // Tier 1: Direct company career pages and ATS
      const TIER_1 = [
        "greenhouse.io",
        "lever.co",
        "myworkdayjobs.com",
        "ashbyhq.com",
        "smartrecruiters.com",
        "jobs.mckinsey.com",
        "careers.bcg.com",
        "careers.bain.com",
        "careers.google.com",
        "careers.microsoft.com",
        "amazon.jobs",
        "metacareers.com",
        "careers.deloitte.com",
        "careers.kpmg.com",
        "careers.ey.com",
        "careers.pwc.com",
        "jobs.lever.co",
        "apply.workable.com",
        "boards.greenhouse.io",
      ];
      if (TIER_1.some((d) => host === d || host.endsWith("." + d))) return 1;

      // Tier 2: Quality job boards with individual listings
      const TIER_2 = [
        "linkedin.com",
        "naukri.com",
        "iimjobs.com",
        "internshala.com",
        "wellfound.com",
        "cutshort.io",
        "instahyre.com",
        "angel.co",
      ];
      if (TIER_2.some((d) => host === d || host.endsWith("." + d))) return 2;

      // Tier 3: Other job boards
      return 3;
    } catch {
      return 4;
    }
  };

  const BUCKET_RANK: Record<NonNullable<OpportunityResult["bucket"]>, number> = {
    A: 1,
    B: 2,
    C: 3,
    D: 4,
    E: 5,
  };

  const sortedMatches = [...yourMatches].sort((a, b) => {
    const bp = benchmarkProfile;
    // Priority 1: Direct ATS/company career pages always first
    const ta = getSourceTier(a);
    const tb = getSourceTier(b);
    if (ta !== tb) return ta - tb;

    // Priority 2: CV match score if user has checked
    if (sortMode === "match") {
      const ma = matchByUrl[a.url]?.score ?? a.match_score ?? -1;
      const mb = matchByUrl[b.url]?.score ?? b.match_score ?? -1;
      if (mb !== ma) return mb - ma;
    } else if (sortMode === "prestige") {
      const pa = a.prestige_score ?? 0;
      const pb = b.prestige_score ?? 0;
      if (pb !== pa) return pb - pa;
    }

      // Priority 2.5: Recency boost for LinkedIn jobs
      const ra = (a as any).recencyScore ?? 0;
      const rb = (b as any).recencyScore ?? 0;
      if (rb !== ra) return rb - ra;

    // Priority 3: Industry + CV relevance score
    const sa = scoreResult(
      a,
      filters.industry,
      filters.jobType,
      filters.experience,
      bp?.top_skills ?? null,
      bp?.latest_company ?? null
    );
    const sb = scoreResult(
      b,
      filters.industry,
      filters.jobType,
      filters.experience,
      bp?.top_skills ?? null,
      bp?.latest_company ?? null
    );
    if (sb !== sa) return sb - sa;

    // Priority 4: Bucket rank (A before B before C...)
    const ba = BUCKET_RANK[a.bucket ?? "E"] ?? 4;
    const bb = BUCKET_RANK[b.bucket ?? "E"] ?? 4;
    if (ba !== bb) return ba - bb;

    // Final tie-breaker: Original index for determinism
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
                setSortMode(
                  e.target.value === "recency"
                    ? "recency"
                    : e.target.value === "match"
                      ? "match"
                      : "prestige"
                )
              }
              className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs text-[#3C2A6A] focus:border-[#3C2A6A]/60 focus:outline-none"
            >
              <option value="match">Best Fit (Match Score)</option>
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

      {flowStep === "results" && results.length > 0 && (
        <div className="mt-2 flex gap-4 border-b border-[#E5E7EB] pb-2 text-sm">
          {[
            { id: "matches" as Section, label: "Your Matches" },
            { id: "signals" as Section, label: "Hiring Signals" },
            { id: "radar" as Section, label: "On The Radar" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`pb-1 border-b-2 ${
                activeSection === tab.id
                  ? "border-[#3C2A6A] text-[#3C2A6A]"
                  : "border-transparent text-slate-500 hover:text-[#3C2A6A]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {results.length === 0 && !loading && flowStep === "results" && (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white/80 px-6 py-10 text-center">
          <p className="font-serif text-lg text-[#3C2A6A]">No opportunities found for this search.</p>
          <p className="mt-2 text-sm text-slate-600">Try resetting filters or changing industry / role.</p>
        </div>
      )}

      {results.length > 0 && activeSection === "matches" && (
        <>
          {/* Flat list (Your Matches) */}
          <div className="mt-8 space-y-4">
            <h2 className="font-serif text-lg font-semibold text-[#3C2A6A]">
              Your Matches
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedMatches.map((r, i) => (
                <OpportunityCard
                  key={`${r.url}-${i}`}
                  r={r}
                  matchData={matchByUrl[r.url]}
                  loadingMatch={loadingMatchUrl === r.url}
                  onCheckMatch={() => fetchMatchForJob(r)}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {results.length > 0 && activeSection === "signals" && (
        <div className="mt-6 space-y-4">
          <h2 className="font-serif text-lg font-semibold text-[#3C2A6A]">
            Hiring Signals
          </h2>
          <div className="space-y-3">
          {hiringSignalsSorted.slice(0, signalsLimit).map((r, i) => (
              <div
                key={`${r.url}-${i}`}
                className="rounded-2xl border border-[#E5E7EB] bg-white p-4"
              >
                <p className="text-sm font-semibold text-[#3C2A6A]">
                  {(() => {
                    const company = resolveCompany(r);
                    const rawTitle = (r.title ?? "").trim();
                    const isPersonPost = /['']s\s+post$/i.test(rawTitle);
                    if (isPersonPost) {
                      const personName = rawTitle
                        .replace(/['']s\s+post$/i, "")
                        .trim();
                      if (
                        company &&
                        company.toLowerCase() !== "unknown company"
                      ) {
                        return `${personName} · ${company}`;
                      }
                      return personName || "Hiring Signal";
                    }
                    if (
                      company &&
                      company.toLowerCase() !== "unknown company"
                    ) {
                      return company;
                    }
                    const cleaned =
                      rawTitle.replace(/^unknown company:\s*/i, "").trim();
                    return cleaned || "Hiring Signal";
                  })()}
                </p>
                {toReadableSnippet(r.snippet) && (
                  <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                    {toReadableSnippet(r.snippet)}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-[#3C2A6A] px-3 py-1 text-xs font-medium text-[#FDFBF1]"
                  >
                    Draft Outreach Message
                  </button>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-[#3C2A6A]/40 px-3 py-1 text-xs font-medium text-[#3C2A6A]"
                  >
                    View Post
                  </a>
                </div>
              </div>
            ))}
            {hiringSignals.length > signalsLimit && (
              <button
                type="button"
                onClick={() =>
                  setSignalsLimit((prev) => Math.min(prev + 20, hiringSignals.length))
                }
                className="mt-2 rounded-full border border-[#3C2A6A]/40 bg-white px-4 py-1.5 text-[11px] font-medium text-[#3C2A6A] hover:bg-[#3C2A6A]/5"
              >
                Load more signals
              </button>
            )}
          </div>
        </div>
      )}

      {results.length > 0 && activeSection === "radar" && (
        <div className="mt-6 space-y-4">
          <h2 className="font-serif text-lg font-semibold text-[#3C2A6A]">
            On The Radar
          </h2>
          <div className="space-y-3">
            {onTheRadar.slice(0, radarLimit).map((r, i) => (
              <div
                key={`${r.url}-${i}`}
                className="rounded-2xl border border-[#E5E7EB] bg-white p-4"
              >
                {(() => {
                  const company = resolveCompany(r);
                  const rawTitle = (r.title ?? "").trim();
                  const heading =
                    company && company.toLowerCase() !== "unknown company"
                      ? company
                      : rawTitle.replace(/^unknown company:\s*/i, "").trim() ||
                        "Signal";
                  const resolvedRadarCompany = (company || "").trim();

                  if (
                    resolvedRadarCompany &&
                    !radarReasonByUrl[r.url] &&
                    loadingRadarReasonUrl !== r.url
                  ) {
                    fetchRadarReason(r, resolvedRadarCompany);
                  }

                  return (
                    <>
                      <p className="text-sm font-semibold text-[#3C2A6A]">
                        {heading}
                      </p>
                      {toReadableSnippet(r.snippet) && (
                        <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                          {toReadableSnippet(r.snippet)}
                        </p>
                      )}
                      <p className="mt-2 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                        💡{" "}
                        {radarReasonByUrl[r.url] ??
                          getReachOutReason(r, resolvedRadarCompany)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            fetchPeopleForCompany(resolvedRadarCompany)
                          }
                          disabled={
                            !resolvedRadarCompany ||
                            loadingPeopleCompany === resolvedRadarCompany
                          }
                          className="rounded-full bg-[#3C2A6A] px-3 py-1 text-xs font-medium text-[#FDFBF1] disabled:opacity-60"
                        >
                          {loadingPeopleCompany === resolvedRadarCompany
                            ? "Loading people…"
                            : "People to Reach Out to"}
                        </button>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-[#3C2A6A]/40 px-3 py-1 text-xs font-medium text-[#3C2A6A]"
                        >
                          View Signal
                        </a>
                      </div>
                      {resolvedRadarCompany &&
                        peopleByCompany[resolvedRadarCompany]?.length && (
                          <ul className="mt-3 space-y-1 text-xs text-slate-700">
                            {peopleByCompany[resolvedRadarCompany].map(
                              (p, idx) => (
                                <li key={`${resolvedRadarCompany}-${idx}`}>
                                  <span className="font-semibold">
                                    {p.full_name || "Contact"}
                                  </span>
                                  {p.job_title && (
                                    <span className="text-slate-600">
                                      {" "}
                                      — {p.job_title}
                                    </span>
                                  )}
                                  {p.linkedin_url && (
                                    <a
                                      href={p.linkedin_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ml-2 text-[11px] font-medium text-[#0A66C2]"
                                    >
                                      LinkedIn
                                    </a>
                                  )}
                                </li>
                              )
                            )}
                          </ul>
                        )}
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
          {onTheRadar.length > radarLimit && (
            <button
              type="button"
              onClick={() =>
                setRadarLimit((prev) => Math.min(prev + 10, onTheRadar.length))
              }
              className="mt-2 rounded-full border border-[#3C2A6A]/40 bg-white px-4 py-1.5 text-[11px] font-medium text-[#3C2A6A] hover:bg-[#3C2A6A]/5"
            >
              Load more signals
            </button>
          )}
        </div>
      )}
    </div>
  );
}
