import { NextRequest, NextResponse } from "next/server";

type JSearchProvider = "openwebninja" | "rapidapi";

interface JSearchConfig {
  apiKey: string;
  baseUrl: string;
  provider: JSearchProvider;
}

function getJSearchConfig(): JSearchConfig | null {
  // Check all possible env var names
  const openWebNinjaKey =
    process.env.OPENWEBNINJA_API_KEY?.trim() ||
    process.env.JSEARCH_API_KEY?.trim() ||
    "";
  const rapidApiKey = process.env.RAPIDAPI_KEY?.trim() || "";

  console.log("[jsearch] Config check - JSEARCH_API_KEY exists:", Boolean(process.env.JSEARCH_API_KEY));
  console.log("[jsearch] Config check - OPENWEBNINJA_API_KEY exists:", Boolean(process.env.OPENWEBNINJA_API_KEY));
  console.log("[jsearch] Config check - RAPIDAPI_KEY exists:", Boolean(process.env.RAPIDAPI_KEY));

  // If user explicitly set JSEARCH_PROVIDER, use that
  const providerHint = (process.env.JSEARCH_PROVIDER ?? "").toLowerCase();

  if (providerHint === "rapidapi" && rapidApiKey) {
    console.log("[jsearch] Using RapidAPI (explicit)");
    return {
      apiKey: rapidApiKey,
      baseUrl: "https://jsearch.p.rapidapi.com/search",
      provider: "rapidapi",
    };
  }

  if (providerHint === "openwebninja" && openWebNinjaKey) {
    console.log("[jsearch] Using OpenWebNinja (explicit)");
    return {
      apiKey: openWebNinjaKey,
      baseUrl: "https://api.openwebninja.com/jsearch/search",
      provider: "openwebninja",
    };
  }

  // Auto-detect: prefer OpenWeb Ninja if key is set
  if (openWebNinjaKey) {
    console.log("[jsearch] Using OpenWebNinja (auto-detected)");
    return {
      apiKey: openWebNinjaKey,
      baseUrl: "https://api.openwebninja.com/jsearch/search",
      provider: "openwebninja",
    };
  }

  if (rapidApiKey) {
    console.log("[jsearch] Using RapidAPI (auto-detected)");
    return {
      apiKey: rapidApiKey,
      baseUrl: "https://jsearch.p.rapidapi.com/search",
      provider: "rapidapi",
    };
  }

  console.log("[jsearch] No API key found!");
  return null;
}

function getExperienceTerms(experience: string): string {
  const exp = (experience ?? "").toLowerCase();
  if (exp.includes("fresher") || exp.includes("0-1")) {
    return "entry level fresher fresh graduate";
  }
  if (exp.includes("1-2")) return "junior 1-2 years";
  if (exp.includes("2-5")) return "mid level 2-5 years";
  if (exp.includes("5+")) return "senior lead 5 years";
  return "";
}

function getJobTypeParam(jobType: string): string {
  const jt = (jobType ?? "").toLowerCase();
  if (jt.includes("intern")) return "INTERN";
  if (jt.includes("full")) return "FULLTIME";
  if (jt.includes("part")) return "PARTTIME";
  if (jt.includes("contract")) return "CONTRACTOR";
  return "FULLTIME";
}

async function jsearchRequest(
  config: JSearchConfig,
  query: string,
  employmentType: string
): Promise<any[]> {
  const url = new URL(config.baseUrl);
  url.searchParams.set("query", query);
  url.searchParams.set("num_pages", "3");
  url.searchParams.set("date_posted", "month");
  url.searchParams.set("employment_types", employmentType);
  url.searchParams.set("country", "IN");

  // Build headers based on provider
  const headers: Record<string, string> =
    config.provider === "openwebninja"
      ? { "x-api-key": config.apiKey }
      : {
          "X-RapidAPI-Key": config.apiKey,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        };

  console.log("[jsearch] Making request to:", url.toString());
  console.log("[jsearch] Provider:", config.provider);
  console.log("[jsearch] API Key prefix:", config.apiKey.slice(0, 10) + "...");

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers,
      cache: "no-store",
    });

    console.log("[jsearch] Response status:", res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.warn("[jsearch] request failed", res.status, errorText);
      return [];
    }

    const json = (await res.json()) as { data?: any[] };
    console.log("[jsearch] Results count:", json.data?.length ?? 0);
    return json.data ?? [];
  } catch (e) {
    console.warn("[jsearch] request error", e);
    return [];
  }
}

export async function POST(req: NextRequest) {
  const config = getJSearchConfig();
  const headers = new Headers();
  headers.set("X-JSearch-Configured", config ? "true" : "false");
  headers.set("X-JSearch-Provider", config?.provider ?? "none");

  try {
    const body = (await req.json()) as {
      industry: string;
      roleVariants: string[];
      experience: string;
      jobType: string;
      location: string;
      topCompanies: string[];
    };

    if (!config) {
      console.warn(
        "[jsearch] No API key: set JSEARCH_API_KEY (OpenWeb Ninja) or RAPIDAPI_KEY in env (and redeploy on Vercel)"
      );
      return NextResponse.json(
        {
          jobs: [],
          _debug:
            "Set JSEARCH_API_KEY (for OpenWeb Ninja) or RAPIDAPI_KEY (for RapidAPI) in server env",
        },
        { status: 200, headers }
      );
    }

    const industry = (body.industry ?? "").trim();
    const roleVariants = Array.isArray(body.roleVariants)
      ? body.roleVariants.filter((r) => typeof r === "string" && r.trim().length > 0)
      : [];
    const experience = body.experience ?? "";
    const jobType = body.jobType ?? "";
    const location = (body.location || "India").trim() || "India";
    const topCompanies = Array.isArray(body.topCompanies)
      ? body.topCompanies.filter((c) => typeof c === "string" && c.trim().length > 0)
      : [];

    const locationTerm = location || "India";
    const expTerms = getExperienceTerms(experience);
    const employmentType = getJobTypeParam(jobType);

    const primaryRole = roleVariants[0] || industry;
    const secondaryRole = roleVariants[1] || primaryRole;

    const query1Parts = [primaryRole, expTerms, locationTerm].filter(Boolean);
    const query1 = query1Parts.join(" ");

    const companiesStr = topCompanies.slice(0, 4).join(" OR ");
    const query2Parts = [`(${companiesStr})`, primaryRole, locationTerm].filter(
      Boolean
    );
    const query2 = query2Parts.join(" ");

    const query3Parts = [secondaryRole, expTerms, locationTerm].filter(Boolean);
    const query3 = query3Parts.join(" ");

    const [data1, data2, data3] = await Promise.all([
      jsearchRequest(config, query1, employmentType),
      jsearchRequest(config, query2, employmentType),
      jsearchRequest(config, query3, employmentType),
    ]);

    const combined = [...data1, ...data2, ...data3];
    const rawCount = combined.length;

    const dedupedByUrl: any[] = [];
    const seenApplyLinks = new Set<string>();
    for (const job of combined) {
      const applyLink = String(job.job_apply_link ?? "").trim();
      if (!applyLink) continue;
      if (seenApplyLinks.has(applyLink)) continue;
      seenApplyLinks.add(applyLink);
      dedupedByUrl.push(job);
    }

    const now = Date.now();

    const CLOSED_JOB_PATTERNS = [
      "no longer accepting",
      "position has been filled",
      "application closed",
      "no longer available",
      "job has been closed",
      "closed or removed",
      "taken down",
      "job not found",
      "listing has expired",
      "removed by the administrator",
    ];

    const SENIOR_INDICATORS = [
      "3+ years",
      "5+ years",
      "7+ years",
      "10+ years",
      "senior manager",
      "associate director",
      "director",
      "minimum 3 years",
      "mtech mandatory",
    ];

    const expLower = (experience ?? "").toLowerCase();

    const filtered = dedupedByUrl.filter((job) => {
      const desc: string = String(job.job_description ?? "");

      const expiry = job.job_offer_expiration_datetime_utc;
      if (expiry) {
        const expiryTime = Date.parse(expiry);
        if (!Number.isNaN(expiryTime) && expiryTime < now) {
          return false;
        }
      }

      const descLower = desc.toLowerCase();
      if (
        CLOSED_JOB_PATTERNS.some((p) =>
          descLower.includes(p.toLowerCase())
        )
      ) {
        return false;
      }

      const jobCountry = String(job.job_country ?? "");
      const jobCity = String(job.job_city ?? "");
      const first200 = desc.slice(0, 200);
      const hasIndia =
        jobCountry === "IN" ||
        /india/i.test(jobCity) ||
        /india/i.test(first200);
      if (!hasIndia) return false;

      if (expLower.includes("fresher") || expLower.includes("0-1")) {
        const combinedText = `${job.job_title ?? ""} ${desc}`
          .toLowerCase()
          .slice(0, 500);
        if (SENIOR_INDICATORS.some((s) => combinedText.includes(s.toLowerCase()))) {
          return false;
        }
      }

      const textToCheck = `${job.job_title ?? ""} ${desc}`
        .toLowerCase()
        .slice(0, 300);
      const hasRoleMatch =
        roleVariants.some((r) =>
          textToCheck.includes(String(r).toLowerCase())
        ) || textToCheck.includes(industry.toLowerCase());
      if (!hasRoleMatch) return false;

      return true;
    });

    const afterFilters = filtered.length;
    if (rawCount === 0) {
      console.warn("[jsearch] External API returned 0 results for all 3 queries. Check query terms and API key validity.");
    } else if (afterFilters === 0) {
      console.warn("[jsearch] All", rawCount, "raw results were filtered out (India/closed/experience/industry).");
    }

    const jobs = filtered.map((job: any) => {
      const rawDesc: string = String(job.job_description ?? "");
      const snippet = rawDesc
        .slice(0, 280)
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const posted = job.job_posted_at_datetime_utc as string | undefined;

      const recencyScore = (() => {
        if (!posted) return 0;
        const postedTime = Date.parse(posted);
        if (Number.isNaN(postedTime)) return 0;
        const days = Math.floor((Date.now() - postedTime) / (1000 * 60 * 60 * 24));
        if (days <= 1) return 100;
        if (days <= 3) return 80;
        if (days <= 7) return 60;
        if (days <= 30) return 30;
        return 10;
      })();

      const isFresh = (() => {
        if (!posted) return false;
        const postedTime = Date.parse(posted);
        if (Number.isNaN(postedTime)) return false;
        const days = Math.floor((Date.now() - postedTime) / (1000 * 60 * 60 * 24));
        return days <= 7;
      })();

      const posted_at = (() => {
        if (!posted) return null;
        const postedTime = Date.parse(posted);
        if (Number.isNaN(postedTime)) return null;
        const days = Math.floor((Date.now() - postedTime) / (1000 * 60 * 60 * 24));
        if (days === 0) return "Today";
        if (days === 1) return "Yesterday";
        if (days <= 7) return `${days} days ago`;
        if (days <= 30) return `${Math.floor(days / 7)} weeks ago`;
        return `${Math.floor(days / 30)} months ago`;
      })();

      const city = String(job.job_city ?? "");
      const country = String(job.job_country ?? "");
      const locationDisplay = city
        ? `${city}${country === "IN" ? ", India" : ""}`
        : "India";

      return {
        title: job.job_title ?? "",
        company: job.employer_name ?? null,
        url: job.job_apply_link ?? "",
        snippet,
        source: job.job_publisher || "JSearch",
        publishedDate: posted ?? "",
        location: locationDisplay,
        bucket: "B" as const,
        isVerified: true,
        isDirect: Boolean(job.job_apply_is_direct),
        recencyScore,
        isFresh,
        posted_at,
      };
    });

    // Always include debug meta for troubleshooting
    const payload = {
      jobs,
      _meta: {
        raw: rawCount,
        afterDedup: dedupedByUrl.length,
        afterFilters,
        finalCount: jobs.length,
        queries: [query1.slice(0, 50), query2.slice(0, 50), query3.slice(0, 50)],
      },
    };
    
    console.log("[jsearch] Final response:", {
      raw: rawCount,
      afterDedup: dedupedByUrl.length,
      afterFilters,
      finalJobs: jobs.length,
    });
    
    return NextResponse.json(payload, { headers });
  } catch (e: unknown) {
    console.warn("[jsearch] handler error", e);
    return NextResponse.json({ jobs: [] }, { status: 200, headers });
  }
}

