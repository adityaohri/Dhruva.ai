import { fetchJobHtml } from "@/lib/services/scrapingdog";
import { extractCleanJobDescription } from "@/lib/services/extractor";
import {
  INDUSTRY_KEYWORDS,
  buildBucketAQuery,
  getTopCompanies,
  getRoleVariants as getRepoRoleVariants,
  getSignalKeywords,
  scoreAgainstIndustry,
  type IndustryName,
} from "@/lib/industryKeywords";

/**
 * OPPORTUNITY INTELLIGENCE — SERP QUERY ENGINE
 * ==============================================
 * Converts user filter preferences (Industry, Job Type, Experience)
 * into an exhaustive, multi-bucket SerpApi query strategy.
 *
 * Architecture:
 *   Bucket A — Elite Core          (direct company career sites)
 *   Bucket B — ATS Deep-Web        (Workday, Greenhouse, Lever, SmartRecruiters)
 *   Bucket C — Hidden Market       (LinkedIn posts, informal hiring signals)
 *   Bucket D — Mass Aggregators    (Naukri, Indeed, Shine, Internshala)
 *   Bucket E — Signal Intelligence (funding news, expansion signals)
 *
 * Every result goes through Two-Step Deep Fetch before scoring.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type Industry =
  | "Consulting"
  | "Technology"
  | "Finance"
  | "Marketing"
  | "Operations"
  | "Product"
  | "Data & Analytics"
  | "Other";

export type JobType =
  | "Internship"
  | "Full-time"
  | "Part-time"
  | "Contract"
  | "Freelance";

export type ExperienceLevel =
  | "Fresher"
  | "0-1 years"
  | "1-2 years"
  | "2-5 years"
  | "5+ years";

export interface UserFilters {
  role: string;               // e.g. "Business Analyst"
  industries: Industry[];     // multi-select from onboarding
  jobTypes: JobType[];        // multi-select from onboarding
  experience: ExperienceLevel;
  locations: string[];        // e.g. ["Bangalore", "Mumbai", "Delhi"]
  remoteOk?: boolean;
}

export interface SerpQuery {
  bucket: "A" | "B" | "C" | "D" | "E";
  bucketLabel: string;
  engine: "google_jobs" | "google" | "google_news";
  params: Record<string, string | number | boolean>;
  priority: 1 | 2 | 3;       // 1 = run immediately, 2 = run in parallel, 3 = background
  rationale: string;
}

export interface QueryPlan {
  userFilters: UserFilters;
  queries: SerpQuery[];
  totalQueries: number;
  estimatedResultsMin: number;
  estimatedResultsMax: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROLE EXPANSION MAPS
// Maps a role to its common aliases and related titles, maximising index coverage
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_ALIASES: Record<string, string[]> = {
  "Business Analyst":         ["BA", "business analyst", "strategy analyst", "management consultant", "associate consultant"],
  "Product Manager":          ["PM", "product manager", "APM", "associate product manager", "product owner", "CPO"],
  "Data Analyst":             ["data analyst", "analytics analyst", "BI analyst", "business intelligence analyst", "data scientist"],
  "Software Engineer":        ["SWE", "software engineer", "SDE", "software developer", "backend engineer", "full stack engineer"],
  "Management Consultant":    ["consultant", "strategy consultant", "associate", "analyst consultant"],
  "Marketing Manager":        ["marketing manager", "growth manager", "brand manager", "digital marketing manager"],
  "Operations Manager":       ["operations manager", "ops manager", "operations analyst", "supply chain analyst"],
  "Finance Analyst":          ["finance analyst", "financial analyst", "FP&A analyst", "investment analyst"],
  "Strategy Analyst":         ["strategy analyst", "corporate strategy", "business development analyst", "strategic analyst"],
  "Product Analyst":          ["product analyst", "growth analyst", "product data analyst", "user researcher"],
};

// ─────────────────────────────────────────────────────────────────────────────
// INDUSTRY → SECTOR SIGNALS
// Additional keywords that boost relevance for each industry
// ─────────────────────────────────────────────────────────────────────────────

const INDUSTRY_SIGNALS: Record<Industry, string[]> = {
  "Consulting":        ["consulting", "advisory", "strategy", "management consulting", "Big 4", "MBB"],
  "Technology":        ["tech", "software", "SaaS", "startup", "product", "engineering"],
  "Finance":           ["finance", "banking", "investment", "fintech", "NBFC", "asset management"],
  "Marketing":         ["marketing", "growth", "brand", "digital", "performance marketing"],
  "Operations":        ["operations", "supply chain", "logistics", "process", "COO office"],
  "Product":           ["product", "product management", "roadmap", "user research", "UX"],
  "Data & Analytics":  ["data", "analytics", "BI", "machine learning", "AI", "data science"],
  "Other":             [],
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPERIENCE → SERP CHIPS + QUERY MODIFIERS
// ─────────────────────────────────────────────────────────────────────────────

const EXPERIENCE_MAP: Record<ExperienceLevel, {
  chip: string;       // SerpApi chips param value
  queryModifiers: string[];
  yearsLabel: string;
}> = {
  "Fresher":    { chip: "explvl_entry_level", queryModifiers: ["fresher", "entry level", "campus hire", "new graduate", "0 years"], yearsLabel: "0 years" },
  "0-1 years":  { chip: "explvl_entry_level", queryModifiers: ["0-1 years", "entry level", "junior", "associate", "fresher"],       yearsLabel: "0-1 years" },
  "1-2 years":  { chip: "explvl_entry_level", queryModifiers: ["1-2 years", "junior", "associate", "analyst"],                      yearsLabel: "1-2 years" },
  "2-5 years":  { chip: "explvl_mid_level",   queryModifiers: ["2-5 years", "mid-level", "senior analyst", "manager"],              yearsLabel: "2-5 years" },
  "5+ years":   { chip: "explvl_senior_level",queryModifiers: ["5+ years", "senior", "lead", "manager", "principal"],              yearsLabel: "5+ years" },
};

// ─────────────────────────────────────────────────────────────────────────────
// JOB TYPE → SERP CHIPS
// ─────────────────────────────────────────────────────────────────────────────

const JOB_TYPE_CHIPS: Record<JobType, string> = {
  "Full-time":   "jtype_fulltime",
  "Part-time":   "jtype_parttime",
  "Contract":    "jtype_contract",
  "Internship":  "jtype_internship",
  "Freelance":   "jtype_contract",    // SerpApi maps freelance to contract chip
};

// ─────────────────────────────────────────────────────────────────────────────
// INDUSTRY → ELITE CAREER SITES (Bucket A)
// ─────────────────────────────────────────────────────────────────────────────

const ELITE_SITES_BY_INDUSTRY: Record<Industry, string[]> = {
  "Consulting": [
    "site:jobs.mckinsey.com",
    "site:careers.bcg.com",
    "site:jobs.bain.com",
    "site:careers.deloitte.com",
    "site:ey.com/en_in/careers",
    "site:kpmg.com/in/en/careers",
    "site:pwc.in/en/careers",
    "site:careers.oliverwyman.com",
  ],
  "Technology": [
    "site:careers.google.com",
    "site:careers.microsoft.com",
    "site:amazon.jobs",
    "site:jobs.meta.com",
    "site:careers.apple.com",
    "site:jobs.netflix.com",
    "site:jobs.infosys.com",
    "site:careers.tcs.com",
    "site:wipro.com/careers",
  ],
  "Finance": [
    "site:goldmansachs.com/careers",
    "site:careers.morganstanley.com",
    "site:jpmorgan.com/global/careers",
    "site:careers.baml.com",
    "site:hdfcbank.com/content/bbp/repositories/723fb80a-2dde-42a3-9793-7ae1be57c87f/careers",
    "site:icicicareers.com",
    "site:axisbank.com/about-us/careers",
    "site:kotaklife.com/careers",
  ],
  "Marketing": [
    "site:careers.google.com",
    "site:careers.unilever.com",
    "site:pg.com/en_IN/careers",
    "site:nestle.in/jobs",
    "site:careers.amazon.com",
  ],
  "Operations": [
    "site:amazon.jobs",
    "site:careers.flipkart.com",
    "site:careers.swiggy.in",
    "site:zomato.com/careers",
    "site:delhivery.com/careers",
  ],
  "Product": [
    "site:careers.google.com",
    "site:jobs.meta.com",
    "site:careers.microsoft.com",
    "site:razorpay.com/jobs",
    "site:phonepe.com/en_IN/careers",
    "site:cred.club/careers",
  ],
  "Data & Analytics": [
    "site:careers.google.com",
    "site:amazon.jobs",
    "site:careers.microsoft.com",
    "site:jobs.infosys.com",
    "site:careers.tcs.com",
  ],
  "Other": [
    "site:careers.google.com",
    "site:careers.microsoft.com",
    "site:amazon.jobs",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// QUERY BUILDER HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function buildChipsParam(filters: UserFilters): string {
  const chips: string[] = [];

  // Experience chip
  const expChip = EXPERIENCE_MAP[filters.experience]?.chip;
  if (expChip) chips.push(expChip);

  // Job type chips — take the first selected job type for the chips param
  // (SerpApi supports one jtype chip per call; we fan out for multiple)
  if (filters.jobTypes.length > 0) {
    const firstTypeChip = JOB_TYPE_CHIPS[filters.jobTypes[0]];
    if (firstTypeChip) chips.push(firstTypeChip);
  }

  if (filters.remoteOk) chips.push("wfh_yes");

  return chips.join(",");
}

function getPrimaryLocation(filters: UserFilters): string {
  return filters.locations[0] || "India";
}

function getRoleVariants(role: string): string[] {
  const normalised = role.toLowerCase().trim();
  for (const [key, aliases] of Object.entries(ROLE_ALIASES)) {
    if (key.toLowerCase() === normalised || aliases.includes(normalised)) {
      return aliases;
    }
  }
  // Fallback: return role as-is plus some generic modifiers
  return [role, `${role} analyst`, `senior ${role}`, `junior ${role}`];
}

function getJobTypeQueryModifier(jobTypes: JobType[]): string {
  const modifiers: string[] = [];
  if (jobTypes.includes("Internship")) modifiers.push("internship");
  if (jobTypes.includes("Full-time"))  modifiers.push("full time");
  if (jobTypes.includes("Contract"))   modifiers.push("contract");
  if (jobTypes.includes("Freelance"))  modifiers.push("freelance");
  return modifiers.slice(0, 2).join(" OR ");
}

function getIndustrySectorKeyword(industries: Industry[]): string {
  const signals = industries.flatMap(ind => INDUSTRY_SIGNALS[ind] || []);
  return signals.slice(0, 3).join(" OR ");
}

// ─────────────────────────────────────────────────────────────────────────────
// BUCKET BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

function buildBucketA(userFilters: UserFilters): SerpQuery[] {
  const industry = (userFilters.industries?.[0] ?? "Other") as IndustryName;
  const role = userFilters.role || "analyst";
  const location = userFilters.locations?.[0] ?? "India";
  const jobType = userFilters.jobTypes?.[0] ?? "";

  const roleVariants = getRepoRoleVariants(industry).slice(0, 6);
  const primaryRoles = roleVariants.length > 0 ? roleVariants : [role];

  const companyQueries = buildBucketAQuery(industry, role, 4);

  const queries: SerpQuery[] = [];

  companyQueries.forEach((q, idx) => {
    queries.push({
      engine: "google_jobs",
      bucket: "A",
      bucketLabel: `Elite ${industry} Companies (group ${idx + 1})`,
      priority: 1,
      params: {
        q,
        location,
        gl: "in",
        hl: "en",
        ...(jobType && { employment_type: jobType.toUpperCase() }),
      },
      rationale: `Direct ${industry} company career sites for ${role} (group ${idx + 1})`,
    });
  });

  primaryRoles.slice(0, 3).forEach((roleTitle) => {
    queries.push({
      engine: "google_jobs",
      bucket: "A",
      bucketLabel: `${industry} role: ${roleTitle}`,
      priority: 1,
      params: {
        q: `"${roleTitle}" India`,
        location,
        gl: "in",
        hl: "en",
        ...(jobType && { employment_type: jobType.toUpperCase() }),
      },
      rationale: `Targeted Google Jobs search for ${industry} title "${roleTitle}"`,
    });
  });

  return queries;
}

function buildBucketB(userFilters: UserFilters): SerpQuery[] {
  const industry = (userFilters.industries?.[0] ?? "Other") as IndustryName;
  const role = userFilters.role || "analyst";
  const location = userFilters.locations?.[0] ?? "India";
  const jobType = userFilters.jobTypes?.[0] ?? "";

  const roleVariants = getRepoRoleVariants(industry).slice(0, 3);
  const primaryRole = roleVariants[0] ?? role;
  const secondaryRole = roleVariants[1] ?? role;

  const ATS_SITES = [
    "site:boards.greenhouse.io",
    "site:lever.co",
    "site:myworkdayjobs.com",
    "site:ashbyhq.com",
    "site:smartrecruiters.com",
  ];

  const atsSiteStr = ATS_SITES.slice(0, 3).join(" OR ");

  return [
    {
      engine: "google",
      bucket: "B",
      bucketLabel: `ATS deep-web: ${primaryRole}`,
      priority: 2,
      params: {
        q: `(${atsSiteStr}) "${primaryRole}" ${location}`,
        gl: "in",
        hl: "en",
        num: 20,
      },
      rationale: `Search top ATS boards for primary role "${primaryRole}" in ${location}`,
    },
    {
      engine: "google",
      bucket: "B",
      bucketLabel: `ATS deep-web: ${secondaryRole}`,
      priority: 2,
      params: {
        q: `(${atsSiteStr}) "${secondaryRole}" ${location}`,
        gl: "in",
        hl: "en",
        num: 20,
      },
      rationale: `Search top ATS boards for secondary role "${secondaryRole}" in ${location}`,
    },
    {
      engine: "google",
      bucket: "B",
      bucketLabel: `Naukri: ${industry} roles`,
      priority: 2,
      params: {
        q: `site:naukri.com "${primaryRole}" ${location} -"job vacancies" -"openings in" -"jobs in"`,
        gl: "in",
        hl: "en",
        num: 20,
      },
      rationale: `Naukri individual pages for ${industry} role "${primaryRole}" in ${location}`,
    },
    {
      engine: "google",
      bucket: "B",
      bucketLabel: `IIMJobs: ${industry}`,
      priority: 2,
      params: {
        q: `site:iimjobs.com "${primaryRole}" ${location}`,
        gl: "in",
        hl: "en",
        num: 10,
      },
      rationale: `IIMJobs MBA/strategy roles for ${industry} and "${primaryRole}"`,
    },
  ];
}

/**
 * BUCKET C — Hidden Market
 * LinkedIn posts, informal hiring signals, referral posts
 * Uses Google Search (not Google Jobs) to surface posts
 */
function buildBucketC(userFilters: UserFilters): SerpQuery[] {
  const industry = (userFilters.industries?.[0] ?? "Other") as IndustryName;
  const role = userFilters.role || "analyst";
  const location = userFilters.locations?.[0] ?? "India";

  const topCompanies = getTopCompanies(industry, 12);
  const roleVariants = getRepoRoleVariants(industry).slice(0, 3);
  const primaryRole = roleVariants[0] ?? role;

  const companyStr4 = topCompanies.slice(0, 4).map((c) => `"${c}"`).join(" OR ");
  const companyStr8 = topCompanies.slice(4, 8).map((c) => `"${c}"`).join(" OR ");
  const companyStr12 = topCompanies.slice(8, 12).map((c) => `"${c}"`).join(" OR ");

  const queries: SerpQuery[] = [];

  if (companyStr4) {
    queries.push({
      engine: "google",
      bucket: "C",
      bucketLabel: `LinkedIn hiring: top ${industry} firms (1-4)`,
      priority: 2,
      params: {
        q: `site:linkedin.com (${companyStr4}) ("hiring" OR "we are looking for" OR "open roles") "${primaryRole}"`,
        gl: "in",
        hl: "en",
        num: 10,
        tbs: "qdr:m6",
      },
      rationale: `LinkedIn hiring posts for ${primaryRole} at top ${industry} firms (1-4)`,
    });
  }

  if (companyStr8) {
    queries.push({
      engine: "google",
      bucket: "C",
      bucketLabel: `LinkedIn hiring: top ${industry} firms (5-8)`,
      priority: 2,
      params: {
        q: `site:linkedin.com (${companyStr8}) ("hiring" OR "we are looking for" OR "open roles") "${primaryRole}"`,
        gl: "in",
        hl: "en",
        num: 10,
        tbs: "qdr:m6",
      },
      rationale: `LinkedIn hiring posts for ${primaryRole} at top ${industry} firms (5-8)`,
    });
  }

  if (companyStr12) {
    queries.push({
      engine: "google",
      bucket: "C",
      bucketLabel: `LinkedIn hiring: top ${industry} firms (9-12)`,
      priority: 3,
      params: {
        q: `site:linkedin.com (${companyStr12}) ("hiring" OR "referral" OR "open roles")`,
        gl: "in",
        hl: "en",
        num: 10,
        tbs: "qdr:m6",
      },
      rationale: `LinkedIn hiring/referral posts at next-tier ${industry} firms (9-12)`,
    });
  }

  queries.push(
    {
      engine: "google",
      bucket: "C",
      bucketLabel: `LinkedIn hiring: ${primaryRole} India`,
      priority: 3,
      params: {
        q: `site:linkedin.com/posts "hiring" "${primaryRole}" India after:2025-09-01`,
        gl: "in",
        hl: "en",
        num: 10,
        tbs: "qdr:m6",
      },
      rationale: `Role-specific LinkedIn posts explicitly "hiring" for ${primaryRole} in India`,
    },
    {
      engine: "google",
      bucket: "C",
      bucketLabel: `LinkedIn referrals: ${industry}`,
      priority: 3,
      params: {
        q: `site:linkedin.com (${companyStr4}) "referral" "open roles" India`,
        gl: "in",
        hl: "en",
        num: 10,
        tbs: "qdr:m6",
      },
      rationale: `Referral-oriented LinkedIn posts from top ${industry} firms mentioning open roles in India`,
    }
  );

  return queries;
}

/**
 * BUCKET D — Mass Aggregators
 * Naukri, Indeed, Shine, Internshala, LinkedIn Jobs, Glassdoor
 * Google Jobs engine with exhaustive pagination
 */
function buildBucketD(userFilters: UserFilters): SerpQuery[] {
  const industry = (userFilters.industries?.[0] ?? "Other") as IndustryName;
  const role = userFilters.role || "analyst";
  const location = userFilters.locations?.[0] ?? "India";
  const jobType = userFilters.jobTypes?.[0] ?? "";
  const experience = userFilters.experience ?? "";

  const roleVariants = getRepoRoleVariants(industry).slice(0, 8);

  const queries: SerpQuery[] = [];

  roleVariants.forEach((roleTitle) => {
    queries.push({
      engine: "google_jobs",
      bucket: "D",
      bucketLabel: `Jobs: ${roleTitle}`,
      priority: 3,
      params: {
        q: `${roleTitle} ${location} ${experience}`.trim(),
        location,
        gl: "in",
        hl: "en",
        ...(jobType && { employment_type: jobType.toUpperCase() }),
      },
      rationale: `Google Jobs listings for ${roleTitle} in ${location} (${experience})`,
    });
  });

  if (
    jobType.toLowerCase().includes("intern") ||
    userFilters.jobTypes?.some((jt) => jt.toLowerCase().includes("intern"))
  ) {
    const primaryRole = roleVariants[0] ?? role;
    queries.push({
      engine: "google",
      bucket: "D",
      bucketLabel: `Internshala: ${industry} internships`,
      priority: 3,
      params: {
        q: `site:internshala.com/jobs/detail "${primaryRole}"`,
        gl: "in",
        hl: "en",
        num: 10,
      },
      rationale: `Internshala internships for ${primaryRole} in ${industry}`,
    });
  }

  return queries;
}

/**
 * BUCKET E — Signal Intelligence
 * Funding news, office openings, expansion signals — pre-posting hiring intent
 */
function buildBucketE(userFilters: UserFilters): SerpQuery[] {
  const industry = (userFilters.industries?.[0] ?? "Other") as IndustryName;
  const location = userFilters.locations?.[0] ?? "India";

  const signals = getSignalKeywords(industry);
  const topCompanies = getTopCompanies(industry, 8);

  const POSITIVE_TRIGGERS = [
    "funding",
    "raises",
    "new office",
    "expands",
    "hiring",
    "headcount",
    "series",
    "investment",
    "launches",
    "appoints",
  ];

  const triggerStr = POSITIVE_TRIGGERS.slice(0, 3)
    .map((t) => `"${t}"`)
    .join(" OR ");

  const companyStr = topCompanies
    .slice(0, 4)
    .map((c) => `"${c}"`)
    .join(" OR ");

  return [
    {
      engine: "google_news",
      bucket: "E",
      bucketLabel: `${industry} hiring signals`,
      priority: 3,
      params: {
        q: `(${triggerStr}) ${industry} ${location}`,
        gl: "in",
        hl: "en",
        num: 10,
        tbs: "qdr:m6",
      },
      rationale: `Positive ${industry} hiring/funding/expansion news in ${location}`,
    },
    {
      engine: "google_news",
      bucket: "E",
      bucketLabel: `${industry} company signals`,
      priority: 3,
      params: {
        q: `(${companyStr}) ("hiring" OR "expansion" OR "funding" OR "new office")`,
        gl: "in",
        hl: "en",
        num: 10,
        tbs: "qdr:m6",
      },
      rationale: `Company-specific ${industry} signals for top companies (${companyStr})`,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN QUERY PLAN BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the complete query plan for a user's filter set.
 * Returns all queries across all 5 buckets, sorted by priority.
 *
 * Usage:
 *   const plan = buildQueryPlan(userFilters);
 *   // Execute priority 1 queries immediately
 *   // Execute priority 2 queries in parallel after p1 resolves
 *   // Execute priority 3 queries in background / lazy load
 */
export function buildQueryPlan(filters: UserFilters): QueryPlan {
  const bucketA = buildBucketA(filters);
  const bucketB = buildBucketB(filters);
  const bucketC = buildBucketC(filters);
  const bucketD = buildBucketD(filters);
  const bucketE = buildBucketE(filters);

  const allQueries = [
    ...bucketA,
    ...bucketB,
    ...bucketC,
    ...bucketD,
    ...bucketE,
  ].sort((a, b) => a.priority - b.priority);

  return {
    userFilters: filters,
    queries: allQueries,
    totalQueries: allQueries.length,
    estimatedResultsMin: allQueries.length * 5,
    estimatedResultsMax: allQueries.length * 20,
  };
}

/**
 * Build a fast, minimal query plan for real-time typeahead/preview.
 * Runs only priority-1 queries across Buckets A and D.
 */
export function buildFastQueryPlan(filters: UserFilters): QueryPlan {
  const allQueries = [
    ...buildBucketA(filters),
    ...buildBucketD(filters),
  ].filter(q => q.priority === 1);

  return {
    userFilters: filters,
    queries: allQueries,
    totalQueries: allQueries.length,
    estimatedResultsMin: allQueries.length * 5,
    estimatedResultsMax: allQueries.length * 15,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TWO-STEP DEEP FETCH
// ─────────────────────────────────────────────────────────────────────────────

export interface RawJobResult {
  job_id?: string;
  title: string;
  company_name: string;
  location: string;
  description?: string;        // truncated from search
  apply_options?: { link: string }[];
  detected_extensions?: {
    posted_at?: string;
    schedule_type?: string;
    salary?: string;
  };
  source?: string;
}

export interface EnrichedJobResult extends RawJobResult {
  fullDescription: string;     // from google_jobs_listing second call
  applyUrl: string;
  descriptionDepth: "full" | "partial" | "none";
  fetchedAt: string;
  bucket: "A" | "B" | "C" | "D" | "E";
}

/**
 * Two-Step Deep Fetch — call this for every raw result from any bucket.
 *
 * Step 1 already done (search results are the input).
 * Step 2: Fetch full listing detail via google_jobs_listing engine.
 *
 * If google_jobs_listing fails (e.g. for non-Google-Jobs sources),
 * fall back to web_fetch on the apply URL.
 */
export async function deepFetchJob(
  rawJob: RawJobResult,
  bucket: EnrichedJobResult["bucket"],
  serpApiCall: (params: Record<string, string | number>) => Promise<any>
): Promise<EnrichedJobResult> {
  let fullDescription = rawJob.description || "";
  let descriptionDepth: EnrichedJobResult["descriptionDepth"] = "none";
  const applyUrl = rawJob.apply_options?.[0]?.link || "";

  // Attempt Step 2: google_jobs_listing if job_id is available (Google Jobs sources)
  if (rawJob.job_id) {
    try {
      const listingResult = await serpApiCall({
        engine: "google_jobs_listing",
        q: rawJob.job_id,
        gl: "in",
        hl: "en",
      });

      const listing = listingResult?.jobs_results?.[0] || listingResult;
      if (listing?.description && listing.description.length > (fullDescription?.length || 0)) {
        fullDescription = listing.description;
        descriptionDepth = "full";
      }
    } catch (_err) {
      // Silently fall through to web_fetch fallback
    }
  }

  // Direct web_fetch fallback for non-Google-Jobs or when listing is unavailable.
  if ((!fullDescription || fullDescription.length < 200) && applyUrl) {
    try {
      const html = await fetchJobHtml(applyUrl);
      const clean = await extractCleanJobDescription(html);
      if (clean && clean.length > (fullDescription?.length || 0)) {
        fullDescription = clean;
        descriptionDepth = "full";
      }
    } catch (_err) {
      // As a fallback-only path, we log lightly and continue.
      // console.warn("[serpQueryEngine] web_fetch fallback failed:", _err);
    }
  }

  // If still no full description, mark as partial when we have a reasonable snippet
  if (descriptionDepth === "none" && fullDescription.length > 200) {
    descriptionDepth = "partial";
  }

  return {
    ...rawJob,
    fullDescription,
    applyUrl,
    descriptionDepth,
    fetchedAt: new Date().toISOString(),
    bucket,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DEDUPLICATION
// ─────────────────────────────────────────────────────────────────────────────

function normaliseForDedupKey(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b(intern|internship|the|a|an|at|in|for|of|and|or)\b/g, "")
    .trim()
    .split(" ")
    .sort()
    .join(" ");
}

/**
 * Deduplicate jobs across all buckets.
 * Key: fuzzy-normalised title + company.
 * When duplicate found, keep the record with more description depth.
 */
export function deduplicateJobs(jobs: EnrichedJobResult[]): EnrichedJobResult[] {
  const seen = new Map<string, EnrichedJobResult>();

  for (const job of jobs) {
    const titleKey = normaliseForDedupKey(job.title)
      .split(" ")
      .slice(0, 5)
      .join(" ");
    const companyKey = job.company_name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 15);
    const key = `${companyKey}__${titleKey}`;
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, job);
    } else {
      // Keep whichever has deeper description
      const depthScore = { full: 3, partial: 2, none: 1 };
      if (depthScore[job.descriptionDepth] > depthScore[existing.descriptionDepth]) {
        seen.set(key, job);
      }
    }
  }

  return Array.from(seen.values());
}

// ─────────────────────────────────────────────────────────────────────────────
// USAGE EXAMPLE
// ─────────────────────────────────────────────────────────────────────────────

/*
const userFilters: UserFilters = {
  role: "Business Analyst",
  industries: ["Consulting", "Finance"],
  jobTypes: ["Full-time"],
  experience: "1-2 years",
  locations: ["Bangalore", "Mumbai", "Delhi"],
  remoteOk: false,
};

const plan = buildQueryPlan(userFilters);
console.log(`Total queries: ${plan.totalQueries}`);
console.log(`Estimated results: ${plan.estimatedResultsMin}–${plan.estimatedResultsMax}`);

// Execute priority 1 immediately
const p1Queries = plan.queries.filter(q => q.priority === 1);
// Execute priority 2 in parallel background
const p2Queries = plan.queries.filter(q => q.priority === 2);
// Execute priority 3 lazily / on scroll
const p3Queries = plan.queries.filter(q => q.priority === 3);
*/
