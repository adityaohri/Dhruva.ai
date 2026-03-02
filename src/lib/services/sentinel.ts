/**
 * Sentinel: turns user variables into Google Search dorks for job hunting.
 * Day 1 – Opportunity Intelligence.
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
 * Generates three (or more) specific dork query strings for job hunting.
 */
export function generateDorkQueries(filters: SentinelFilters): DorkQuery[] {
  const roles = rolesSegment(filters);
  const experience = experienceSegment(filters);
  const location = (filters.location || "India").trim();
  const queries: DorkQuery[] = [];

  // 1. ATS Query
  queries.push({
    type: "ats",
    query: `(site:boards.greenhouse.io OR site:lever.co OR site:myworkdayjobs.com) ${location} intext:'apply' ${roles} ${experience}`.trim(),
  });

  // 2. Direct Company Query (only if companies provided)
  if (filters.companies?.length) {
    const sites = filters.companies
      .map((c) => toCareerSiteDomain(c))
      .filter(Boolean);
    const siteClause = sites.map((s) => `site:${s}`).join(" OR ");
    queries.push({
      type: "direct_company",
      query: `(${siteClause}) ${roles}`.trim(),
    });
  }

  // 3. Indian Portal Query
  queries.push({
    type: "indian_portal",
    query: `site:naukri.com/job-listings ${roles} -inurl:login`.trim(),
  });

  // 4. LinkedIn jobs (broad)
  queries.push({
    type: "linkedin",
    query: `site:linkedin.com/jobs ${roles} ${filters.industry || ""} ${location}`.trim(),
  });

  // 5. LinkedIn individual job pages (forces Google to return /jobs/view/ links when possible)
  queries.push({
    type: "linkedin",
    query: `site:linkedin.com/jobs/view ${roles} ${filters.industry || ""} ${location}`.trim(),
  });

  return queries;
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

const SERPAPI_BASE = "https://serpapi.com/search";

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
    num: "10",
  });
  const url = `${SERPAPI_BASE}?${params.toString()}`;
  const resp = await fetch(url, { cache: "no-store" });
  if (!resp.ok) {
    console.warn(`[sentinel] SerpApi error for query "${q.slice(0, 50)}...": ${resp.status}`);
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
    .map((r) => ({
      title: r.title ?? "",
      url: r.link!,
      snippet: r.snippet ?? "",
      source,
    }));
}

/**
 * Execute dork hunt via SerpApi Google Search (queries run in parallel).
 * Returns a flat array of results: { title, url, snippet, source }.
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
  return arrays.flat();
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
    return jobs.map((job) => {
      // Prefer LinkedIn apply link when present so we surface LinkedIn job openings
      const options = job.apply_options ?? [];
      const linkedinOption = options.find((o) => o.link?.toLowerCase().includes("linkedin.com"));
      const applyLink =
        linkedinOption?.link ??
        options[0]?.link ??
        job.related_links?.[0]?.link;
      if (!applyLink) return null;
      return {
        title: job.title ?? "Job",
        url: applyLink,
        snippet: job.description ?? "",
        source: "Google Jobs",
        company: job.company_name?.trim() ?? null,
      } as HuntResult;
    }).filter((r): r is HuntResult => r != null);
  } catch {
    return [];
  }
}
