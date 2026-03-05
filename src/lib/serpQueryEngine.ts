import { fetchJobHtml } from "@/lib/services/scrapingdog";
import { extractCleanJobDescription } from "@/lib/services/extractor";

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

/**
 * BUCKET A — Elite Core
 * Tier‑1 company career pages via Google Jobs, per industry.
 */
function buildBucketA(filters: UserFilters): SerpQuery[] {
  const queries: SerpQuery[] = [];
  const primaryLocation = getPrimaryLocation(filters);
  const role = filters.role;

  const pushQuery = (q: string, label: string, rationale: string) => {
    queries.push({
      bucket: "A",
      bucketLabel: label,
      engine: "google_jobs",
      params: {
        q,
        location: primaryLocation,
        gl: "in",
        hl: "en",
      },
      priority: 1,
      rationale,
    });
  };

  for (const industry of filters.industries) {
    switch (industry) {
      case "Consulting": {
        pushQuery(
          `"${role}" McKinsey OR BCG OR Bain OR Deloitte OR EY`,
          "Elite Career Sites — Consulting (MBB + Big 4)",
          "Tier‑1 consulting firms via Google Jobs"
        );
        pushQuery(
          `"${role}" "Oliver Wyman" OR "Roland Berger" OR "Kearney" OR "Strategy&"`,
          "Elite Career Sites — Consulting (Strategy Boutiques)",
          "Global strategy boutiques via Google Jobs"
        );
        break;
      }
      case "Finance": {
        pushQuery(
          `"${role}" "Goldman Sachs" OR "Morgan Stanley" OR "JP Morgan" OR "Citi"`,
          "Elite Career Sites — Finance (IB)",
          "Top global investment banks via Google Jobs"
        );
        pushQuery(
          `"${role}" "HDFC Bank" OR "ICICI Bank" OR "Kotak" OR "Axis Bank"`,
          "Elite Career Sites — Finance (India Banks)",
          "Leading Indian banks via Google Jobs"
        );
        pushQuery(
          `"${role}" "Bajaj Finance" OR "Zerodha" OR "Groww" OR "CRED" OR "Razorpay"`,
          "Elite Career Sites — Finance (Fintech)",
          "High‑growth Indian fintech companies via Google Jobs"
        );
        break;
      }
      case "Technology": {
        pushQuery(
          `"${role}" Google OR Microsoft OR Amazon OR Meta OR Apple`,
          "Elite Career Sites — Technology (Big Tech)",
          "Global Big Tech via Google Jobs"
        );
        pushQuery(
          `"${role}" Flipkart OR Swiggy OR Zomato OR PhonePe OR Razorpay OR CRED`,
          "Elite Career Sites — Technology (India Product)",
          "Tier‑1 Indian product tech companies via Google Jobs"
        );
        break;
      }
      case "Operations": {
        pushQuery(
          `"${role}" "Tata" OR "Mahindra" OR "L&T" OR "Adani" OR "Reliance"`,
          "Elite Career Sites — Operations",
          "Large Indian conglomerates with deep operations orgs"
        );
        break;
      }
      case "Product": {
        pushQuery(
          `"${role}" Google OR Microsoft OR Flipkart OR Meesho OR Swiggy OR Zepto`,
          "Elite Career Sites — Product",
          "Product‑heavy tech companies via Google Jobs"
        );
        break;
      }
      case "Marketing": {
        pushQuery(
          `"${role}" "Hindustan Unilever" OR "ITC" OR "Nestle" OR "P&G" OR "Marico"`,
          "Elite Career Sites — Marketing (FMCG)",
          "Top FMCG marketing houses via Google Jobs"
        );
        break;
      }
      case "Data & Analytics": {
        pushQuery(
          `"${role}" Google OR Microsoft OR Amazon OR "Mu Sigma" OR "Tiger Analytics"`,
          "Elite Career Sites — Data & Analytics",
          "Global + India analytics leaders via Google Jobs"
        );
        break;
      }
      case "Other":
      default: {
        // Generic Tier‑1 tech fallback
        pushQuery(
          `"${role}" Google OR Microsoft OR Amazon OR Meta OR Apple`,
          "Elite Career Sites — General Tier 1",
          "Generic Tier‑1 companies via Google Jobs"
        );
        break;
      }
    }
  }

  return queries;
}

/**
 * BUCKET B — ATS Deep-Web
 * Workday, Greenhouse, Lever, SmartRecruiters — massive coverage gap in most job boards
 */
function buildBucketB(filters: UserFilters): SerpQuery[] {
  const queries: SerpQuery[] = [];
  const expLabel = EXPERIENCE_MAP[filters.experience].yearsLabel;
  const sectorKw = getIndustrySectorKeyword(filters.industries);
  const primaryLocation = getPrimaryLocation(filters);

  const atsPlatforms = [
    { sites: "site:myworkdayjobs.com OR site:wd3.myworkdayjobs.com", label: "Workday" },
    { sites: "site:boards.greenhouse.io OR site:greenhouse.io/job", label: "Greenhouse" },
    { sites: "site:jobs.lever.co OR site:lever.co/jobs",            label: "Lever" },
    { sites: "site:smartrecruiters.com/jobs OR site:careers.smartrecruiters.com", label: "SmartRecruiters" },
    { sites: "site:jobs.ashbyhq.com OR site:app.ashbyhq.com",       label: "Ashby (startups)" },
    { sites: "site:instahyre.com OR site:cutshort.io",               label: "India startup ATSes" },
  ];

  for (const { sites, label } of atsPlatforms) {
    // Core query
    queries.push({
      bucket: "B",
      bucketLabel: `ATS Deep-Web — ${label}`,
      engine: "google",
      params: {
        q: `"${filters.role}" India (${sites})`,
        gl: "in",
        hl: "en",
        num: 20,
      },
      priority: 1,
      rationale: `Deep-web ATS scrape via ${label} — not covered by Google Jobs indexing`,
    });

    // Variant with sector keyword for precision
    if (sectorKw) {
      queries.push({
        bucket: "B",
        bucketLabel: `ATS Deep-Web — ${label} (sector)`,
        engine: "google",
        params: {
          q: `"${filters.role}" (${sectorKw}) India (${sites})`,
          gl: "in",
          hl: "en",
          num: 20,
        },
        priority: 2,
        rationale: `Sector-filtered ATS search for ${filters.industries.join(", ")}`,
      });
    }

    // All target locations
    for (const location of filters.locations) {
      queries.push({
        bucket: "B",
        bucketLabel: `ATS Deep-Web — ${label} (${location})`,
        engine: "google",
        params: {
          q: `"${filters.role}" "${location}" (${sites})`,
          gl: "in",
          hl: "en",
          num: 10,
        },
        priority: 2,
        rationale: `Location-specific ATS search for ${location}`,
      });
    }
  }

  return queries;
}

/**
 * BUCKET C — Hidden Market
 * LinkedIn posts, informal hiring signals, referral posts
 * Uses Google Search (not Google Jobs) to surface posts
 */
function buildBucketC(filters: UserFilters): SerpQuery[] {
  const queries: SerpQuery[] = [];

  // Rolling 30-day date for recency — formatted for Google's after: operator
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const afterDate = thirtyDaysAgo.toISOString().split("T")[0]; // YYYY-MM-DD

  const roleVariants = getRoleVariants(filters.role).slice(0, 3);
  const locationStr = filters.locations.slice(0, 3).join(" OR ");

  // Core hiring post signals
  const hiringSignals = [
    `"hiring" "${filters.role}"`,
    `"we are looking for" "${filters.role}"`,
    `"open roles" "${filters.role}"`,
    `"referral" "${filters.role}"`,
    `"DM me" "${filters.role}"`,
    `"dropping a referral" "${filters.role}"`,     // very India-specific phrase
    `"if you know anyone" "${filters.role}"`,
  ];

  for (const signal of hiringSignals) {
    queries.push({
      bucket: "C",
      bucketLabel: "LinkedIn Hiring Posts",
      engine: "google",
      params: {
        q: `${signal} (${locationStr}) site:linkedin.com/posts after:${afterDate}`,
        gl: "in",
        hl: "en",
        num: 10,
      },
      priority: 2,
      rationale: `LinkedIn informal hiring signal: "${signal}"`,
    });
  }

  // Role alias variants on LinkedIn
  for (const variant of roleVariants) {
    queries.push({
      bucket: "C",
      bucketLabel: "LinkedIn Posts — Role Alias",
      engine: "google",
      params: {
        q: `"hiring" "${variant}" India site:linkedin.com/posts after:${afterDate}`,
        gl: "in",
        hl: "en",
        num: 10,
      },
      priority: 3,
      rationale: `Role alias search for "${variant}" to catch abbreviation usage`,
    });
  }

  // Twitter/X hiring signals
  queries.push({
    bucket: "C",
    bucketLabel: "Twitter/X Hiring Signals",
    engine: "google",
    params: {
      q: `"hiring" "${filters.role}" India (site:twitter.com OR site:x.com) after:${afterDate}`,
      gl: "in",
      hl: "en",
      num: 10,
    },
    priority: 3,
    rationale: "Twitter/X informal hiring posts — founders often announce here first",
  });

  // WhatsApp/Telegram public groups indexed by Google
  queries.push({
    bucket: "C",
    bucketLabel: "Community Hiring Boards",
    engine: "google",
    params: {
      q: `"${filters.role}" India hiring ${filters.experience} (site:hasnode.com OR site:notion.site OR site:airtable.com)`,
      gl: "in",
      hl: "en",
      num: 10,
    },
    priority: 3,
    rationale: "Community job boards on Notion/Airtable — common in India startup ecosystem",
  });

  return queries;
}

/**
 * BUCKET D — Mass Aggregators
 * Naukri, Indeed, Shine, Internshala, LinkedIn Jobs, Glassdoor
 * Google Jobs engine with exhaustive pagination
 */
function buildBucketD(filters: UserFilters): SerpQuery[] {
  const queries: SerpQuery[] = [];
  const chips = buildChipsParam(filters);
  const expModifiers = EXPERIENCE_MAP[filters.experience].queryModifiers;
  const jobTypeModifier = getJobTypeQueryModifier(filters.jobTypes);
  const sectorKw = getIndustrySectorKeyword(filters.industries);
  const roleVariants = getRoleVariants(filters.role);

  // Primary Google Jobs query — paginated via next_page_token in execution
  for (const location of filters.locations) {
    // Core query per location
    queries.push({
      bucket: "D",
      bucketLabel: `Aggregators — ${location}`,
      engine: "google_jobs",
      params: {
        q: `"${filters.role}" ${expModifiers[0]}`,
        location: location,
        gl: "in",
        hl: "en",
        ...(chips && { chips }),
      },
      priority: 1,
      rationale: `Primary Google Jobs search for ${filters.role} in ${location}`,
    });

    // With sector keyword for relevance
    if (sectorKw) {
      queries.push({
        bucket: "D",
        bucketLabel: `Aggregators — ${location} (sector boosted)`,
        engine: "google_jobs",
        params: {
          q: `"${filters.role}" ${sectorKw.split(" OR ")[0]}`,
          location: location,
          gl: "in",
          hl: "en",
          ...(chips && { chips }),
        },
        priority: 2,
        rationale: `Sector-boosted Google Jobs for ${filters.industries[0]} roles`,
      });
    }
  }

  // Role alias queries — different titles index different jobs
  for (const variant of roleVariants.slice(0, 3)) {
    queries.push({
      bucket: "D",
      bucketLabel: `Aggregators — Role Alias (${variant})`,
      engine: "google_jobs",
      params: {
        q: `"${variant}"`,
        location: "India",
        gl: "in",
        hl: "en",
        ...(chips && { chips }),
      },
      priority: 2,
      rationale: `Alias search for "${variant}" — different companies use different titles`,
    });
  }

  // Naukri direct (Google can partially index it via Google Jobs despite block)
  queries.push({
    bucket: "D",
    bucketLabel: "Naukri Direct (Google)",
    engine: "google_jobs",
    params: {
      q: `"${filters.role}" "${expModifiers[0]}" India site:naukri.com`,
      location: "India",
      gl: "in",
      hl: "en",
    },
    priority: 1,
    rationale:
      "Naukri direct search — partial Google Jobs indexing + Apify Naukri scraper supplements this",
  });

  // Internshala & IIMJobs for fresher / intern / MBA roles
  if (
    ["Fresher", "0-1 years", "1-2 years"].includes(filters.experience) ||
    filters.jobTypes.includes("Internship")
  ) {
    queries.push({
      bucket: "D",
      bucketLabel: "Internshala (Fresher/Intern)",
      engine: "google",
      params: {
        q: `"${filters.role}" India site:internshala.com`,
        gl: "in",
        hl: "en",
        num: 20,
      },
      priority: 2,
      rationale:
        "Internshala — critical source for fresher/intern roles in India, not indexed by Google Jobs",
    });

    queries.push({
      bucket: "D",
      bucketLabel: "IIMJobs (MBA Roles)",
      engine: "google",
      params: {
        q: `"${filters.role}" India site:iimjobs.com`,
        gl: "in",
        hl: "en",
        num: 20,
      },
      priority: 2,
      rationale:
        "IIMJobs — India's primary job board for MBA/management roles",
    });
  }

  return queries;
}

/**
 * BUCKET E — Signal Intelligence
 * Funding news, office openings, expansion signals — pre-posting hiring intent
 */
function buildBucketE(filters: UserFilters): SerpQuery[] {
  const queries: SerpQuery[] = [];
  const sectorKw = getIndustrySectorKeyword(filters.industries);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const afterDate = thirtyDaysAgo.toISOString().split("T")[0];

  // Funding signals → hiring intent
  queries.push({
    bucket: "E",
    bucketLabel: "Funding Signals",
    engine: "google_news",
    params: {
      q: `India startup funding "Series A" OR "Series B" OR "raised" ${sectorKw.split(" OR ")[0]} ${afterDate}`,
      gl: "in",
      hl: "en",
    },
    priority: 3,
    rationale: "Companies that raised funding in last 30 days are likely hiring imminently",
  });

  // Office expansion signals
  queries.push({
    bucket: "E",
    bucketLabel: "Office Expansion Signals",
    engine: "google_news",
    params: {
      q: `India "new office" OR "expanding team" OR "hiring spree" ${sectorKw.split(" OR ")[0]} after:${afterDate}`,
      gl: "in",
      hl: "en",
    },
    priority: 3,
    rationale: "New office/expansion announcements precede hiring waves",
  });

  // Layoff signals at competitors → talent displacement creates your user's competition
  queries.push({
    bucket: "E",
    bucketLabel: "Market Displacement Signals",
    engine: "google_news",
    params: {
      q: `India "layoffs" OR "restructuring" ${sectorKw.split(" OR ")[0]} after:${afterDate}`,
      gl: "in",
      hl: "en",
    },
    priority: 3,
    rationale: "Layoffs at competitors signal open roles elsewhere + talent displacement narrative",
  });

  return queries;
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

/**
 * Deduplicate jobs across all buckets.
 * Key: normalised title + company.
 * When duplicate found, keep the record with more description depth.
 */
export function deduplicateJobs(jobs: EnrichedJobResult[]): EnrichedJobResult[] {
  const seen = new Map<string, EnrichedJobResult>();

  for (const job of jobs) {
    const key = `${job.title.toLowerCase().trim()}__${job.company_name.toLowerCase().trim()}`;
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
