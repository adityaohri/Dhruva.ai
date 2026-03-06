import { NextRequest, NextResponse } from "next/server";
import Exa from "exa-js";
import {
  getTopCompanies,
  getRoleVariants,
  getSignalKeywords,
  getIndustryAliases,
  getIndustrySkills,
  scoreAgainstIndustry,
  type IndustryName,
} from "@/lib/industryKeywords";

const exa = new Exa(process.env.EXA_API_KEY || "");

// Company portals / blogs to exclude (we want news ABOUT them, not BY them)
const PORTAL_DOMAINS = [
  "bcg.com",
  "mckinsey.com",
  "bain.com",
  "deloitte.com",
  "pwc.com",
  "ey.com",
  "kpmg.com",
  "accenture.com",
  "capgemini.com",
  "hdfcbank.com",
  "icicibank.com",
  "axisbank.com",
  "tatacapital.com",
  "infosys.com",
  "wipro.com",
  "tcs.com",
  "hcl.com",
  "techm.com",
];

// Keep existing cleanSnippet helper to normalise snippets
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

const UNIVERSAL_POSITIVE = [
  "funding",
  "raises",
  "raised",
  "series",
  "investment",
  "backed",
  "expands",
  "expansion",
  "new office",
  "new hub",
  "launches",
  "hiring",
  "to hire",
  "headcount",
  "appoints",
  "appointment",
  "joins as",
  "wins contract",
  "awarded",
  "mandate",
  "secures",
  "new client",
  "partnership",
  "joint venture",
  "ipo",
  "valuation",
  "growth",
  "new practice",
  "new centre",
  "new vertical",
];

const NEGATIVE_SIGNALS = [
  "layoff",
  "laid off",
  "job cuts",
  "retrenchment",
  "firing",
  "losses",
  "deficit",
  "bankruptcy",
  "shutdown",
  "winding down",
  "fraud",
  "scam",
  "scandal",
  "arrested",
  "penalty",
  "fine",
  "declining revenue",
  "below expectations",
  "misses target",
];

const INDIA_TERMS = [
  "india",
  "indian",
  "mumbai",
  "delhi",
  "bangalore",
  "bengaluru",
  "hyderabad",
  "pune",
  "chennai",
  "gurgaon",
  "gurugram",
  "noida",
  "kolkata",
  "ahmedabad",
];

const ARTICLE_PATTERNS = [
  "how ",
  "why ",
  "what is",
  "opinion:",
  "analysis:",
  "report:",
  "survey:",
  "the case for",
  "explainer",
  "a guide to",
  "everything you need",
  "deep dive",
  "tokenized",
  "next-gen",
  "the future of",
  "are you ready",
  "is this the",
];

const CATEGORY_PRIORITY: Record<string, number> = {
  funding: 1,
  startup: 2,      // Startup/seed funding — high signal
  expansion: 3,
  hiring: 4,
  emerging: 5,     // Emerging players
  leadership: 6,
  deal: 7,
  skills: 8,       // Industry skills demand
  industry: 9,
};

function getHighlightText(r: any): string {
  if (Array.isArray(r.highlights) && r.highlights.length > 0) {
    return String(r.highlights[0] ?? "");
  }
  return String(r.text ?? "");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      industry: string;
      location?: string;
    };

    const { industry, location = "India" } = body;

    if (!industry) {
      return NextResponse.json(
        { error: "industry is required", signals: [] },
        { status: 400 }
      );
    }

    if (!process.env.EXA_API_KEY) {
      // Soft-fail so the page can still render
      return NextResponse.json({ signals: [] }, { status: 200 });
    }

    const industryName = industry as IndustryName;
    const topCompanies = getTopCompanies(industryName, 20);
    const roleVariants = getRoleVariants(industryName).slice(0, 4);
    const signalKeywords = getSignalKeywords(industryName) ?? [];
    const industryAliases = getIndustryAliases(industryName) ?? [];
    const industrySkills = getIndustrySkills(industryName).slice(0, 6);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoISO = sixMonthsAgo.toISOString();

    const companies_1_6 = topCompanies.slice(0, 6).join(" OR ");
    const companies_7_12 = topCompanies.slice(6, 12).join(" OR ");
    const companies_13_20 = topCompanies.slice(12, 20).join(" OR ");

    const industryLabel = industryAliases[0] ?? industry;

    const repoSignals =
      signalKeywords.slice(0, 8).join(" OR ") || "expansion hiring growth";

    // Skills and roles for emerging company queries
    const skillsQuery = industrySkills.slice(0, 4).map(s => `"${s}"`).join(" OR ");
    const rolesQuery = roleVariants.slice(0, 3).map(r => `"${r}"`).join(" OR ");

    const commonParams = {
      type: "auto" as const,
      category: "news" as const,
      startPublishedDate: sixMonthsAgoISO,
      highlights: { maxCharacters: 3000 },
      excludeDomains: PORTAL_DOMAINS,
      numResults: 30,
    };

    const query1 = `(${companies_1_6}) OR "${industryLabel}" ${location}
("funding" OR "raises" OR "raised" OR "series A" OR "series B" OR "series C" OR "investment" OR "backed" OR "PE investment" OR "venture capital" OR "IPO" OR "capital raise" OR "valuation") 2025 2026`;

    const query2 = `(${companies_7_12}) OR "${industryLabel}" ${location}
("new office" OR "expands" OR "expansion" OR "opens in" OR "launches in" OR "new hub" OR "new practice" OR "new vertical" OR "new centre" OR "new capability" OR "enters India" OR "India operations" OR "sets up" OR "establishes") ${location} 2025 2026`;

    const query3 = `(${companies_1_6}) OR (${companies_7_12}) ${location} ("hiring" OR "to hire" OR "plans to hire" OR "headcount" OR "recruitment drive" OR "campus hiring" OR "lateral hiring" OR "talent acquisition" OR "workforce expansion" OR "adding jobs" OR "creating jobs" OR "job creation") 2025 2026`;

    const query4 = `(${companies_13_20}) OR "${industryLabel}" ${location}
("appoints" OR "appointment" OR "new CEO" OR "new MD" OR "new head" OR "new partner" OR "new director" OR "country head" OR "hires" OR "joins as" OR "strategic partnership" OR "MOU" OR "joint venture") ${location} 2025 2026`;

    const query5 = `(${companies_1_6}) OR "${industryLabel}" ${location} ("wins contract" OR "awarded" OR "mandate" OR "project win" OR "secures deal" OR "new client" OR "government contract" OR "selected as" OR "empanelled" OR "RFP win" OR "bagged order") 2025 2026`;

    const query6 = `"${industryLabel}" ${location} (${repoSignals}) ("hiring" OR "growth" OR "talent" OR "expanding" OR "new roles" OR "jobs" OR "headcount") 2025 2026`;

    // NEW: Emerging/startup company queries (not limited to top 20)
    const query7 = `"${industryLabel}" ${location} ("startup" OR "seed funding" OR "angel investment" OR "early stage" OR "pre-series" OR "bootstrapped" OR "founded" OR "launches" OR "emerges" OR "new player") ("hiring" OR "expansion" OR "team" OR "growing") 2025 2026`;

    const query8 = `${location} (${rolesQuery}) ("new firm" OR "boutique" OR "emerging" OR "fast-growing" OR "disruptor" OR "challenger" OR "unicorn" OR "soonicorn" OR "D2C" OR "B2B SaaS" OR "fintech" OR "edtech" OR "healthtech") ("hiring" OR "raises" OR "expands") 2025 2026`;

    const query9 = `${location} (${skillsQuery}) ("company" OR "firm" OR "startup" OR "venture") ("hiring" OR "looking for" OR "building team" OR "scaling" OR "expanding" OR "new office" OR "headcount") 2025 2026`;

    const settled = await Promise.allSettled([
      exa.searchAndContents(query1, commonParams as any),
      exa.searchAndContents(query2, commonParams as any),
      exa.searchAndContents(query3, { ...commonParams, numResults: 40 } as any),
      exa.searchAndContents(query4, commonParams as any),
      exa.searchAndContents(query5, commonParams as any),
      exa.searchAndContents(query6, commonParams as any),
      // Emerging company queries
      exa.searchAndContents(query7, { ...commonParams, numResults: 35 } as any),
      exa.searchAndContents(query8, { ...commonParams, numResults: 35 } as any),
      exa.searchAndContents(query9, { ...commonParams, numResults: 30 } as any),
    ]);

    const [
      fundingResults,
      expansionResults,
      hiringResults,
      leadershipResults,
      dealResults,
      industryResults,
      startupResults,
      emergingResults,
      skillBasedResults,
    ] = settled.map((res) =>
      res.status === "fulfilled" ? (res.value as any) : { results: [] }
    );

    const tag = (results: any[], category: string, label: string) =>
      (results ?? []).map((r) => ({
        ...r,
        signalCategory: category,
        signalLabel: label,
      }));

    const allRaw: any[] = [
      ...tag(fundingResults.results, "funding", "💰 Funding / Investment"),
      ...tag(
        expansionResults.results,
        "expansion",
        "🏢 Expansion / New Office"
      ),
      ...tag(hiringResults.results, "hiring", "🧑‍💼 Hiring Drive"),
      ...tag(
        leadershipResults.results,
        "leadership",
        "👤 Leadership Appointment"
      ),
      ...tag(dealResults.results, "deal", "📋 Deal / Contract Win"),
      ...tag(
        industryResults.results,
        "industry",
        "📈 Industry Growth Signal"
      ),
      // Emerging company signals
      ...tag(startupResults.results, "startup", "🚀 Startup / Early Stage"),
      ...tag(emergingResults.results, "emerging", "⭐ Emerging Player"),
      ...tag(skillBasedResults.results, "skills", "💡 Industry Skills Demand"),
    ];

    const allPositive = [...UNIVERSAL_POSITIVE, ...signalKeywords];

    const filtered = allRaw
      // Gate 1: hard 6-month ceiling
      .filter((r) => {
        if (!r.publishedDate) return true;
        try {
          return new Date(r.publishedDate) >= sixMonthsAgo;
        } catch {
          return true;
        }
      })
      // Gate 2: Industry relevance check (EXPANDED for emerging companies)
      // Accept results that:
      // - Mention industry name/aliases
      // - Mention top companies
      // - Score positively on industry keywords (roles, skills, signals)
      // - Look like company-specific signals (proper noun + signal verb)
      // - Mention startup/emerging company indicators
      .filter((r) => {
        const rawText = `${r.title ?? ""} ${getHighlightText(r)}`;
        const text = rawText.toLowerCase();

        // Always pass if it mentions the industry or its aliases
        if (industryAliases.some((a) => text.includes(a.toLowerCase())))
          return true;
        if (text.includes(industry.toLowerCase())) return true;

        // Pass if it mentions any of the top companies
        if (topCompanies.some((c) => text.includes(c.toLowerCase())))
          return true;

        // NEW: Pass if it scores positively on industry relevance
        // This catches emerging companies using industry-specific terms
        const industryScore = scoreAgainstIndustry(rawText, industryName);
        if (industryScore >= 8) return true;

        // NEW: Pass if mentions industry skills
        if (industrySkills.some((s) => text.includes(s.toLowerCase())))
          return true;

        // NEW: Pass if mentions role variants
        if (roleVariants.some((r) => text.includes(r.toLowerCase())))
          return true;

        // NEW: Pass if it's a startup/emerging company signal category
        // (these queries are specifically for new companies)
        if (["startup", "emerging", "skills"].includes(r.signalCategory))
          return true;

        // Pass if it looks like a company-specific signal:
        // Has a proper noun followed by a signal word
        const HAS_COMPANY_SIGNAL =
          /[A-Z][a-zA-Z&\s]{2,30}\s(raises|expands|hires|appoints|wins|launches|opens|secures|acquires|partners|backs|founded|launched|started)/;
        if (HAS_COMPANY_SIGNAL.test(rawText)) return true;

        // NEW: Pass if mentions startup/emerging keywords
        const EMERGING_KEYWORDS = [
          "startup", "seed", "angel", "pre-series", "early stage",
          "bootstrapped", "founded", "new venture", "emerging",
          "disruptor", "challenger", "unicorn", "soonicorn",
          "fintech", "edtech", "healthtech", "deeptech", "agritech",
          "cleantech", "d2c", "b2b saas", "b2c", "boutique"
        ];
        if (EMERGING_KEYWORDS.some((kw) => text.includes(kw))) return true;

        return false;
      })
      // Gate 3: positive signal confirmation
      .filter((r) => {
        const text = `${r.title ?? ""} ${getHighlightText(r)}`.toLowerCase();
        return allPositive.some((kw) => text.includes(kw.toLowerCase()));
      })
      // Gate 4: negative signal block
      .filter((r) => {
        const text = `${r.title ?? ""} ${getHighlightText(r)}`.toLowerCase();
        return !NEGATIVE_SIGNALS.some((kw) => text.includes(kw.toLowerCase()));
      })
      // Gate 5: India relevance
      .filter((r) => {
        const text = `${r.title ?? ""} ${getHighlightText(r)}`.toLowerCase();
        const urlLower = String(r.url ?? "").toLowerCase();
        return (
          INDIA_TERMS.some((t) => text.includes(t)) ||
          urlLower.includes("india") ||
          urlLower.includes(".in/") ||
          urlLower.includes("indiatimes") ||
          urlLower.includes("yourstory") ||
          urlLower.includes("inc42") ||
          urlLower.includes("entrackr") ||
          urlLower.includes("vccircle") ||
          urlLower.includes("livemint") ||
          urlLower.includes("business-standard") ||
          urlLower.includes("economictimes")
        );
      })
      // Gate 6: editorial / opinion block
      .filter((r) => {
        const titleLower = String(r.title ?? "").toLowerCase();
        return !ARTICLE_PATTERNS.some(
          (p) => titleLower.startsWith(p) || titleLower.includes(p)
        );
      });

    function extractCompanyFromResult(r: any): string | null {
      const title = String(r.title ?? "");
      const text = `${title} ${getHighlightText(r)}`;

      // PRIORITY 1: Extract company from the article TITLE first
      // This is more reliable than matching against topCompanies which can false-match
      
      // Pattern A: "CompanyName Raises/Secures $X" (most common funding headline)
      const fundingHeadline = title.match(
        /^([A-Z][a-zA-Z0-9&\-\s]{2,35}?)\s+(?:raises|secures|closes|bags|gets|lands)\s+(?:\$|₹|Rs\.?|INR|USD|Mn|Cr|million|crore)/i
      );
      if (fundingHeadline?.[1]?.trim()) {
        const name = fundingHeadline[1].trim();
        // Skip generic phrases
        if (!/^(the|a|an|indian|india|mumbai|startup|company|firm)\s/i.test(name)) {
          return name;
        }
      }

      // Pattern B: "CompanyName, a/an [type] startup/firm" 
      const startupMatch = title.match(
        /^([A-Z][a-zA-Z0-9&\-\s]{2,30}?),?\s+(?:a|an|the)\s+(?:[\w\s\-]{1,25})?(?:startup|firm|company|venture|platform|consultancy)/i
      );
      if (startupMatch?.[1]?.trim()) {
        const name = startupMatch[1].trim();
        if (!/^(the|a|an|indian|india|mumbai)\s/i.test(name)) {
          return name;
        }
      }

      // Pattern C: "CompanyName expands/hires/launches/appoints/wins"
      const actionHeadline = title.match(
        /^([A-Z][a-zA-Z0-9&\-\s]{2,30}?)\s+(?:expands|hires|launches|appoints|wins|opens|acquires|partners|announces|to\s+hire|plans\s+to)/i
      );
      if (actionHeadline?.[1]?.trim()) {
        const name = actionHeadline[1].trim();
        if (!/^(the|a|an|indian|india|mumbai|startup)\s/i.test(name)) {
          return name;
        }
      }

      // Pattern D: "CompanyName's [something]" or "CompanyName: [something]"
      const possessiveMatch = title.match(
        /^([A-Z][a-zA-Z0-9&\-]{2,25})(?:'s|'s|:)\s/
      );
      if (possessiveMatch?.[1]?.trim()) {
        return possessiveMatch[1].trim();
      }

      // Pattern E: Look for "Based" pattern - "Mumbai-Based CompanyName"
      const basedMatch = title.match(
        /(?:mumbai|delhi|bangalore|bengaluru|hyderabad|pune|chennai|india)[- ]based\s+([A-Z][a-zA-Z0-9&\-\s]{2,30}?)(?:\s+secures|\s+raises|\s+gets|\s+bags|\s+launches)/i
      );
      if (basedMatch?.[1]?.trim()) {
        return basedMatch[1].trim();
      }

      // PRIORITY 2: Check snippet for company name patterns
      const snippetCompany = text.match(
        /([A-Z][a-zA-Z0-9&\-]{3,25})\s+(?:raises|secures|closes|bags|gets)\s+(?:\$|₹|Rs\.?|INR|USD)/i
      );
      if (snippetCompany?.[1]?.trim()) {
        const name = snippetCompany[1].trim();
        // Avoid generic words
        if (!/^(The|This|That|Their|Company|Firm|Startup|India|Indian)$/i.test(name)) {
          return name;
        }
      }

      // PRIORITY 3: Only NOW check against known top companies
      // Use word boundary matching to avoid false positives
      for (const company of topCompanies) {
        // Create a word-boundary regex for the company name
        const escapedCompany = company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const companyRegex = new RegExp(`\\b${escapedCompany}\\b`, 'i');
        
        // Only match if it's a prominent mention (in title or first 200 chars)
        const prominentText = `${title} ${getHighlightText(r).slice(0, 200)}`;
        if (companyRegex.test(prominentText)) {
          // Extra check: the title should be ABOUT this company, not just mentioning it
          // Skip if the title clearly starts with a different company name
          const titleStart = title.slice(0, 40);
          const startsWithOther = /^[A-Z][a-zA-Z0-9&\-]{3,20}\s+(raises|secures|expands|hires|launches)/i.test(titleStart);
          if (!startsWithOther || titleStart.toLowerCase().includes(company.toLowerCase())) {
            return company;
          }
        }
      }

      // PRIORITY 4: Fallback - extract first capitalized phrase from title
      const fallbackMatch = title.match(/^([A-Z][a-zA-Z0-9&\-\s]{3,25}?)(?:\s|,|:|\.|$)/);
      if (fallbackMatch?.[1]?.trim()) {
        const name = fallbackMatch[1].trim();
        // Skip generic/junk starts
        if (!/^(The|A|An|Indian|India|Mumbai|New|How|Why|What|This|These|Top|Best)\s/i.test(name) && name.length > 3) {
          return name;
        }
      }

      return null;
    }

    const companyMap = new Map<string, any>();
    for (const r of filtered) {
      const company = extractCompanyFromResult(r);
      const key = (company ?? String(r.url ?? "")).toLowerCase();
      const existing = companyMap.get(key);
      if (!existing) {
        companyMap.set(key, r);
      } else {
        const newPriority = CATEGORY_PRIORITY[r.signalCategory] ?? 99;
        const existingPriority =
          CATEGORY_PRIORITY[existing.signalCategory] ?? 99;
        if (newPriority < existingPriority) {
          companyMap.set(key, r);
        }
      }
    }

    let deduplicated = Array.from(companyMap.values());

    let sorted = deduplicated.sort((a, b) => {
      const pa = CATEGORY_PRIORITY[a.signalCategory] ?? 99;
      const pb = CATEGORY_PRIORITY[b.signalCategory] ?? 99;
      if (pa !== pb) return pa - pb;
      const da = a.publishedDate
        ? new Date(a.publishedDate).getTime()
        : 0;
      const db = b.publishedDate
        ? new Date(b.publishedDate).getTime()
        : 0;
      return db - da;
    });

    // Fallback: relax company gate if we have too few
    if (sorted.length < 20) {
      const fallback = allRaw
        .filter((r) => {
          // Gate 1
          if (r.publishedDate) {
            try {
              if (new Date(r.publishedDate) < sixMonthsAgo) return false;
            } catch {
              // ignore
            }
          }
          // Gate 3
          const text = `${r.title ?? ""} ${getHighlightText(r)}`.toLowerCase();
          if (!allPositive.some((kw) => text.includes(kw.toLowerCase()))) {
            return false;
          }
          // Gate 4
          if (NEGATIVE_SIGNALS.some((kw) => text.includes(kw.toLowerCase()))) {
            return false;
          }
          // Gate 5
          const urlLower = String(r.url ?? "").toLowerCase();
          if (
            !(
              INDIA_TERMS.some((t) => text.includes(t)) ||
              urlLower.includes("india") ||
              urlLower.includes(".in/") ||
              urlLower.includes("indiatimes") ||
              urlLower.includes("yourstory") ||
              urlLower.includes("inc42") ||
              urlLower.includes("entrackr") ||
              urlLower.includes("vccircle") ||
              urlLower.includes("livemint") ||
              urlLower.includes("business-standard") ||
              urlLower.includes("economictimes")
            )
          ) {
            return false;
          }
          // Gate 6
          const titleLower = String(r.title ?? "").toLowerCase();
          if (
            ARTICLE_PATTERNS.some(
              (p) => titleLower.startsWith(p) || titleLower.includes(p)
            )
          ) {
            return false;
          }
          return !sorted.some((f) => f.url === r.url);
        })
        .sort((a, b) => {
          const pa = CATEGORY_PRIORITY[a.signalCategory] ?? 99;
          const pb = CATEGORY_PRIORITY[b.signalCategory] ?? 99;
          if (pa !== pb) return pa - pb;
          const da = a.publishedDate
            ? new Date(a.publishedDate).getTime()
            : 0;
          const db = b.publishedDate
            ? new Date(b.publishedDate).getTime()
            : 0;
          return db - da;
        });
      sorted = [...sorted, ...fallback].slice(0, 60);
    } else {
      sorted = sorted.slice(0, 60);
    }

    // FINAL PASS: Strict company-level deduplication
    // Ensure each company name only appears ONCE in the final results
    const finalCompanySeen = new Set<string>();
    const finalDeduped: typeof sorted = [];
    for (const r of sorted) {
      const companyName = extractCompanyFromResult(r);
      const companyKey = (companyName ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
      
      // Skip if we've already seen this company (unless company is empty)
      if (companyKey && companyKey.length > 2 && finalCompanySeen.has(companyKey)) {
        continue;
      }
      
      if (companyKey && companyKey.length > 2) {
        finalCompanySeen.add(companyKey);
      }
      
      finalDeduped.push(r);
    }
    
    sorted = finalDeduped;

    const signals = sorted.map((r) => {
      const url = String(r.url ?? "");
      let host = "";
      try {
        host = new URL(url).hostname.replace(/^www\./i, "");
      } catch {
        host = "";
      }

      const companyName = extractCompanyFromResult(r) ?? "";
      const publishedDate = r.publishedDate ?? "";

      const postedAgo =
        publishedDate &&
        (() => {
          const days = Math.floor(
            (Date.now() - new Date(publishedDate).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          if (days === 0) return "Today";
          if (days <= 7) return `${days}d ago`;
          if (days <= 30) return `${Math.floor(days / 7)}w ago`;
          return `${Math.floor(days / 30)}mo ago`;
        })();

      return {
        title: String(r.title ?? ""),
        url,
        publishedDate,
        snippet: cleanSnippet(getHighlightText(r)),
        source: host,
        signalCategory: r.signalCategory as string,
        signalLabel: r.signalLabel as string,
        companyName,
        postedAgo: (postedAgo as string | null) ?? null,
      };
    });

    return NextResponse.json({ signals });
  } catch {
    return NextResponse.json({ signals: [] }, { status: 200 });
  }
}


