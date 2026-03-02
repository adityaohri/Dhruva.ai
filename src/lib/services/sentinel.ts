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

// Legacy function kept so older test routes compile; no longer used by the
// main Opportunity Intelligence flow.
export function generateDorkQueries(_filters: SentinelFilters): DorkQuery[] {
  return [];
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

const THEIRSTACK_API_KEY = process.env.THEIRSTACK_API_KEY;
const THEIRSTACK_JOBS_ENDPOINT = "https://api.theirstack.com/v1/jobs/search";

function mapExperienceToTheirStack(experience: string): string | undefined {
  const e = experience.toLowerCase();
  if (e.includes("fresher") || e.includes("0-1") || e.includes("0-2") || e.includes("1-2")) {
    return "Entry Level";
  }
  if (e.includes("2-5") || e.includes("mid")) {
    return "Mid Level";
  }
  if (e.includes("5+") || e.includes("senior")) {
    return "Senior Level";
  }
  return undefined;
}

function buildJobTitlePattern(filters: SentinelFilters): string | undefined {
  const roles = filters.roles?.join(" ") ?? "";
  const jobType = filters.jobType ?? "";
  const pattern = `${roles} ${jobType}`.trim();
  return pattern || undefined;
}

/**
 * Primary job search implementation – calls TheirStack Jobs API.
 *
 * Maps our filters:
 * - industry     -> industries
 * - roles/jobType-> job_title_pattern
 * - experience   -> experience_level_filter
 * - location     -> job_country_code_or = ["IN"]
 * - companies    -> company_name_or
 */
export async function searchTheirStackJobs(
  filters: SentinelFilters,
  options?: { apiKey?: string; limit?: number; offset?: number }
): Promise<HuntResult[]> {
  const apiKey = options?.apiKey ?? THEIRSTACK_API_KEY;
  if (!apiKey) {
    throw new Error("THEIRSTACK_API_KEY is not set.");
  }

  const limit = options?.limit ?? 60;
  const offset = options?.offset ?? 0;

  const body: Record<string, unknown> = {
    offset,
    limit,
    // Required recency filter so the endpoint accepts the request.
    posted_at_max_age_days: 21,
    job_country_code_or: ["IN"], // primary location filter
  };

  if (filters.industry) {
    body.industries = [filters.industry];
  }

  const pattern = buildJobTitlePattern(filters);
  if (pattern) {
    body.job_title_pattern = pattern;
  }

  const level = mapExperienceToTheirStack(filters.experience);
  if (level) {
    body.experience_level_filter = level;
  }

  if (filters.companies?.length) {
    body.company_name_or = filters.companies;
  }

  const resp = await fetch(THEIRSTACK_JOBS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    console.warn(
      `[sentinel] TheirStack jobs error ${resp.status}${
        text ? `: ${text.slice(0, 300)}` : ""
      }`
    );
    return [];
  }

  const data = (await resp.json()) as any;
  const items: any[] =
    (Array.isArray(data) && data) ||
    data.jobs ||
    data.data ||
    data.results ||
    [];

  return items
    .map((job) => {
      const title =
        job.job_title ||
        job.title ||
        "";
      const url =
        job.url ||
        job.job_url ||
        job.job_link ||
        "";
      if (!url) return null;
      const snippet =
        job.description ||
        job.job_description ||
        job.description_text ||
        "";
      const company =
        job.company_name ||
        job.company ||
        null;
      return {
        title,
        url,
        snippet,
        source: "TheirStack",
        company,
      } as HuntResult;
    })
    .filter((r): r is HuntResult => r !== null);
}
