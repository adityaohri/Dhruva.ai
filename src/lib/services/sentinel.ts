import {
  buildQueryPlan,
  type UserFilters,
  type SerpQuery,
  type RawJobResult,
  type EnrichedJobResult,
  deepFetchJob,
  deduplicateJobs,
} from "@/lib/serpQueryEngine";

/**
 * Sentinel: normalisation and job hunting service.
 * This file is responsible for turning raw SerpApi results into clean,
 * typed NormalisedJob objects and legacy HuntResults.
 */

export interface SentinelFilters {
  /** Mandatory */
  industry: string;
  jobType: string;
  experience: string;
  /** Optional */
  location?: string;
  pay?: string;
  companies?: string[];
  roles?: string[];
}

/**
 * Normalised representation of a job result coming from SerpApi,
 * suitable for storage, matching and display.
 */
export interface NormalisedJob {
  jobId: string;
  companyName: string;
  jobTitle: string;
  location: string;
  source: string;
  description: string;
  fullDescription?: string;
  salary?: string;
  postedAt?: string;
  scheduleType?: string;
  applyUrl: string;
  bucket: "A" | "B" | "C" | "D" | "E";
  isJunk: boolean;
  normalisedAt: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawData: any;
}

const INVALID_COMPANY_NAMES = new Set([
  "unknown company",
  "unknown",
  "n/a",
  "",
]);

function isGenericPlaceholder(str: string): boolean {
  const PLACEHOLDERS = [
    "unknown company",
    "unknown",
    "n/a",
    "na",
    "company",
    "jobs",
    "careers",
    "hiring",
    "role",
    "position",
  ];
  return PLACEHOLDERS.includes(str.toLowerCase().trim());
}

const ATS_DOMAINS = [
  "myworkdayjobs.com",
  "greenhouse.io",
  "lever.co",
  "smartrecruiters.com",
  "ashbyhq.com",
  "jobvite.com",
  "icims.com",
  "taleo.net",
  "successfactors.com",
];

const PLATFORM_NAMES = [
  "linkedin",
  "naukri",
  "indeed",
  "glassdoor",
  "monster",
  "shine",
  "foundit",
  "internshala",
  "iimjobs",
  "ziprecruiter",
  "company website",
  "direct",
];

const JUNK_TITLES = [
  "role",
  "job",
  "position",
  "vacancy",
  "opening",
  "hire these fine folks",
  "early",
  "students",
  "unknown",
];

const BPO_KEYWORDS = [
  "bpo",
  "voice process",
  "call centre",
  "call center",
  "night shift",
  "inbound calls",
  "outbound calls",
  "telecaller",
  "data entry operator",
  "back office executive",
  "domestic bpo",
];

const LOCATION_WORDS = [
  "bangalore",
  "mumbai",
  "delhi",
  "hyderabad",
  "pune",
  "chennai",
  "india",
  "remote",
  "hybrid",
];

const SENIORITY_WORDS = [
  "senior",
  "junior",
  "lead",
  "principal",
  "staff",
  "associate",
  "director",
  "manager",
  "head",
];

const TITLE_LOWERCASE_WORDS = new Set([
  "a",
  "an",
  "the",
  "of",
  "in",
  "at",
  "for",
  "on",
  "to",
  "with",
  "by",
]);

const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
  linkedin: "LinkedIn",
  naukri: "Naukri",
  indeed: "Indeed",
  glassdoor: "Glassdoor",
  monster: "Monster",
  foundit: "Foundit",
  shine: "Shine",
  internshala: "Internshala",
  iimjobs: "IIMJobs",
  "company website": "Direct",
  direct: "Direct",
  "bcg direct": "BCG Direct",
  ziprecruiter: "ZipRecruiter",
  jobs: "Direct",
  job: "Direct",
};

function toTitleCase(value: string): string {
  const words = value.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  return words
    .map((word, idx) => {
      if (idx > 0 && TITLE_LOWERCASE_WORDS.has(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function capitaliseWord(value: string): string {
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Best-effort extraction of company name from a raw Serp job object.
 */
function extractCompanyName(job: any): string {
  // Step 1 — job.company_name field
  const rawCompany =
    job?.company_name != null ? String(job.company_name).trim() : "";
  if (rawCompany && !isGenericPlaceholder(rawCompany)) {
    return rawCompany;
  }

  // Helper to get brand from host/path
  const fromApplyLink = (): string | null => {
    const link =
      job?.apply_options?.[0]?.link ??
      job?.apply_options?.[0]?.url ??
      job?.url ??
      "";
    if (!link || typeof link !== "string") return null;
    try {
      const u = new URL(link);
      const host = u.hostname.toLowerCase();
      const pathname = u.pathname || "";
      const atsDomain = ATS_DOMAINS.find((d) => host.includes(d));

      const normaliseBrand = (slug: string): string | null => {
        const clean = slug.replace(/[_-]+/g, " ").trim();
        if (!clean) return null;
        return toTitleCase(clean);
      };

      if (atsDomain) {
        // For ATS domains: PATHNAME first, then SUBDOMAIN.
        const pathSeg = pathname.replace(/^\/+/, "").split("/")[0] || "";
        if (pathSeg) {
          const brand = normaliseBrand(pathSeg);
          if (brand && !isGenericPlaceholder(brand)) return brand;
        }
        // Subdomain-based brand
        const hostParts = host.split(".");
        const sub = hostParts[0] || "";
        if (atsDomain.includes("myworkdayjobs.com")) {
          let name = sub.replace(/^wd\d*$/i, "").trim();
          if (!name && hostParts.length > 2) {
            name = hostParts[hostParts.length - 3]; // e.g. kpmg from kpmg.wd3.myworkdayjobs.com
          }
          if (name) {
            const brand = normaliseBrand(name);
            if (brand && !isGenericPlaceholder(brand)) return brand;
          }
        } else if (sub && sub !== "www" && sub !== "boards") {
          const brand = normaliseBrand(sub);
          if (brand && !isGenericPlaceholder(brand)) return brand;
        }
      }

      // Standard domains: strip careers./jobs./www. and use root
      let rootHost = host.replace(/^(www\.|careers\.|jobs\.)/, "");
      const root = rootHost.split(".")[0] || "";
      if (root) {
        const brand = normaliseBrand(root);
        if (brand && !isGenericPlaceholder(brand)) return brand;
      }
    } catch {
      // ignore URL parse errors
    }
    return null;
  };

  const fromLink = fromApplyLink();
  if (fromLink) return fromLink;

  // NEW Step 2a — parse @ symbol from title
  if (job?.title) {
    const titleStr = String(job.title);
    const atSymbolMatch = titleStr.match(/\s@\s(.+)$/);
    if (atSymbolMatch && atSymbolMatch[1]) {
      const candidate = atSymbolMatch[1].trim();
      if (candidate && !isGenericPlaceholder(candidate)) {
        return candidate;
      }
    }
  }

  // NEW Step 2b — parse "Unknown Company: X" pattern from title
  if (job?.title) {
    const titleStr = String(job.title);
    const colonMatch = titleStr.match(/^unknown company:\s*(.+)$/i);
    if (colonMatch && colonMatch[1]) {
      const candidate = colonMatch[1].trim();
      const JOB_TITLE_WORDS = [
        "engineer",
        "analyst",
        "manager",
        "developer",
        "designer",
        "consultant",
        "associate",
        "director",
        "specialist",
        "officer",
        "executive",
        "lead",
        "head",
        "intern",
        "architect",
        "scientist",
        "apprentice",
        "trainee",
        "graduate",
      ];
      const lowerCandidate = candidate.toLowerCase();
      const looksLikeJobTitle = JOB_TITLE_WORDS.some((w) =>
        lowerCandidate.includes(w)
      );

      // Naukri-style pattern: "Role - Location - Company - Experience"
      const parts = candidate
        .split("-")
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length > 1) {
        const experienceRe =
          /(year|yrs|experience|vacanc|0\s*to|\d+\s*(to|-)\s*\d+)/i;
        for (let i = parts.length - 1; i >= 0; i--) {
          const part = parts[i];
          const lp = part.toLowerCase();
          if (!part) continue;
          if (isGenericPlaceholder(part)) continue;
          if (LOCATION_WORDS.includes(lp)) continue;
          if (experienceRe.test(lp)) continue;
          if (JOB_TITLE_WORDS.some((w) => lp.includes(w))) continue;
          return part;
        }
      }

      // Simple "Unknown Company: Ema" pattern
      if (!looksLikeJobTitle && candidate.length < 40) {
        if (!isGenericPlaceholder(candidate)) {
          return candidate;
        }
      }
    }
  }

  // NEW Step 2c — parse "in India - CompanyName" pattern
  if (job?.title) {
    const titleStr = String(job.title);
    const inIndiaMatch = titleStr.match(/in india\s*-\s*.+?-\s*(.+)$/i);
    if (inIndiaMatch && inIndiaMatch[1]) {
      const candidate = inIndiaMatch[1].trim();
      if (candidate.length > 1 && !isGenericPlaceholder(candidate)) {
        return candidate;
      }
    }
  }

  // Step 3 — Parse from job.title using " at "
  if (job?.title) {
    const title = String(job.title);
    const m = title.match(/ at (.+)$/i);
    if (m && m[1]) {
      const company = m[1].trim();
      if (company && !isGenericPlaceholder(company)) return company;
    }
  }

  // Step 4 — Parse from job.via
  if (job?.via) {
    let via = String(job.via).trim();
    via = via.replace(/^via\s+/i, "").trim();
    const lower = via.toLowerCase();
    if (via && !PLATFORM_NAMES.includes(lower) && !isGenericPlaceholder(via)) {
      return via;
    }
  }

  // Step 5 — Absolute fallback
  return "Company";
}

/**
 * Extract and normalise job title from a raw Serp job.
 */
function extractJobTitle(job: any): string {
  let title = (job?.title ? String(job.title) : "").trim();

  // Step 1: Remove "Unknown Company: " prefix
  title = title.replace(/^unknown company:\s*/i, "");

  // Step 1b: Remove " @ CompanyName" suffix
  title = title.replace(/\s@\s.+$/, "").trim();

  // Step 1c: Remove " - India @ CompanyName" suffix (handles residual patterns)
  title = title.replace(/\s-\s*india\s@\s.+$/i, "").trim();

  // Step 1d: Remove "(India)" location qualifier
  title = title.replace(/\s*\(india\)\s*/i, " ").trim();

  // Step 2: Remove " at [Company]" suffix
  title = title.replace(/ at .+$/i, "");

  // Step 3: Remove " in India[anything]" suffix
  title = title.replace(/ in india.*/i, "");

  // Step 4: Remove " - [Company]" suffix where [Company] is not a location/seniority word
  const stripDashSuffix = (value: string, dashChar: string): string => {
    const re = new RegExp(`\\s${dashChar}\\s(.+)$`);
    const m = value.match(re);
    if (!m || !m[1]) return value;
    const tail = m[1].trim();
    if (!tail) return value;
    const firstWord = tail.split(/\s+/)[0].toLowerCase();
    if (
      LOCATION_WORDS.includes(firstWord) ||
      SENIORITY_WORDS.includes(firstWord)
    ) {
      return value;
    }
    const idx = m.index ?? value.lastIndexOf(` ${dashChar} `);
    if (idx >= 0) {
      return value.slice(0, idx).trim();
    }
    return value;
  };

  title = stripDashSuffix(title, "-");
  // Step 5: Remove " – [anything]" (em dash variant)
  title = stripDashSuffix(title, "–");

  // Step 6: Apply title case
  title = toTitleCase(title);

  // Step 7: Trim whitespace
  title = title.trim();

  // Step 8: Quality check
  const lower = title.toLowerCase();
  if (!title || title.length < 3 || JUNK_TITLES.includes(lower)) {
    return "Open Position";
  }
  return title;
}

/**
 * Extract human-readable source from a raw Serp job.
 */
function extractSource(job: any): string {
  if (!job?.via) return "Direct";
  let via = String(job.via).trim();
  via = via.replace(/^via\s+/i, "").trim();
  const lower = via.toLowerCase();
  if (!lower) return "Direct";
  const mapped = PLATFORM_DISPLAY_NAMES[lower];
  if (mapped) return mapped;
  return capitaliseWord(via);
}

function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    // eslint-disable-next-line no-bitwise
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  // eslint-disable-next-line no-bitwise
  return (hash >>> 0).toString(36);
}

/**
 * Generate a stable job identifier from raw Serp job data.
 */
function generateJobId(job: any): string {
  const rawId =
    job?.job_id != null ? String(job.job_id).trim() : "";
  if (rawId) return rawId;
  const key = (
    `${job?.title ?? ""}__${job?.company_name ?? ""}__${job?.location ?? ""}`
  )
    .toLowerCase()
    .trim();
  return djb2Hash(key);
}

/**
 * Heuristic classifier to mark junk / irrelevant results.
 */
function isJunkResult(job: any, userRole: string): boolean {
  const title = (job?.title ? String(job.title) : "").trim();
  const lowerTitle = title.toLowerCase();

  // Condition 1 — Junk title
  if (!title || title.length < 3 || JUNK_TITLES.includes(lowerTitle)) {
    return true;
  }

  // Condition 2 — BPO / Call Centre keywords
  const desc = (job?.description ? String(job.description) : "").toLowerCase();
  const combined = `${lowerTitle} ${desc}`;
  if (BPO_KEYWORDS.some((kw) => combined.includes(kw))) {
    return true;
  }

  // Condition 3 — Company still unknown
  const companyName = extractCompanyName(job);
  if (companyName === "Company") {
    return true;
  }

  // Condition 4 — Extremely low salary
  const salaryRaw =
    job?.detected_extensions?.salary != null
      ? String(job.detected_extensions.salary)
      : "";
  if (salaryRaw) {
    const salaryStr = salaryRaw.toLowerCase();
    const cleaned = salaryStr.replace(/[₹,]/g, " ");
    const nums = cleaned.match(/\d+/g);
    if (nums && nums.length > 0) {
      const numeric = nums.map((n) => Number(n)).filter((n) => !isNaN(n));
      if (numeric.length > 0) {
        const max = Math.max(...numeric);
        let rupees = max;
        if (salaryStr.includes("lpa") || salaryStr.includes("lakh")) {
          rupees = max * 100_000;
        } else if (salaryStr.includes("month")) {
          rupees = max * 12;
        }
        if (rupees < 150_000) {
          return true;
        }
      }
    }
  }

  // Condition 5 — Zero semantic overlap with userRole
  // Only apply if description is long enough to be meaningful
  const roleTokens = String(userRole || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length > 3);
  if (roleTokens.length > 0 && desc.length > 80) {
    const titleText = lowerTitle;
    const descText = desc.slice(0, 500);
    const overlap = roleTokens.some(
      (tok) => titleText.includes(tok) || descText.includes(tok)
    );
    // Only discard if NONE of the tokens appear AND title looks completely unrelated
    // Do not discard if title contains any word longer than 4 chars from the description
    if (!overlap) {
      const descWords = descText
        .split(/\s+/)
        .map((w) => w.toLowerCase())
        .filter((w) => w.length > 4);
      const titleWords = lowerTitle
        .split(/\s+/)
        .filter((w) => w.length > 4);
      const crossOverlap = titleWords.some((w) => descWords.includes(w));
      if (!crossOverlap) return true;
    }
  }

  return false;
}

// Legacy type kept for backwards‑compatibility with older test routes.
export interface DorkQuery {
  type: "ats" | "direct_company" | "indian_portal" | "linkedin";
  query: string;
}

/** Map company names to known career site domains (lowercase). */
const COMPANY_CAREER_SITES: Record<string, string> = {
  mckinsey: "jobs.mckinsey.com",
  "mckinsey & company": "jobs.mckinsey.com",
  apple: "careers.apple.com",
  google: "careers.google.com",
  microsoft: "careers.microsoft.com",
  amazon: "amazon.jobs",
  meta: "www.metacareers.com",
  bain: "www.bain.com/careers",
  bcg: "careers.bcg.com",
  deloitte: "jobs2.deloitte.com",
  kpmg: "kpmg.com/careers",
  ey: "careers.ey.com",
};

function toCareerSiteDomain(company: string): string {
  const key = company.toLowerCase().trim();
  return COMPANY_CAREER_SITES[key] ?? `careers.${key.replace(/\s+/g, "")}.com`;
}

/**
 * Build the [roles] segment from filters (roles array or jobType).
 */
function rolesSegment(filters: SentinelFilters): string {
  const parts = filters.roles?.length
    ? filters.roles
    : [filters.jobType].filter(Boolean);
  return parts.join(" ").trim() || "jobs";
}

/**
 * Build the [experience] segment (e.g. "2 years", "entry level").
 */
function experienceSegment(filters: SentinelFilters): string {
  return (filters.experience || "").trim() || "0-2 years";
}

/**
 * Recursive Meta-Search: for Consulting in India, returns exactly 5 dork patterns
 * run in parallel. For other industries, returns the standard ATS + tier-one set.
 */
const META_SEARCH_CONSULTING_INDIA: DorkQuery[] = [
  { type: "ats", query: 'site:boards.greenhouse.io "Consulting" India' },
  { type: "ats", query: 'site:lever.co "Consulting" India' },
  { type: "ats", query: 'site:myworkdayjobs.com "Consulting" India' },
  {
    type: "linkedin",
    query: 'intitle:"Internship" "Consulting" "India"',
  },
  {
    type: "ats",
    query:
      '(site:boards.greenhouse.io OR site:lever.co OR site:myworkdayjobs.com) "Consulting" India',
  },
];

/**
 * Generates targeted dork queries. For Consulting, uses the 5-pattern Recursive Meta-Search;
 * otherwise ATS + tier-one career sites.
 */
export function generateDorkQueries(filters: SentinelFilters): DorkQuery[] {
  const roles = rolesSegment(filters);
  const roleSegment = roles || filters.jobType || "jobs";
  const industry = (filters.industry || "").toLowerCase();

  if (industry.includes("consulting")) {
    return [...META_SEARCH_CONSULTING_INDIA];
  }

  const queries: DorkQuery[] = [];
  queries.push({
    type: "ats",
    query:
      `(site:boards.greenhouse.io OR site:lever.co OR site:myworkdayjobs.com) ` +
      `${(filters.location || "India").trim() || "India"} "${roleSegment}"`.trim(),
  });
  const tierOneSites = ["site:jobs.mckinsey.com", "site:careers.google.com"].join(
    " OR "
  );
  queries.push({
    type: "direct_company",
    query: `(${tierOneSites}) ${roleSegment}`.trim(),
  });
  return queries;
}

/**
 * Social Signal patterns (LinkedIn posts) for live hiring intent and referrals.
 * These run alongside direct-to-source checks in the Sentinel route.
 */
export function generateSocialSignalQueries(
  filters: SentinelFilters
): DorkQuery[] {
  const role = rolesSegment(filters) || filters.jobType || "role";
  const location = (filters.location || "India").trim() || "India";

  return [
    {
      type: "linkedin",
      query: `"hiring" "${role}" "${location}" site:linkedin.com/posts after:2026-02-01`,
    },
    {
      type: "linkedin",
      query: `"we are looking for" "${role}" "${location}" site:linkedin.com`,
    },
    {
      type: "linkedin",
      query: `"referral" "open roles" "${location}" site:linkedin.com`,
    },
  ];
}

export interface HuntResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  /** Set when source provides it (e.g. Google Jobs). */
  company?: string | null;
  /**
   * Origin bucket from the Serp Query Engine, when available:
   * A = Elite Core, B = ATS Deep-Web, C = Hidden Market,
   * D = Mass Aggregators, E = Signal Intelligence.
   */
  bucket?: "A" | "B" | "C" | "D" | "E";
}

/** Domains considered "direct" (ATS or company career site) for isDirect tagging. */
const DIRECT_DOMAIN_PATTERNS = [
  "greenhouse.io",
  "lever.co",
  "workdayjobs.com",
  "myworkdayjobs.com",
  "jobs.mckinsey.com",
  "careers.apple.com",
  "careers.google.com",
  "careers.microsoft.com",
  "amazon.jobs",
  "metacareers.com",
  "bain.com",
  "careers.bcg.com",
  "deloitte.com",
  "kpmg.com",
  "ey.com",
];

/**
 * True if the URL is an ATS (greenhouse, lever, workday) or known company career domain.
 */
export function isDirectUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return DIRECT_DOMAIN_PATTERNS.some((d) => host === d || host.endsWith("." + d));
  } catch {
    return false;
  }
}

/**
 * Attempt to infer the hiring brand from the URL, especially for ATS domains.
 *
 * Example:
 *   https://kpmgindia.wd3.myworkdayjobs.com/ -> "KPMG India"
 */
export function extractBrandFromUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();

    // Direct career sites where the brand is in the domain.
    if (host.includes("careers.google.com")) return "Google";
    if (host.includes("careers.apple.com")) return "Apple";
    if (host.includes("jobs.mckinsey.com")) return "McKinsey & Company";

    if (host.includes("myworkdayjobs.com")) {
      const sub = host.split(".")[0]; // e.g. "kpmgindia" or "kpmg"
      let name = sub.replace(/^wd\d*/i, "").trim();
      if (!name) return null;

      // Special-case common patterns
      if (/^kpmgindia$/i.test(name)) {
        return "KPMG India";
      }

      // Insert space before "india" for "...india" style subdomains.
      name = name.replace(/india$/i, " india");

      return name
        .split(/[_\s-]+/)
        .filter(Boolean)
        .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
        .join(" ");
    }

    // Generic heuristic for greenhouse/lever: use subdomain as brand.
    if (host.endsWith("greenhouse.io") || host.endsWith("lever.co")) {
      const sub = host.split(".")[0];
      if (!sub) return null;
      return sub
        .split(/[_\s-]+/)
        .filter(Boolean)
        .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
        .join(" ");
    }

    return null;
  } catch {
    return null;
  }
}

const SERPAPI_BASE = "https://serpapi.com/search";

// ─────────────────────────────────────────────────────────────────────────────
// Legacy Google web search helpers (kept for backwards compatibility)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchOneQuery(
  q: string,
  apiKey: string,
  gl: string
): Promise<HuntResult[]> {
  const params = new URLSearchParams({
    engine: "google",
    q,
    api_key: apiKey,
    gl,
    // Ask SerpApi for the maximum volume to capture as many listings as possible.
    num: "100",
  });
  const url = `${SERPAPI_BASE}?${params.toString()}`;
  const resp = await fetch(url, { cache: "no-store" });
  if (!resp.ok) {
    console.warn(
      `[sentinel] SerpApi error for query "${q.slice(0, 50)}...": ${resp.status}`
    );
    return [];
  }
  const data = (await resp.json()) as {
    organic_results?: Array<{
      title?: string;
      link?: string;
      snippet?: string;
    }>;
  };
  const results = data.organic_results ?? [];
  const source = q.length > 60 ? q.slice(0, 57) + "..." : q;
  return results
    .filter((r) => r.link)
    .map((r) => {
      const url = r.link!;
      const rawJob = {
        title: r.title ?? "",
        company_name: "Unknown Company",
        location: "",
        description: r.snippet ?? "",
        apply_options: [{ link: url }],
        detected_extensions: {},
        via: undefined,
      };
      const normalised = normaliseJob(rawJob, "D", q.slice(0, 50));
      return {
        title: normalised.jobTitle,
        url,
        snippet: normalised.description,
        source,
        company: normalised.companyName,
      } as HuntResult;
    });
}

/**
 * Normalise a single raw Serp job into a NormalisedJob instance.
 *
 * @param raw - Raw SerpApi job object.
 * @param bucket - Origin bucket (A–E) from the Serp Query Engine.
 * @param userRole - Target user role, used for light relevance filtering.
 * @returns NormalisedJob instance.
 */
export function normaliseJob(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any,
  bucket: "A" | "B" | "C" | "D" | "E",
  userRole: string
): NormalisedJob {
  const companyName = extractCompanyName(raw);
  const jobTitle = extractJobTitle(raw);
  const source = extractSource(raw);
  const jobId = generateJobId(raw);
  const isJunk = isJunkResult(raw, userRole);

  const location =
    raw?.location != null ? String(raw.location).trim() : "India";
  const description =
    raw?.description != null
      ? String(raw.description).trim().slice(0, 500)
      : "";

  const salary =
    raw?.detected_extensions?.salary != null
      ? String(raw.detected_extensions.salary)
      : undefined;
  const postedAt =
    raw?.detected_extensions?.posted_at != null
      ? String(raw.detected_extensions.posted_at)
      : undefined;
  const scheduleType =
    raw?.detected_extensions?.schedule_type != null
      ? String(raw.detected_extensions.schedule_type)
      : undefined;

  const applyUrl =
    raw?.apply_options?.[0]?.link != null
      ? String(raw.apply_options[0].link)
      : "";

  return {
    jobId,
    companyName,
    jobTitle,
    location,
    source,
    description,
    fullDescription: undefined,
    salary,
    postedAt,
    scheduleType,
    applyUrl,
    bucket,
    isJunk,
    normalisedAt: new Date().toISOString(),
    rawData: raw,
  };
}

/**
 * Normalise an array of raw Serp jobs for a given bucket and user role.
 *
 * @param raws - Raw SerpApi job array.
 * @param bucket - Origin bucket (A–E) from the Serp Query Engine.
 * @param userRole - Target user role, used for light relevance filtering.
 * @returns Array of NormalisedJob instances.
 */
export function normaliseBatch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raws: any[],
  bucket: "A" | "B" | "C" | "D" | "E",
  userRole: string
): NormalisedJob[] {
  if (!Array.isArray(raws)) return [];
  return raws
    .filter((raw) => raw && typeof raw === "object")
    .map((raw) => normaliseJob(raw, bucket, userRole));
}

/**
 * Deduplicate an array of NormalisedJob entries by title+company,
 * preferring richer descriptions and higher-signal buckets.
 *
 * @param jobs - Array of NormalisedJob entries.
 * @returns Deduplicated NormalisedJob array.
 */
export function deduplicateNormalisedJobs(
  jobs: NormalisedJob[]
): NormalisedJob[] {
  const seen = new Map<string, NormalisedJob>();
  const bucketRank: Record<NormalisedJob["bucket"], number> = {
    A: 1,
    B: 2,
    C: 3,
    D: 4,
    E: 5,
  };

  for (const job of jobs) {
    const key = `${job.jobTitle.toLowerCase()}__${job.companyName.toLowerCase()}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, job);
      continue;
    }
    const existingScore =
      existing.description.length - bucketRank[existing.bucket];
    const newScore = job.description.length - bucketRank[job.bucket];
    if (newScore > existingScore) {
      seen.set(key, job);
    }
  }
  return Array.from(seen.values());
}

/** Normalize URL for deduplication: strip fragment and trailing slash, lowercase. */
function normalizeUrlForDedupe(url: string): string {
  try {
    const u = url.trim();
    const hash = u.indexOf("#");
    const withoutHash = hash >= 0 ? u.slice(0, hash) : u;
    return withoutHash.replace(/\/+$/, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/** Merge multiple hunt result arrays and remove duplicates by URL (first occurrence wins). */
function mergeAndDedupeByUrl(arrays: HuntResult[][]): HuntResult[] {
  const seen = new Set<string>();
  const out: HuntResult[] = [];
  for (const arr of arrays) {
    for (const r of arr) {
      const key = normalizeUrlForDedupe(r.url);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
    }
  }
  return out;
}

/**
 * Execute dork hunt via SerpApi Google Search (queries run in parallel).
 * Merges results from all calls and removes duplicate URLs. Returns merged list.
 */
export async function executeHunt(
  queries: string[],
  options?: { apiKey?: string; gl?: string }
): Promise<HuntResult[]> {
  const apiKey = options?.apiKey ?? process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    throw new Error("SERPAPI_API_KEY is not set.");
  }
  const gl = options?.gl ?? "in";

  const batches = queries.map((q) => fetchOneQuery(q, apiKey, gl));
  const arrays = await Promise.all(batches);
  return mergeAndDedupeByUrl(arrays);
}

/** Google Jobs API response job entry. */
interface GoogleJobEntry {
  title?: string;
  company_name?: string;
  description?: string;
  apply_options?: Array<{ link?: string }>;
  related_links?: Array<{ link?: string }>;
}

/**
 * Fetch individual job listings from SerpApi Google Jobs (one layer deeper than aggregate pages).
 * Returns results with company_name so we can suggest company-wise.
 */
export async function fetchGoogleJobs(
  filters: SentinelFilters,
  options?: { apiKey?: string; gl?: string }
): Promise<HuntResult[]> {
  const apiKey = options?.apiKey ?? process.env.SERPAPI_API_KEY;
  if (!apiKey) return [];
  const gl = options?.gl ?? "in";
  const location = (filters.location || "India").trim();
  const roles = rolesSegment(filters);
  const experience = experienceSegment(filters);
  const q = `${roles} ${filters.industry || ""} ${experience} ${location}`.trim();
  const params = new URLSearchParams({
    engine: "google_jobs",
    q,
    api_key: apiKey,
    gl,
    location: location || "India",
  });
  const url = `${SERPAPI_BASE}?${params.toString()}`;
  try {
    const resp = await fetch(url, { cache: "no-store" });
    if (!resp.ok) return [];
    const data = (await resp.json()) as { jobs_results?: GoogleJobEntry[] };
    const jobs = data.jobs_results ?? [];
    return jobs
      .map((job) => {
        // Prefer LinkedIn apply link when present so we surface LinkedIn job openings
        const options = job.apply_options ?? [];
        const linkedinOption = options.find((o) =>
          o.link?.toLowerCase().includes("linkedin.com")
        );
        const applyLink =
          linkedinOption?.link ??
          options[0]?.link ??
          job.related_links?.[0]?.link;
        if (!applyLink) return null;
        // Run through normalisation so extractCompanyName fires
        const rawJob = {
          title: job.title ?? "",
          company_name: job.company_name ?? "Unknown Company",
          location: "",
          description: job.description ?? "",
          apply_options: applyLink ? [{ link: applyLink }] : [],
          detected_extensions: {},
          via: undefined,
        };
        const normalised = normaliseJob(rawJob, "D", rolesSegment(filters));
        return {
          title: normalised.jobTitle,
          url: applyLink,
          snippet: normalised.description,
          source: "Google Jobs",
          company: normalised.companyName,
        } as HuntResult;
      })
      .filter((r): r is HuntResult => r != null);
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// New Serp Query Engine integration
// ─────────────────────────────────────────────────────────────────────────────

const INDUSTRY_MAP: Record<string, "Consulting" | "Technology" | "Finance" | "Marketing" | "Operations" | "Product" | "Data & Analytics" | "Other"> =
  {
    Consulting: "Consulting",
    Technology: "Technology",
    Finance: "Finance",
    Marketing: "Marketing",
    Operations: "Operations",
    Product: "Product",
    "Data & Analytics": "Data & Analytics",
    Other: "Other",
  };

const JOB_TYPE_MAP: Record<string, "Internship" | "Full-time" | "Part-time" | "Contract" | "Freelance"> = {
  Internship: "Internship",
  "Full-time": "Full-time",
  "Part-time": "Part-time",
  Contract: "Contract",
  Freelance: "Freelance",
};

const EXPERIENCE_MAP_SENTINEL: Record<string, "Fresher" | "0-1 years" | "1-2 years" | "2-5 years" | "5+ years"> = {
  Fresher: "Fresher",
  "0-1 years": "0-1 years",
  "1-2 years": "1-2 years",
  "2-5 years": "2-5 years",
  "5+ years": "5+ years",
};

function mapToUserFilters(filters: SentinelFilters): UserFilters {
  const role = rolesSegment(filters) || filters.jobType || "Role";
  const industryKey = INDUSTRY_MAP[filters.industry] ?? "Other";
  const jobTypeKey = JOB_TYPE_MAP[filters.jobType] as
    | "Internship"
    | "Full-time"
    | "Part-time"
    | "Contract"
    | "Freelance"
    | undefined;
  const experienceKey =
    EXPERIENCE_MAP_SENTINEL[filters.experience] ?? "0-1 years";
  const location = (filters.location || "India").trim() || "India";
  const remoteOk = /remote/i.test(location);

  return {
    role,
    industries: [industryKey],
    jobTypes: jobTypeKey ? [jobTypeKey] : [],
    experience: experienceKey,
    locations: [location],
    remoteOk,
  };
}

async function serpApiCall(params: Record<string, string | number | boolean>) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    throw new Error("SERPAPI_API_KEY is not set.");
  }
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, String(value));
  }
  searchParams.set("api_key", apiKey);
  const url = `${SERPAPI_BASE}?${searchParams.toString()}`;
  const resp = await fetch(url, { cache: "no-store" });
  if (!resp.ok) {
    throw new Error(`SerpApi error ${resp.status}`);
  }
  return resp.json();
}

function toRawJobFromGoogleJobs(entry: any): RawJobResult | null {
  const title = entry.title || "";
  if (!title) return null;

  const apply_options = (entry.apply_options || [])
    .map((o: any) => (o?.link ? { link: String(o.link) } : null))
    .filter(Boolean) as { link: string }[];

  return {
    job_id: entry.job_id,
    title: String(title),
    company_name: entry.company_name || entry.company || "Unknown Company",
    location: String(entry.location || ""),
    description: entry.description ? String(entry.description) : "",
    apply_options,
    detected_extensions: entry.detected_extensions ?? {},
    source: "google_jobs",
  };
}

function toRawJobFromGoogleWeb(result: any): RawJobResult | null {
  const link = result.link || result.url;
  if (!link) return null;

  const title = result.title || "";
  if (!title) return null;

  return {
    title: String(title),
    company_name: "Unknown Company",
    location: "",
    description: String(result.snippet || result.description || ""),
    apply_options: [{ link: String(link) }],
    detected_extensions: {},
    source: "google_web",
  };
}

/**
 * Execute Serp Query Engine buckets (A–D) in parallel and return unified HuntResults.
 */
export async function runSerpQueryEngine(
  filters: SentinelFilters
): Promise<HuntResult[]> {
  const userFilters = mapToUserFilters(filters);
  const plan = buildQueryPlan(userFilters);
  const queries = plan.queries.filter(
    (q) =>
      (q.bucket === "A" ||
        q.bucket === "B" ||
        q.bucket === "C" ||
        q.bucket === "D") &&
      (q.engine === "google_jobs" || q.engine === "google")
  );

  const enrichedByBucket: EnrichedJobResult[] = [];

  await Promise.all(
    queries.map(async (q: SerpQuery) => {
      try {
        const resp = await serpApiCall({
          engine: q.engine,
          ...q.params,
        });

        if (q.engine === "google_jobs") {
          const jobs = (resp?.jobs_results || []) as any[];
          const rawJobs: RawJobResult[] = jobs
            .map((entry) => toRawJobFromGoogleJobs(entry))
            .filter((j): j is RawJobResult => j != null);
          const enrichedJobs = await Promise.all(
            rawJobs.map((job) => deepFetchJob(job, q.bucket, serpApiCall))
          );
          enrichedByBucket.push(...enrichedJobs);
        } else if (q.engine === "google") {
          const results = (resp?.organic_results || []) as any[];
          const rawJobs: RawJobResult[] = results
            .map((r) => toRawJobFromGoogleWeb(r))
            .filter((j): j is RawJobResult => j != null);
          const enrichedJobs = await Promise.all(
            rawJobs.map((job) => deepFetchJob(job, q.bucket, serpApiCall))
          );
          enrichedByBucket.push(...enrichedJobs);
        }
      } catch (err) {
        console.warn(
          "[sentinel] Serp query failed for bucket",
          q.bucket,
          q.bucketLabel,
          err
        );
      }
    })
  );

  const deduped: EnrichedJobResult[] = deduplicateJobs(enrichedByBucket);

  // Map EnrichedJobResult into the legacy HuntResult shape used by the rest of Sentinel.
  const huntResults: HuntResult[] = deduped
    .map((job) => {
      const normalised = normaliseJob(
        job,
        job.bucket,
        userFilters.role
      );
      const applyUrl =
        job.applyUrl ||
        job.apply_options?.[0]?.link ||
        "";
      const snippet =
        normalised.fullDescription?.slice(0, 1200) ||
        normalised.description;
      return {
        title: normalised.jobTitle,
        url: applyUrl,
        snippet,
        source: normalised.source,
        company: normalised.companyName,
        bucket: job.bucket,
      };
    })
    .filter((r) => r.url);

  return huntResults;
}
