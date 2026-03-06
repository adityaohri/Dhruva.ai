import { NextRequest, NextResponse } from "next/server";
import Exa from "exa-js";

const exa = new Exa(process.env.EXA_API_KEY || "");

const LINKEDIN_JOB_PATHS = [
  "/jobs/view/",
  "/jobs/collections/",
  "linkedin.com/jobs",
  "/job-apply/",
];

const POST_PATHS = ["/posts/", "/pulse/", "/feed/update/"];

function isLinkedInPost(url: string): boolean {
  const lower = url.toLowerCase();
  if (!lower.includes("linkedin.com")) return false;
  if (LINKEDIN_JOB_PATHS.some((p) => lower.includes(p))) return false;
  return POST_PATHS.some((p) => lower.includes(p));
}

function cleanSnippet(raw: string): string {
  if (!raw) return "";
  const cleaned = raw
    .replace(/#{1,6}\s+/g, "")
    .replace(/^[\*\-\•]\s+/gm, "")
    .replace(/\[\s*[^\]]{0,30}\]\s*\([^)]+\)/g, "")
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (trimmed.length < 20) return false;
      if (/^(menu|skip|home|about|contact|search)/i.test(trimmed)) return false;
      if (/\*{3,}/.test(trimmed)) return false;
      return true;
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280)
    .replace(/[^.!?]*$/, "")
    .trim();

  return cleaned;
}

function getExperienceTerms(experience: string | undefined | null): string {
  const exp = (experience ?? "").toLowerCase();
  if (exp.includes("fresher") || exp.includes("0-1")) {
    return '"entry level" OR "fresher" OR "fresh graduate" OR "campus" OR "0-1 years"';
  }
  if (exp.includes("1-2")) {
    return '"1-2 years" OR "junior" OR "1+ year"';
  }
  if (exp.includes("2-5")) {
    return '"2-5 years" OR "2+ years" OR "mid level"';
  }
  if (exp.includes("5+")) {
    return '"5+ years" OR "senior" OR "lead"';
  }
  return "";
}

function getJobTypeTerms(jobType: string | undefined | null): string {
  const jt = (jobType ?? "").toLowerCase();
  if (jt.includes("intern")) return '"internship" OR "intern"';
  if (jt.includes("full")) return '"full-time" OR "full time" OR "permanent"';
  if (jt.includes("part")) return '"part-time" OR "part time"';
  if (jt.includes("contract")) return '"contract" OR "contractual"';
  return "";
}

function getRecencyScore(publishedDate: string | null | undefined): number {
  if (!publishedDate) return 0;
  try {
    const posted = new Date(publishedDate);
    const now = new Date();
    const daysAgo =
      (now.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24);

    if (daysAgo <= 1) return 100;
    if (daysAgo <= 3) return 80;
    if (daysAgo <= 7) return 60;
    if (daysAgo <= 30) return 30;
    if (daysAgo <= 90) return 10;
    return 0;
  } catch {
    return 0;
  }
}

function getATSSource(url: string): string {
  const host = (url ?? "").toLowerCase();
  if (host.includes("greenhouse")) return "Greenhouse";
  if (host.includes("lever.co")) return "Lever";
  if (host.includes("workday")) return "Workday";
  if (host.includes("mckinsey")) return "McKinsey Direct";
  if (host.includes("bcg.com")) return "BCG Direct";
  if (host.includes("bain.com")) return "Bain Direct";
  if (host.includes("deloitte")) return "Deloitte Direct";
  if (host.includes("kpmg")) return "KPMG Direct";
  if (host.includes("naukri")) return "Naukri";
  if (host.includes("iimjobs")) return "IIMJobs";
  if (host.includes("instahyre")) return "Instahyre";
  if (host.includes("linkedin")) return "LinkedIn";
  return "Direct";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      industry?: string;
      topCompanies?: string[];
      roleVariants?: string[];
      location?: string;
      jobType?: string;
      experience?: string;
    };

    const industry = (body.industry || "").trim();
    const topCompanies = Array.isArray(body.topCompanies)
      ? body.topCompanies.filter((c) => typeof c === "string" && c.trim().length > 0)
      : [];
    const roleVariants = Array.isArray(body.roleVariants)
      ? body.roleVariants.filter((r) => typeof r === "string" && r.trim().length > 0)
      : [];
    const location = (body.location || "India").trim() || "India";
    const jobType = (body.jobType || "").trim();
    const experience = (body.experience || "").trim();

    if (!industry) {
      return NextResponse.json(
        { error: "industry is required", signals: [] },
        { status: 400 }
      );
    }

    if (!process.env.EXA_API_KEY) {
      return NextResponse.json(
        { error: "EXA_API_KEY is not configured", signals: [] },
        { status: 500 }
      );
    }

    const primaryRole = roleVariants[0] || "analyst";
    const roleGroup = roleVariants.slice(0, 3);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const threeMonthsAgoISODate = sixMonthsAgo.toISOString().split("T")[0];
    const threeMonthsAgoISO = sixMonthsAgo.toISOString();

    const companiesPart = topCompanies.slice(0, 5).join(" OR ");
    const rolesPart = roleGroup.join(" OR ");

    const expTerms = getExperienceTerms(experience);
    const jobTypeTerms = getJobTypeTerms(jobType);
    const locationTerm = location || "India";

    // Broad industry-wide hiring intent — not limited to top companies
    const companyQuery = [
      `("we are hiring" OR "we're hiring" OR "now hiring" OR`,
      `"looking for a" OR "open role" OR "join our team" OR`,
      `"apply now" OR "drop your CV" OR "DM me")`,
      rolesPart,
      locationTerm,
      industry,
    ]
      .filter(Boolean)
      .join(" ");

    // Referral and mid-tier / startup hiring posts
    const roleQuery = [
      `("hiring" OR "referral" OR "open position" OR`,
      `"we need a" OR "know someone" OR "tag someone")`,
      rolesPart,
      locationTerm,
      `(startup OR "series a" OR "series b" OR "growing team" OR`,
      `"fast growing" OR "${industry}")`,
    ]
      .filter(Boolean)
      .join(" ");

    const jobsQueryParts = [
      roleVariants
        .slice(0, 3)
        .map((r) => `"${r}"`)
        .join(" OR "),
      topCompanies
        .slice(0, 6)
        .map((c) => `"${c}"`)
        .join(" OR "),
      expTerms,
      jobTypeTerms,
      locationTerm,
    ].filter(Boolean);

    const jobsQuery = jobsQueryParts.join(" ");

    const [companySearch, roleSearch, jobsSearch, atsSearch] = await Promise.all([
      exa.searchAndContents(companyQuery, {
        type: "auto",
        numResults: 40,
        includeDomains: ["linkedin.com"],
        startPublishedDate: threeMonthsAgoISODate,
        highlights: {
          maxCharacters: 4000,
        },
      } as any),
      exa.searchAndContents(roleQuery, {
        type: "auto",
        numResults: 40,
        includeDomains: ["linkedin.com"],
        startPublishedDate: threeMonthsAgoISODate,
        highlights: {
          maxCharacters: 4000,
        },
      } as any),
      exa.searchAndContents(jobsQuery, {
        type: "auto",
        numResults: 50,
        includeDomains: ["linkedin.com"],
        startPublishedDate: threeMonthsAgoISO,
        highlights: {
          maxCharacters: 4000,
        },
      } as any),
      // Search 4 — ATS platforms and direct company career pages
      exa.searchAndContents(
        [
          roleVariants
            .slice(0, 4)
            .map((r) => `"${r}"`)
            .join(" OR "),
          expTerms ||
            '"entry level" OR "fresher" OR "analyst"',
          jobTypeTerms,
          locationTerm,
        ]
          .filter(Boolean)
          .join(" "),
        {
          type: "auto",
          numResults: 40,
          includeDomains: [
            "greenhouse.io",
            "boards.greenhouse.io",
            "lever.co",
            "jobs.lever.co",
            "myworkdayjobs.com",
            "ashbyhq.com",
            "smartrecruiters.com",
            "jobs.mckinsey.com",
            "careers.bcg.com",
            "careers.bain.com",
            "careers.deloitte.com",
            "careers.kpmg.com",
            "careers.ey.com",
            "careers.google.com",
            "careers.microsoft.com",
            "amazon.jobs",
            "naukri.com",
            "iimjobs.com",
            "instahyre.com",
            "wellfound.com",
            "cutshort.io",
          ],
          startPublishedDate: threeMonthsAgoISO,
          highlights: {
            maxCharacters: 4000,
          },
        } as any
      ),
    ]);

    const search1Results = ((companySearch as any)?.results ?? []) as any[];
    const search2Results = ((roleSearch as any)?.results ?? []) as any[];
    const search3Results = (jobsSearch as any) ?? {};
    const search3List = (search3Results.results ?? []) as any[];
    const search4Results = ((atsSearch as any)?.results ?? []) as any[];

    const linkedInJobResults = search3List.filter((r: any) =>
      LINKEDIN_JOB_PATHS.some((p) => String(r.url).includes(p))
    );

    const linkedInPostResults = search3List.filter((r: any) =>
      POST_PATHS.some((p) => String(r.url).includes(p))
    );

    const allPostSignals = [
      ...search1Results,
      ...search2Results,
      ...linkedInPostResults,
    ].filter((r: any) =>
      r?.url && POST_PATHS.some((p) => String(r.url).includes(p))
    );

    const OPINION_PATTERNS = [
      "just bragged",
      "called bullshit",
      "nobody's saying",
      "hot take",
      "unpopular opinion",
      "went viral",
      "25,000",
      "fired back",
      "comments",
      "reactions to",
      "what nobody tells",
      "the truth about",
    ];

    const hasHiringIntent = (title: string, snippet: string): boolean => {
      const combined = `${title} ${snippet}`.toLowerCase();
      const HIRING_WORDS = [
        "hiring",
        "looking for",
        "open role",
        "open position",
        "join us",
        "apply",
        "referral",
        "vacancy",
        "recruit",
        "we need",
        "opportunity",
        "drop your cv",
        "dm me",
      ];
      return HIRING_WORDS.some((w) => combined.includes(w));
    };

    const filteredPostSignals = allPostSignals.filter((r: any) => {
      const url = String(r.url ?? "").toLowerCase();
      const title = String(r.title ?? "").toLowerCase();
      const highlight =
        Array.isArray(r.highlights) && r.highlights.length > 0
          ? String(r.highlights[0])
          : String((r as any).text ?? "");
      const snippet = cleanSnippet(highlight);
      const combined = `${title} ${snippet}`;

      // Block profile pages — /in/ with no post sub-path
      if (
        url.includes("linkedin.com/in/") &&
        !POST_PATHS.some((p) => url.includes(p))
      ) {
        return false;
      }

      // Block opinion / viral posts
      if (OPINION_PATTERNS.some((p) => combined.includes(p))) return false;

      // Must have hiring intent
      if (!hasHiringIntent(title, snippet)) return false;

      // Must have real snippet content
      if (snippet.length < 60) return false;

      return true;
    });

    const seenSignalUrls = new Set<string>();
    const signals = filteredPostSignals
      .filter((r: any) => {
        if (!r?.url) return false;
        const url = String(r.url);
        if (seenSignalUrls.has(url)) return false;
        seenSignalUrls.add(url);
        return true;
      })
      .map((r: any) => {
        const url = String(r.url);
        const highlight =
          Array.isArray(r.highlights) && r.highlights.length > 0
            ? String(r.highlights[0])
            : String((r as any).text ?? "");
        const publishedDate =
          r.publishedDate || r.published_date || r.date || "";

        return {
          title: String(r.title ?? ""),
          url,
          publishedDate: String(publishedDate || ""),
          snippet: cleanSnippet(highlight),
          source: "LinkedIn",
          bucket: "C" as const,
        };
      });

    const seenJobUrls = new Set<string>();
    const scoredLinkedInJobs = linkedInJobResults
      .filter((r: any) => {
        if (!r?.url) return false;
        const url = String(r.url);
        if (seenJobUrls.has(url)) return false;
        seenJobUrls.add(url);
        return true;
      })
      .map((r: any) => {
        const url = String(r.url);
        const highlight =
          Array.isArray(r.highlights) && r.highlights.length > 0
            ? String(r.highlights[0])
            : String((r as any).text ?? "");
        const publishedDateRaw =
          r.publishedDate || r.published_date || r.date || "";
        const publishedDate = String(publishedDateRaw || "");
        const recencyScore = getRecencyScore(publishedDate || null);

        return {
          title: String(r.title ?? ""),
          url,
          publishedDate,
          snippet: cleanSnippet(highlight),
          source: "LinkedIn",
          bucket: "B" as const,
          recencyScore,
          isFresh: recencyScore >= 60,
        };
      })
      .sort((a, b) => (b.recencyScore ?? 0) - (a.recencyScore ?? 0));

    const CLOSED_JOB_PATTERNS = [
      "no longer accepting",
      "position has been filled",
      "this job is closed",
      "application closed",
      "no longer available",
      "listing has expired",
      "job has expired",
      "this role has been filled",
      "closed to applications",
    ];

    const openLinkedInJobs = scoredLinkedInJobs.filter((job) => {
      const snippet = String(job.snippet ?? "").toLowerCase();
      return !CLOSED_JOB_PATTERNS.some((p) => snippet.includes(p));
    });

    const CLOSED_PATTERNS = [
      "no longer accepting",
      "position has been filled",
      "job is closed",
      "application closed",
      "no longer available",
      "listing has expired",
    ];

    const atsJobResults = search4Results
      .map((r: any) => {
        const url = String(r.url ?? "");
        const highlight =
          Array.isArray(r.highlights) && r.highlights.length > 0
            ? String(r.highlights[0])
            : String((r as any).text ?? "");
        const snippet = cleanSnippet(highlight);
        const publishedDate = String(
          r.publishedDate || r.published_date || r.date || ""
        );
        const recencyScore = getRecencyScore(publishedDate || null);

        return {
          title: String(r.title ?? ""),
          url,
          publishedDate,
          snippet,
          source: getATSSource(url),
          bucket: "A" as const,
          recencyScore,
          isFresh: recencyScore >= 60,
        };
      })
      .filter((job) => {
        const snippet = job.snippet.toLowerCase();
        return !CLOSED_PATTERNS.some((p) => snippet.includes(p));
      });

    return NextResponse.json({
      signals,
      linkedInJobs: [...openLinkedInJobs, ...atsJobResults],
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message, signals: [] }, { status: 500 });
  }
}

