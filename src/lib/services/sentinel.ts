import {
  buildQueryPlan,
  type UserFilters,
  type SerpQuery,
  type RawJobResult,
  type EnrichedJobResult as SerpEnrichedJobResult,
  deepFetchJob,
  deduplicateJobs,
} from "@/lib/serpQueryEngine";

/**
 * Sentinel: job hunting service.
 * Initially used Google dorks via SerpApi; now powered by TheirStack Jobs API.
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
      const brand = extractBrandFromUrl(url);
      return {
        title: r.title ?? "",
        url,
        snippet: r.snippet ?? "",
        source,
        company: brand ?? null,
      } as HuntResult;
    });
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
        const brand = extractBrandFromUrl(applyLink);
        return {
          title: job.title ?? "Job",
          url: applyLink,
          snippet: job.description ?? "",
          source: "Google Jobs",
          company: job.company_name?.trim() ?? brand ?? null,
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
  const apply_options = (entry.apply_options || [])
    .map((o: any) => (o?.link ? { link: String(o.link) } : null))
    .filter(Boolean) as { link: string }[];
  const company_name = entry.company_name || entry.company || "";
  const title = entry.title || "";
  if (!title || !company_name) return null;
  return {
    job_id: entry.job_id,
    title: String(title),
    company_name: String(company_name),
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
  const snippet = result.snippet || result.description || "";
  const brand = extractBrandFromUrl(link) ?? "";
  const company_name = brand || "";
  if (!title) return null;
  return {
    title: String(title),
    company_name: company_name || "Unknown Company",
    location: "",
    description: String(snippet || ""),
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

  const enrichedByBucket: SerpEnrichedJobResult[] = [];

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

  const deduped: SerpEnrichedJobResult[] = deduplicateJobs(enrichedByBucket);

  // Map EnrichedJobResult into the legacy HuntResult shape used by the rest of Sentinel.
  const huntResults: HuntResult[] = deduped.map((job) => {
    const applyUrl =
      job.applyUrl ||
      job.apply_options?.[0]?.link ||
      "";
    const brand = extractBrandFromUrl(applyUrl);
    const snippet =
      job.fullDescription?.slice(0, 1200) ||
      job.description?.slice(0, 400) ||
      "";
    const source = job.source || job.bucket;
    return {
      title: job.title || "Job",
      url: applyUrl || "",
      snippet,
      source: String(source),
      company: job.company_name?.trim() || brand || null,
    };
  }).filter((r) => r.url);

  return huntResults;
}
