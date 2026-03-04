import { NextRequest, NextResponse } from "next/server";
import {
  generateDorkQueries,
  executeHunt,
  fetchGoogleJobs,
  isDirectUrl,
  type SentinelFilters,
  type HuntResult,
} from "@/lib/services/sentinel";
import {
  standardiseAndSummariseJobs,
  type EnrichedJob,
} from "@/lib/services/extractor";
import {
  calculateMatchScore,
  type JobData,
  type UserProfile,
} from "@/lib/services/analyst";
import { createClient } from "@/lib/supabase/server";

export interface SentinelResultItem extends HuntResult {
  isDirect: boolean;
  company: string | null;
  /** Nomenclature: "Company: Role". */
  displayName?: string;
  /** Claude‑generated 3‑bullet summary of the job. */
  summary?: string | null;
   /** Prestige score for sorting (higher = more sought after). */
  prestige_score?: number;
  /** CV-to-JD match analysis */
  match_score?: number;
  match_band?: "Strong" | "Good" | "Moderate" | "Stretch";
  match_strengths?: string[];
  match_gaps?: string[];
  match_action_item?: string;
}

/**
 * Extract company name from title and snippet (heuristics for Naukri, LinkedIn, ATS snippets).
 */
function extractCompany(title: string, snippet: string): string | null {
  const combined = `${title} ${snippet}`;
  // "Company Name : Willware Technologies" or "Company : X"
  const companyLabel = combined.match(/Company\s*Name\s*:\s*([^.\n·]+?)(?:\s*\.|$|\s+Work\s|\))/i)
    ?? combined.match(/Company\s*:\s*([^.\n·]+?)(?:\s*\.|$|\s+Work\s|\))/i);
  if (companyLabel?.[1]) return companyLabel[1].trim();

  // "in The It Mind Services in", "in SWS Smart Working Solutions in", "at PwC India."
  const inCompany = combined.match(/\b(?:in|at)\s+([A-Z][A-Za-z0-9\s&.,'-]{2,40}?)\s+(?:in|\.|·|,|$)/);
  if (inCompany?.[1]) return inCompany[1].trim();

  // "Job Description for ... in CompanyName in" (Naukri pattern)
  const inDesc = combined.match(/in\s+([A-Z][A-Za-z0-9\s&.,'-]{2,40}?)\s+in\s+/i);
  if (inDesc?.[1]) return inDesc[1].trim();

  // "· Company Name ·" or " - Company Name - "
  const bullet = combined.match(/[·\-]\s*([A-Z][A-Za-z0-9\s&.,'-]{2,40}?)\s*[·\-]/);
  if (bullet?.[1]) return bullet[1].trim();

  return null;
}

/** True if the URL points to a specific job posting (not a search/listing page). */
function isLikelySpecificJobUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    // LinkedIn: /jobs/view/123456 is specific; /jobs/search or /jobs? is aggregate
    if (path.includes("/jobs/view/") || path.includes("/jobs/view-")) return true;
    // Naukri: /job-details/... is specific
    if (path.includes("/job-details/")) return true;
    // Greenhouse, Lever, Workday: usually /jobs/company-name or /job/123
    if (path.includes("/job/") && !path.endsWith("/jobs") && !path.endsWith("/job-listings")) return true;
    if (path.includes("/jobs/") && /\d+/.test(path)) return true;
    // Generic: URL has a long id or slug suggesting a single listing
    if (path.includes("/apply/") || path.includes("/openings/")) return true;
    return false;
  } catch {
    return false;
  }
}

/** True if this looks like an aggregate search page ("311 entry level consulting jobs in India"). */
function isAggregateListing(title: string, url: string): boolean {
  // If URL is clearly a specific job page, keep it even if title is generic (e.g. LinkedIn sometimes uses generic titles).
  if (isLikelySpecificJobUrl(url)) return false;
  if (!title || title.length > 150) return false;
  const t = title.trim();
  return /\d+\+?\s*(entry\s+level|consulting|full\s+time|part\s+time|remote|data|software|analyst|consultant)?\s*jobs?\s+(in\s|in\s+India|in\s+Mumbai|in\s+Bangalore|\(\d+\s*new\))/i.test(t)
    || /^\d+\+?\s+\w+(\s+\w+)*\s+jobs?\s+in\s+/i.test(t);
}

/** True when user asked for entry-level but result clearly asks for senior experience. */
function isExperienceMismatch(
  title: string,
  snippet: string,
  userExperience: string
): boolean {
  const entryLevel = /fresher|0-1\s*years|1-2\s*years|entry\s*level/i.test(userExperience);
  if (!entryLevel) return false;
  const text = `${title} ${snippet}`.toLowerCase();
  const seniorSignals = /\b(5\+?\s*years?|10\+?\s*years?|senior|lead\s+engineer|principal|director\b|vp\b|vice\s+president|head\s+of\s)/i;
  return seniorSignals.test(text);
}

/**
 * Deduplicate by URL (first occurrence wins), tag isDirect, add company, drop aggregates and experience mismatches.
 */
function dedupeTagAndFilter(
  results: HuntResult[],
  userExperience: string
): SentinelResultItem[] {
  const seen = new Set<string>();
  const out: SentinelResultItem[] = [];
  for (const r of results) {
    const url = r.url?.trim();
    if (!url || seen.has(url)) continue;
    if (isAggregateListing(r.title, url)) continue;
    if (isExperienceMismatch(r.title, r.snippet, userExperience)) continue;
    seen.add(url);
    const company = r.company ?? extractCompany(r.title, r.snippet);
    out.push({
      ...r,
      isDirect: isDirectUrl(url),
      company,
    });
  }
  return out;
}

/** Group results by company for "company wise" suggestion. */
function groupByCompany(results: SentinelResultItem[]): Record<string, SentinelResultItem[]> {
  const map: Record<string, SentinelResultItem[]> = {};
  for (const r of results) {
    const key = (r.company?.trim() || "Other").replace(/\s+/g, " ");
    if (!map[key]) map[key] = [];
    map[key].push(r);
  }
  return map;
}

function prestigeScore(company: string | null | undefined): number {
  if (!company) return 50;
  const c = company.toLowerCase();

  // Tier 1 (95‑100)
  if (c.includes("mckinsey")) return 100;
  if (c.includes("boston consulting group") || c === "bcg") return 99;
  if (c.includes("bain")) return 98;
  if (c.includes("google")) return 97;
  if (c.includes("apple")) return 96;
  if (c.includes("goldman sachs")) return 95;

  // Tier 2 (80‑94)
  if (c.includes("zs associates") || c === "zs") return 90;
  if (c.includes("deloitte")) return 89;
  if (c.includes("kpmg")) return 88;
  if (c.includes("ernst & young") || c === "ey") return 87;
  if (c.includes("zomato")) return 86;
  if (c.includes("swiggy")) return 85;

  // Default baseline
  return 50;
}

/**
 * POST /api/discovery/sentinel
 * Body: { industry, jobType, experience, location?, pay?, companies?, roles? }
 * Returns: { results: SentinelResultItem[], dorkQueries, meta }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<SentinelFilters>;
    const industry = (body.industry ?? "").trim();
    const jobType = (body.jobType ?? "").trim();
    const experience = (body.experience ?? "").trim();

    if (!industry || !jobType || !experience) {
      return NextResponse.json(
        {
          error:
            "Missing mandatory fields. Provide industry, jobType, and experience.",
        },
        { status: 400 }
      );
    }

    const filters: SentinelFilters = {
      industry,
      jobType,
      experience,
      location: body.location?.trim(),
      pay: body.pay?.trim(),
      companies: body.companies,
      roles: body.roles,
    };

    const dorkQueries = generateDorkQueries(filters);
    const queryStrings = dorkQueries.map((d) => d.query);

    // Run dork hunt and Google Jobs in parallel (one layer deeper: individual listings with company)
    const [organicResults, googleJobsResults] = await Promise.all([
      executeHunt(queryStrings),
      fetchGoogleJobs(filters),
    ]);
    const rawResults = [...organicResults, ...googleJobsResults];
    const baselineResults = dedupeTagAndFilter(rawResults, experience);

    // Opportunity Intelligence – standardisation & AI summarisation
    const enrichedResults = await standardiseAndSummariseJobs(baselineResults);

    // Load current user's saved profile (for CV-to-JD matching)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let userProfileForMatch: UserProfile | null = null;
    if (user) {
      const { data: row } = await supabase
        .from("user_profiles")
        .select("skills, internships, leadership_positions, projects, others, university")
        .eq("user_id", user.id)
        .maybeSingle();
      if (row) {
        const skills = (row as any).skills ?? "";
        const experienceParts = [
          (row as any).internships,
          (row as any).leadership_positions,
          (row as any).projects,
          (row as any).others,
        ]
          .filter((v) => v != null && v !== "")
          .map((s: any) => String(s).trim())
          .filter(Boolean);
        const experience = experienceParts.join(" | ");
        const education = (row as any).university ?? "";
        userProfileForMatch = {
          skills: skills ?? "",
          experience,
          education,
        };
      }
    }

    const typedResults: SentinelResultItem[] = [];
    for (const r of enrichedResults as (SentinelResultItem & EnrichedJob)[]) {
      let match_score: number | undefined;
      let match_band: "Strong" | "Good" | "Moderate" | "Stretch" | undefined;
      let match_strengths: string[] | undefined;
      let match_gaps: string[] | undefined;
      let match_action_item: string | undefined;

      if (userProfileForMatch) {
        const jobData: JobData = {
          title: r.displayName || r.title,
          company: r.company,
          location: undefined,
          description: r.summary || r.snippet,
          seniorityHint: filters.experience,
          requiredSkills: [],
          niceToHaveSkills: [],
          source: r.source,
          url: r.url,
        };
        try {
          const analysis = await calculateMatchScore(jobData, userProfileForMatch);
          if (analysis) {
            match_score = analysis.score;
            match_band = analysis.band;
            match_strengths = analysis.strengths;
            match_gaps = analysis.gaps;
            match_action_item = analysis.actionItem;
          }
        } catch (e) {
          console.warn("[sentinel] match analyst failed for job", r.url, e);
        }
      }

      typedResults.push({
        ...(r as SentinelResultItem & EnrichedJob),
        prestige_score: prestigeScore(r.company ?? null),
        match_score,
        match_band,
        match_strengths,
        match_gaps,
        match_action_item,
      });
    }
    const resultsByCompany = groupByCompany(typedResults);

    return NextResponse.json({
      results: typedResults,
      resultsByCompany,
      meta: {
        provider: "serpapi",
        queriesCount: dorkQueries.length,
        totalBeforeDedupe: rawResults.length,
        totalAfterDedupe: typedResults.length,
        directCount: typedResults.filter((r) => r.isDirect).length,
        fromGoogleJobs: googleJobsResults.length,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
