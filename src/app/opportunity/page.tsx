"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import {
  scoreAgainstIndustry,
  getTopCompanies,
  getRoleVariants,
  type IndustryName,
} from "@/lib/industryKeywords";
import type { OpportunityResult } from "@/types/opportunity";

const CREAM = "#FDFBF1";
const PURPLE = "#3C2A6A";

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
    if (host.includes("jsearch") || host.includes("rapidapi")) return "JSearch";
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
  
  // JSearch aggregator domains — these are validated by JSearch API
  "jobrapido.com",
  "in.jobrapido.com",
  "glassdoor.com",
  "glassdoor.co.in",
  "indeed.com",
  "in.indeed.com",
  "ziprecruiter.com",
  "simplyhired.com",
  "monster.com",
  "monsterindia.com",
  "shine.com",
  "foundit.in",
  "timesjobs.com",
  "freshersworld.com",
  "apna.co",
  "hirist.com",
  "angel.co",
  
  // Additional job sources
  "careerbuilder.com",
  "dice.com",
  "reed.co.uk",
  "seek.com",
  "jora.com",
  "adzuna.com",
  "adzuna.in",
  "jobgrin.com",
  "naukrigulf.com",
  "firstnaukri.com",
  "rozee.pk",
  "bayt.com",
  "jobstreet.com",
  "jobsdb.com",
  "jobs.ch",
  "stepstone.com",
  "xing.com",
  "totaljobs.com",
  "cwjobs.co.uk",
  "talent.com",
  "zippia.com",
  "builtin.com",
  "flexjobs.com",
  "remoteco.com",
  "weworkremotely.com",
  "remoteok.com",
  "authenticjobs.com",
  "dribbble.com/jobs",
  "behance.net/joblist",
  "stackoverflow.com/jobs",
  "github.com/jobs",
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
  // JSearch-verified jobs always pass (they've been validated by JSearch API)
  if (r.isVerified === true && r.bucket === "B") {
    return true;
  }
  
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

// Patterns that indicate a job is closed, removed, or an error page — not an actual listing
const CLOSED_OR_EMPTY_JOB_PATTERNS = [
  "job not found",
  "taken down",
  "closed or removed",
  "no longer accepting",
  "job has been closed",
  "no longer available",
  "position has been filled",
  "listing has expired",
  "removed by the administrator",
  "application closed",
  "applications closed",
  "this job is closed",
  "this position is closed",
  "this role has been filled",
  "role has been filled",
  "vacancy closed",
  "vacancy filled",
  "not accepting applications",
  "job expired",
  "posting expired",
  "job has expired",
  "opening has been filled",
  "job requisition has been closed",
  "requisition closed",
  "over 100 applicants",
  "we've paused",
  "paused accepting",
  "currently not hiring",
  "hiring paused",
  "applications are closed",
  "job posting has ended",
  "application deadline passed",
  "deadline has passed",
  "this opening is closed",
  "this opportunity is closed",
];

// Career-site landing/search page text — we want actual job URLs, not "Search Jobs" pages
const CAREER_LANDING_PATTERNS = [
  "search jobs",
  "find your next",
  "browse jobs",
  "browse opportunities",
  "job not found",
  "this job may have been taken down",
];

// Non-India location strings — results with these should be excluded for India-tailored results
const NON_INDIA_LOCATION_STRINGS = [
  // North America
  "usa", "united states", "u.s.", "u.s.a",
  "new york", "california", "texas", "boston", "chicago", "seattle",
  "san francisco", "los angeles", "atlanta", "denver", "miami",
  "washington dc", "toronto", "vancouver", "canada", "mexico",
  // Europe
  "uk", "united kingdom", "london", "manchester", "birmingham",
  "germany", "berlin", "munich", "frankfurt", "hamburg",
  "france", "paris", "lyon",
  "switzerland", "zurich", "geneva", "basel",
  "netherlands", "amsterdam", "rotterdam",
  "spain", "madrid", "barcelona",
  "italy", "milan", "rome",
  "ireland", "dublin",
  "portugal", "lisbon",
  "sweden", "stockholm",
  "norway", "oslo",
  "denmark", "copenhagen",
  "finland", "helsinki",
  "austria", "vienna",
  "belgium", "brussels",
  "poland", "warsaw",
  "czech", "prague",
  "europe", "european",
  // Asia-Pacific (non-India)
  "singapore", "hong kong", "japan", "tokyo", "osaka",
  "china", "beijing", "shanghai", "shenzhen",
  "south korea", "seoul",
  "taiwan", "taipei",
  "thailand", "bangkok",
  "vietnam", "hanoi", "ho chi minh",
  "indonesia", "jakarta",
  "malaysia", "kuala lumpur",
  "philippines", "manila", "pasig", "makati", "quezon", "cebu", "antipolo",
  "australia", "sydney", "melbourne", "brisbane", "perth",
  "new zealand", "auckland", "wellington",
  // Middle East & Africa
  "dubai", "uae", "abu dhabi", "saudi arabia", "riyadh", "jeddah",
  "qatar", "doha", "bahrain", "kuwait", "oman",
  "israel", "tel aviv",
  "egypt", "cairo",
  "south africa", "johannesburg", "cape town",
  "nigeria", "lagos",
  "kenya", "nairobi",
  // Latin America
  "brazil", "sao paulo", "rio de janeiro",
  "argentina", "buenos aires",
  "chile", "santiago",
  "colombia", "bogota",
  // US States (abbreviated)
  ", ga", ", tx", ", ca", ", ny", ", fl", ", wa", ", ma", ", il",
  // Remote non-India patterns
  "remote (us)", "remote (uk)", "remote - us", "remote - uk",
  "remote usa", "remote europe", "us remote", "uk remote",
  // Country codes in location
  ", ph", ", sg", ", my", ", th", ", vn", ", id",
];

// Positive India indicators — jobs must have at least one of these to pass India filter
const INDIA_LOCATION_INDICATORS = [
  "india", "indian",
  // Major cities
  "mumbai", "delhi", "new delhi", "ncr", "bangalore", "bengaluru",
  "hyderabad", "chennai", "pune", "kolkata", "ahmedabad",
  "gurgaon", "gurugram", "noida", "greater noida", "ghaziabad",
  "lucknow", "jaipur", "chandigarh", "kochi", "thiruvananthapuram",
  "coimbatore", "mysore", "mysuru", "nagpur", "indore", "bhopal",
  "patna", "ranchi", "bhubaneswar", "visakhapatnam", "vizag",
  "vadodara", "surat", "rajkot", "nashik", "aurangabad",
  // State names
  "maharashtra", "karnataka", "telangana", "tamil nadu", "kerala",
  "west bengal", "gujarat", "rajasthan", "uttar pradesh", "madhya pradesh",
  // Indian job board indicators in URL
  "naukri.com", "iimjobs.com", "internshala.com", "instahyre.com",
  "hirist.com", "cutshort.io", "foundit.in",
];

const isJobListing = (
  r: OpportunityResult,
  jobType: string,
  experience: string
): boolean => {
  // Gate 0: basic URL presence
  if (!r.url || r.url.trim() === "") return false;

  // Gate 0b: reject closed/empty/error job indicators (snippet or title)
  const combinedForClosed = `${(r.title ?? "").toLowerCase()} ${(r.snippet ?? "").toLowerCase()}`;
  if (CLOSED_OR_EMPTY_JOB_PATTERNS.some((p) => combinedForClosed.includes(p))) {
    return false;
  }

  // Gate 0c: reject career landing/search pages (we want actual job links)
  if (CAREER_LANDING_PATTERNS.some((p) => combinedForClosed.includes(p))) {
    return false;
  }

  // Gate 0d: India-only — strict location enforcement
  const locationStr = (r.location ?? "").toLowerCase();
  const combinedForLocation = `${locationStr} ${(r.title ?? "").toLowerCase()} ${(r.snippet ?? "").toLowerCase()}`;
  const urlForLocation = (r.url ?? "").toLowerCase();
  
  // Step 1: Hard reject if clearly non-India
  if (NON_INDIA_LOCATION_STRINGS.some((s) => combinedForLocation.includes(s))) {
    return false;
  }
  
  // Step 2: Must have positive India indicator (location, content, or Indian job board URL)
  const hasIndiaIndicator = INDIA_LOCATION_INDICATORS.some((ind) =>
    combinedForLocation.includes(ind) || urlForLocation.includes(ind)
  );

  // Check if URL is from a trusted Indian job board
  const isFromIndianJobBoard = /naukri\.com|iimjobs\.com|internshala\.com|instahyre\.com|hirist\.com|cutshort\.io|foundit\.in|jobrapido\.com|freshersworld\.com|shine\.com|timesjobs\.com/i.test(urlForLocation);
  
  // Check if URL is from JSearch (already filtered for India)
  const isJSearchVerified = r.isVerified === true && r.bucket === "B";

  // If job has a location field but no India indicator, reject it
  // UNLESS it's from a trusted Indian source or JSearch-verified
  if (locationStr && !hasIndiaIndicator && !isFromIndianJobBoard && !isJSearchVerified) {
    return false;
  }
  
  // If snippet mentions a specific non-Indian city/country pattern, reject
  // even if it slipped past the blocklist
  const suspiciousLocationPattern = /(?:based in|located in|office in|position in|role in)\s+(?!india|mumbai|delhi|bangalore|bengaluru|hyderabad|chennai|pune|kolkata|gurgaon|gurugram|noida)/i;
  if (suspiciousLocationPattern.test(combinedForLocation)) {
    // Double-check it's not actually India
    if (!hasIndiaIndicator) {
      return false;
    }
  }

  // Gate 0e: IIM Jobs (and similar) category/aggregator snippets — keyword lists, not job descriptions
  const snippetForGate = (r.snippet ?? "").toLowerCase();
  const sourceLower = (r.source ?? "").toLowerCase();
  if (sourceLower.includes("iimjobs")) {
    const fragmentCount = (snippetForGate.match(/\s+jobs\s+/g) ?? []).length;
    const looksLikeCategoryPage =
      snippetForGate.includes("| iimjobs.com") ||
      fragmentCount >= 2 ||
      /\b(Finance|Corporate|Investment|Wealth|Marketing)\s+&\s+(Accounts|Banking|Research)\s+Jobs/i.test(snippetForGate);
    if (looksLikeCategoryPage) return false;
  }

  // Gate 1: credible source allowlist
  if (!isFromCredibleSource(r)) return false;

  // Gate 2: not a LinkedIn post (those go to Hiring Signals)
  if (isLinkedInPost(r)) return false;

  // Gate 2b: block LinkedIn aggregator pages
  // These are collection/search/company job tab pages that list
  // multiple jobs — not individual listings
  const urlLower = (r.url ?? "").toLowerCase();
  const LINKEDIN_AGGREGATOR_PATTERNS = [
    "linkedin.com/jobs/search",
    "linkedin.com/jobs/collections",
    "linkedin.com/company/",
    "/jobs?",
    "linkedin.com/pub/",
  ];
  if (LINKEDIN_AGGREGATOR_PATTERNS.some((p) => urlLower.includes(p))) {
    return false;
  }

  // Gate 2c: block any result whose title contains aggregator language
  const titleLowerForAgg = (r.title ?? "").toLowerCase();
  const AGGREGATOR_TITLE_PATTERNS = [
    " jobs in ",
    " openings in ",
    " vacancies in ",
    " positions in ",
    "jobs near",
    "search results",
    "job listings",
    "linkedin respects your privacy",
  ];
  if (AGGREGATOR_TITLE_PATTERNS.some((p) => titleLowerForAgg.includes(p))) {
    return false;
  }

  // Gate 2d: block results whose snippet contains LinkedIn
  // cookie/privacy boilerplate — these are page shells not job content
  const snippetLower = (r.snippet ?? "").toLowerCase();
  const BOILERPLATE_PATTERNS = [
    "linkedin respects your privacy",
    "essential and non-essential cookies",
    "3rd parties use essential",
    "sign in to view",
    "join to apply",
    "members who viewed",
  ];
  if (BOILERPLATE_PATTERNS.some((p) => snippetLower.includes(p))) {
    return false;
  }

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
  const normalizeProfileListText = (value: unknown): string => {
    const extractTokensFromString = (input: string): string[] => {
      let working = input.trim();
      if (!working) return [];

      // Unwrap repeated escaping layers (Supabase may show the value already double-escaped).
      for (let i = 0; i < 5; i += 1) {
        const prev = working;
        working = working
          // Turn sequences like \" into "
          .replace(/\\+"/g, '"')
          // Collapse double-slashes
          .replace(/\\\\/g, "\\")
          .trim();
        if (working === prev) break;
      }

      // If the entire payload is wrapped in quotes, strip one outer layer.
      if (working.length >= 2 && working.startsWith('"') && working.endsWith('"')) {
        working = working.slice(1, -1).trim();
      }

      for (let i = 0; i < 3; i += 1) {
        try {
          const parsed: unknown = JSON.parse(working);
          if (Array.isArray(parsed)) {
            const out: string[] = [];
            for (const item of parsed) {
              const tokens = extractTokensFromString(String(item));
              out.push(...tokens);
            }
            return out;
          }
          if (typeof parsed === "string") {
            working = parsed.trim();
            continue;
          }
        } catch {
          // Not JSON; fall through to extraction.
        }
        break;
      }

      // Unescape common layers (handles strings like: [\"Finance\",\"Investment Banking\"])
      working = working
        .replace(/\\+"/g, '"')
        .replace(/\\\\/g, "\\")
        .replace(/^[\[{]/, "")
        .replace(/[\]}]$/, "");

      // If heavily-escaped JSON exists inside, extract only quoted tokens.
      // Example input may contain many bracket/escape characters; we filter those out.
      const quoted = Array.from(working.matchAll(/"([^"]*?)"/g), (m) => m[1]);
      if (quoted.length > 0) {
        const cleaned = quoted
          .map((t) =>
            t.replace(/\\+/g, "")
              .replace(/[\[\]]/g, "")
              .trim()
          )
          .filter((t) => t.length > 1 && !/\\|\[|\]/.test(t));
        if (cleaned.length > 0) return cleaned;
      }

      // Fallback: split by comma/newline and strip surrounding punctuation.
      return working
        .split(/[,|\n]+/)
        .map((item) =>
          item
            .replace(/^[\s"'`[\]\\]+/, "")
            .replace(/[\s"'`[\]\\]+$/, "")
            .replace(/\\+/g, "")
            .replace(/[\[\]{}]/g, "")
            .trim()
        )
        .filter((t) => t.length > 0);
    };

    if (Array.isArray(value)) {
      const out: string[] = [];
      for (const item of value) {
        out.push(...extractTokensFromString(String(item)));
      }
      return out.join(", ");
    }

    if (typeof value !== "string") return "";
    return extractTokensFromString(value).join(", ");
  };

  const [flowStep, setFlowStep] = useState<FlowStep>("confirm_profile");
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
  const [radarLimit, setRadarLimit] = useState(15);
  const [radarReasonByUrl, setRadarReasonByUrl] = useState<Record<string, string>>(
    {}
  );
  const [loadingRadarReasonUrl, setLoadingRadarReasonUrl] = useState<string | null>(
    null
  );
  const radarReasonQueueRef = useRef<OpportunityResult[]>([]);

  const [benchmarkProfile, setBenchmarkProfile] = useState<{
    top_skills?: string | null;
    latest_company?: string | null;
    highest_degree?: string | null;
    target_industries?: string | null;
    experience_level?: string | null;
    commitment_type?: string | null;
    preferred_locations?: string | null;
    aspiration_notes?: string | null;
  } | null>(null);
  const [profileDraft, setProfileDraft] = useState<{
    top_skills: string;
    latest_company: string;
    highest_degree: string;
    target_industries: string;
    experience_level: string;
    commitment_type: string;
    preferred_locations: string;
    aspiration_notes: string;
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

  // Load core filters from user_profiles so we don't re-ask "What are you looking for?"
  useEffect(() => {
    const supabase = createSupabaseClient();
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("user_profiles")
          .select(
            "target_industries, commitment_type, experience_level, preferred_locations"
          )
        .eq("id", user.id)
          .maybeSingle();

        if (error || !data) return;

        const profile = data as any;
        const fromProfile: Partial<OpportunityFilters> = {};

        if (profile.target_industries) {
          fromProfile.industry = String(profile.target_industries);
        }

        const commitment: string = profile.commitment_type ?? "";
        if (commitment) {
          const c = commitment.toLowerCase();
          if (c.includes("intern")) fromProfile.jobType = "Internship";
          else if (c.includes("part")) fromProfile.jobType = "Part-time";
          else if (c.includes("full")) fromProfile.jobType = "Full-time";
        }

        const exp: string = profile.experience_level ?? "";
        if (exp) {
          const e = exp.toLowerCase();
          if (e.includes("entry")) fromProfile.experience = "Fresher";
          else if (e.includes("0-3")) fromProfile.experience = "0-1 years";
          else if (e.includes("3+")) fromProfile.experience = "2-5 years";
        }

        if (profile.preferred_locations) {
          if (Array.isArray(profile.preferred_locations)) {
            fromProfile.location = profile.preferred_locations.join(", ");
          } else {
            fromProfile.location = String(profile.preferred_locations);
          }
        }

        setFilters((prev) => {
          const next = { ...prev, ...fromProfile };
          saveFilters(next);
          return next;
        });
      } catch {
        // ignore; user can still run hunt with defaults
      }
    })();
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
          .select(
            "skills, internships, current_university, target_industries, experience_level, commitment_type, preferred_locations, aspiration_notes"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          setBenchmarkError(
            "We couldn't load your saved CV details. You can still run the hunt or update your profile."
          );
          setBenchmarkProfile(null);
        } else if (data) {
          const nextProfile = {
            top_skills: (data as any).skills ?? null,
            latest_company: (data as any).internships ?? null,
            highest_degree: (data as any).current_university ?? null,
            target_industries: (data as any).target_industries ?? null,
            experience_level: (data as any).experience_level ?? null,
            commitment_type: (data as any).commitment_type ?? null,
            preferred_locations: (data as any).preferred_locations ?? null,
            aspiration_notes: (data as any).aspiration_notes ?? null,
          };
          setBenchmarkProfile(nextProfile);
          setProfileDraft({
            top_skills: normalizeProfileListText(nextProfile.top_skills),
            latest_company: normalizeProfileListText(nextProfile.latest_company),
            highest_degree: String(nextProfile.highest_degree ?? ""),
            target_industries: normalizeProfileListText(nextProfile.target_industries),
            experience_level: String(nextProfile.experience_level ?? ""),
            commitment_type: String(nextProfile.commitment_type ?? ""),
            preferred_locations: normalizeProfileListText(nextProfile.preferred_locations),
            aspiration_notes: String(nextProfile.aspiration_notes ?? ""),
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
      const supabase = createSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in to run opportunities.");

      const effectiveIndustry =
        (profileDraft?.target_industries || filters.industry || "").trim();
      const effectiveLocation =
        (profileDraft?.preferred_locations || filters.location || "").trim();
      const effectiveExperience =
        (profileDraft?.experience_level || filters.experience || "").trim();
      const effectiveCommitment =
        (profileDraft?.commitment_type || filters.jobType || "").trim();

      const query = supabase
        .from("jobs_index")
        .select(
          "title, company, url, snippet, source, industry, experience_level, location, bucket, posted_at, is_active, function, employment_type"
        )
        .eq("is_active", true)
        .order("posted_at", { ascending: false })
        .limit(300);

      if (effectiveIndustry) query.ilike("industry", `%${effectiveIndustry}%`);
      if (effectiveLocation) query.ilike("location", `%${effectiveLocation}%`);
      if (effectiveExperience) {
        query.or(
          `experience_level.ilike.%${effectiveExperience}%,seniority.ilike.%${effectiveExperience}%`
        );
      }
      if (effectiveCommitment) {
        query.ilike("employment_type", `%${effectiveCommitment}%`);
      }

      const { data, error: jobsError } = await query;

      clearInterval(progressInterval);
      clearInterval(statusInterval);
      setLoadingProgress(100);

      if (jobsError) {
        setError(jobsError.message || "Hunt failed");
        setResults([]);
        setResultsByCompany({});
        return;
      }

      const mapped: OpportunityResult[] = ((data ?? []) as Record<string, unknown>[])
        .filter((row) => typeof row.url === "string" && String(row.url).trim().length > 0)
        .map((row, idx) => ({
          title: String(row.title ?? ""),
          company: (row.company as string | null) ?? null,
          url: String(row.url ?? ""),
          snippet: String(row.snippet ?? ""),
          source: String(row.source ?? "jobs_index"),
          bucket: ((row.bucket as OpportunityResult["bucket"]) ?? "B"),
          displayName: typeof row.company === "string" ? row.company : undefined,
          originalIndex: idx,
          isDirect: false,
          location: (row.location as string | null) ?? "India",
          posted_at: (row.posted_at as string | null) ?? null,
          industry: (row.industry as string | null) ?? null,
          experience_level: (row.experience_level as string | null) ?? null,
        }));

      setResults(mapped);
      setResultsByCompany({});
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
  }, [filters, profileDraft]);

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
    setFlowStep("confirm_profile");
    setResults([]);
    setResultsByCompany({});
    setMatchByUrl({});
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  // Serialize radar explanation requests (one at a time) to avoid Anthropic 429.
  // Must run before any early return so hook order is stable (React #310).
  useEffect(() => {
    if (loadingRadarReasonUrl != null) return;
    const list = radarReasonQueueRef.current;
    const next = list.find((r) => {
      const company = resolveCompany(r);
      if (!company || company.toLowerCase() === "unknown company") return false;
      if (radarReasonByUrl[r.url]) return false;
      return true;
    });
    if (next) {
      const company = resolveCompany(next)!;
      fetchRadarReason(next, company);
    }
  }, [loadingRadarReasonUrl, radarReasonByUrl, fetchRadarReason, results.length]);

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

  if (flowStep === "confirm_profile") {
    const bp = benchmarkProfile as any | null;
    const parseListValue = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        return value
          .map((item) => String(item).trim())
          .filter(Boolean);
      }

      if (typeof value !== "string") return [];
      let working = value.trim();
      if (!working) return [];

      for (let i = 0; i < 3; i += 1) {
        try {
          const parsed: unknown = JSON.parse(working);
          if (Array.isArray(parsed)) {
            return parsed
              .map((item) => String(item).trim())
              .filter(Boolean);
          }
          if (typeof parsed === "string") {
            working = parsed.trim();
            continue;
          }
        } catch {
          // Not valid JSON at this stage; continue with fallback parsing below.
        }
        break;
      }

      const unescaped = working
        .replace(/\\+"/g, '"')
        .replace(/\\\\/g, "\\")
        .replace(/^\[/, "")
        .replace(/\]$/, "");

      return unescaped
        .split(/[,|\n]+/)
        .map((item) =>
          item
            .replace(/^[\s"'`[\]\\]+/, "")
            .replace(/[\s"'`[\]\\]+$/, "")
            .trim()
        )
        .filter(Boolean);
    };

    const profileRows = [
      { key: "target_industries", label: "Target Industries" },
      { key: "experience_level", label: "Experience Level" },
      { key: "commitment_type", label: "Commitment Level" },
      { key: "preferred_locations", label: "Preferred Location" },
      { key: "aspiration_notes", label: "Aspiration Notes" },
      { key: "top_skills", label: "Skills" },
      { key: "latest_company", label: "Internships / Experience" },
      { key: "highest_degree", label: "Education" },
    ] as const;

    return (
      <div
        className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-4 py-12"
        style={{ backgroundColor: CREAM }}
      >
        <div className="w-full max-w-2xl space-y-6">
          <div className="rounded-2xl border border-white bg-white p-6 text-[#3C2A6A] shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#3C2A6A]/80">
                  Retrieve profile
                </p>
                <p className="mt-1 text-sm text-[#3C2A6A]/80">
                  Pull your onboarding profile and edit before matching.
                </p>
                </div>
                    <button
                      type="button"
                onClick={() => setFlowStep("confirm_profile")}
                className="rounded-full bg-[#3C2A6A] px-5 py-2 text-sm font-medium text-[#FDFBF1] hover:bg-[#4a347f]"
              >
                Retrieve profile
                    </button>
                </div>
            <h3 className="text-sm font-semibold text-[#3C2A6A]">Profile details</h3>
            <div className="mt-3 overflow-hidden rounded-xl border border-[rgba(60,42,106,0.12)] bg-[#fdfbf6]">
              <table className="w-full text-left text-sm">
                <tbody>
                  {profileRows.map(({ key, label }) => (
                    <tr
                      key={key}
                      className="border-b border-[rgba(60,42,106,0.08)] last:border-b-0"
                    >
                      <td className="w-1/3 px-3 py-2 font-medium text-[rgba(60,42,106,0.8)]">
                        {label}
                      </td>
                      <td className="px-3 py-2">
                <input
                          value={String(profileDraft?.[key] ?? "")}
                          onChange={(e) =>
                            setProfileDraft((prev) =>
                              prev ? { ...prev, [key]: e.target.value } : prev
                            )
                          }
                          className="w-full rounded border border-[rgba(60,42,106,0.2)] bg-white px-2 py-1 text-[#3C2A6A] focus:border-[#3C2A6A] focus:outline-none focus:ring-1 focus:ring-[#3C2A6A]/30"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-[#3C2A6A]/80">
              Identity confirmation
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {benchmarkLoading
                ? "Pulling your benchmarking attributes from your uploaded CV..."
                : "We use this profile table to suggest target opportunities from internal jobs data only (no live API calls)."}
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
                try {
                  const supabase = createSupabaseClient();
                  const {
                    data: { user },
                  } = await supabase.auth.getUser();
                  if (user && profileDraft) {
                    await supabase.from("user_profiles").upsert(
                      {
                        id: user.id,
                        user_id: user.id,
                        target_industries: profileDraft.target_industries || null,
                        experience_level: profileDraft.experience_level || null,
                        commitment_type: profileDraft.commitment_type || null,
                        preferred_locations: profileDraft.preferred_locations || null,
                        aspiration_notes: profileDraft.aspiration_notes || null,
                        skills: profileDraft.top_skills || null,
                        internships: profileDraft.latest_company || null,
                        current_university: profileDraft.highest_degree || null,
                      },
                      { onConflict: "id" }
                    );
                    setFilters((prev) => ({
                      ...prev,
                      industry: profileDraft.target_industries || prev.industry,
                      experience: profileDraft.experience_level || prev.experience,
                      jobType: profileDraft.commitment_type || prev.jobType,
                      location: profileDraft.preferred_locations || prev.location,
                    }));
                  }
                } catch {}
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
    // Only bucket C (LinkedIn posts from Exa)
    if (r.bucket !== "C") return false;

    const url = (r.url ?? "").toLowerCase();

    // Hard block any URL that is a formal job listing
    const JOB_URL_PATTERNS = [
      "/jobs/view/",
      "/jobs/detail/",
      "/jobs/collections/",
      "/job-apply/",
      "linkedin.com/jobs",
      "myworkdayjobs.com",
      "greenhouse.io",
      "lever.co",
      "ashbyhq.com",
      "smartrecruiters.com",
    ];
    if (JOB_URL_PATTERNS.some((p) => url.includes(p))) return false;

    // Must be an actual LinkedIn post URL
    const POST_URL_PATTERNS = ["/posts/", "/pulse/", "/feed/update/"];
    if (!POST_URL_PATTERNS.some((p) => url.includes(p))) return false;

    return true;
  });

  const onTheRadar = deduplicatedResults.filter((r) => {
    const isRadarSource =
      r.bucket === "E" ||
      isNewsArticle(r) ||
      (() => {
        try {
          const host = new URL(r.url).hostname
            .toLowerCase()
            .replace("www.", "");
          return JUNK_DOMAINS.some(
            (d) => host === d || host.endsWith("." + d)
          );
        } catch {
          return false;
        }
      })();

    if (!isRadarSource) return false;

    const company = resolveCompany(r);
    if (!company || company.toLowerCase() === "unknown company") {
      return false;
    }

    const combined = `${(r.title ?? "")} ${(r.snippet ?? "")}`.toLowerCase();
    const INDIA_TERMS = [
      "india",
      "indian",
      "mumbai",
      "delhi",
      "bangalore",
      "bengaluru",
      "hyderabad",
      "pune",
      "chennai",
      "gurgaon",
      "gurugram",
      "noida",
      "kolkata",
      "ahmedabad",
    ];
    const isIndiaRelevant = INDIA_TERMS.some((t) => combined.includes(t));
    if (!isIndiaRelevant) return false;

    const titleLower = (r.title ?? "").toLowerCase();
    const ARTICLE_TITLE_PATTERNS = [
      "how ",
      "why ",
      "what is",
      "the case for",
      "opinion:",
      "analysis:",
      "report:",
      "survey:",
      "study:",
      "deep dive",
      "explainer",
      "everything you need",
      "a guide to",
      "tokenized",
      "next-gen",
      "enables",
      "unlocks",
      "the future of",
      "is this the",
      "are you ready",
    ];
    if (ARTICLE_TITLE_PATTERNS.some((p) => titleLower.includes(p))) {
      return false;
    }

    return isPositiveSignal(r);
  });
  radarReasonQueueRef.current = onTheRadar;

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
                  const radarMeta = r as any;
                  const rawTitle = (r.title ?? "").trim();
                  
                  // For radar cards, show the actual news headline (truncated)
                  // The company is extracted from the title by the API
                  const headlineDisplay = rawTitle
                    .replace(/^unknown company:\s*/i, "")
                    .slice(0, 100)
                    .trim();
                  
                  // Company name for the badge and "People to Reach Out" button
                  const resolvedRadarCompany = (company || "").trim();

                  return (
                    <>
                      {/* Company badge at top */}
                      {resolvedRadarCompany && resolvedRadarCompany.toLowerCase() !== "unknown company" && (
                        <p className="text-sm font-bold text-[#3C2A6A] mb-1">
                          {resolvedRadarCompany}
                        </p>
                      )}
                      {radarMeta.signalLabel && (
                        <span className="mb-2 inline-block rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          {radarMeta.signalLabel}
                        </span>
                      )}
                      {/* Show the actual headline */}
                      <p className="text-sm text-slate-700 line-clamp-2">
                        {headlineDisplay || toReadableSnippet(r.snippet) || "Industry signal"}
                      </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {r.source}
                      {radarMeta.postedAgo && (
                        <span className="ml-2 text-slate-400">
                          {radarMeta.postedAgo}
                        </span>
                      )}
                    </p>
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
