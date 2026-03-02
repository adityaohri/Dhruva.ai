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
 * Generates targeted dork queries for ATS and top‑tier career sites.
 *
 * 1) (site:boards.greenhouse.io OR site:lever.co OR site:myworkdayjobs.com) India [Job Role]
 * 2) (site:jobs.mckinsey.com OR site:careers.google.com) [Job Role]
 */
export function generateDorkQueries(filters: SentinelFilters): DorkQuery[] {
  const roles = rolesSegment(filters);
  const location = (filters.location || "India").trim() || "India";
  const roleSegment = roles || filters.jobType || "jobs";

  const queries: DorkQuery[] = [];

  // 1. ATS Query: Greenhouse, Lever, Workday – focused on India + role.
  queries.push({
    type: "ats",
    query:
      `(site:boards.greenhouse.io OR site:lever.co OR site:myworkdayjobs.com) ` +
      `${location} ${roleSegment}`.trim(),
  });

  // 2. Tier‑1 career sites (McKinsey, Google)
  const tierOneSites = ["site:jobs.mckinsey.com", "site:careers.google.com"].join(
    " OR "
  );
  queries.push({
    type: "direct_company",
    query: `(${tierOneSites}) ${roleSegment}`.trim(),
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
