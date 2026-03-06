import { NextRequest, NextResponse } from "next/server";
import Exa from "exa-js";

const exa = new Exa(process.env.EXA_API_KEY || "");

const JUNK_DOMAINS = [
  // Indian business/general news
  "techcrunch.com",
  "financialexpress.com",
  "thehindubusinessline.com",
  "business-standard.com",
  "globenewswire.com",
  "economictimes.com",
  "livemint.com",
  "moneycontrol.com",
  "yourstory.com",
  "inc42.com",
  "entrackr.com",
  "reuters.com",
  "bloomberg.com",
  "forbes.com",
  "timesofindia.com",
  "ndtv.com",
  "thehindu.com",
  "businesstoday.in",
  "peoplematters.in",
  "indiatoday.in",
  "scroll.in",
  "thewire.in",
  "theprint.in",
  "outlookindia.com",
  "hindustantimes.com",
  "deccanherald.com",
  "vccircle.com",
  "dealstreetasia.com",
  "analyticsindiamag.com",
  "cnbc.com",
  "cnbctv18.com",
  "ft.com",
  "wsj.com",
  "shrm.org",
  "hbr.org",
  "apnews.com",
  "afr.com",
  // Consulting-specific news aggregators
  "consultancy.in",
  "consultancy.eu",
  "consultancy.uk",
  "consultancy.asia",
  "consultancy.com",
  "consulting.us",
  // Wire services and PR
  "prnewswire.com",
  "businesswire.com",
  "newswire.com",
  "accesswire.com",
  "einpresswire.com",
  // India news (additional)
  "dnaindia.com",
  "thehansindia.com",
  "knocksense.com",
  "apnnews.com",
  "odishatv.in",
  "zeebiz.com",
  "wionews.com",
  "aninews.in",
  "uniindia.com",
  // General content / opinion
  "medium.com",
  "substack.com",
  "quora.com",
  "reddit.com",
  "wikipedia.org",
];

const POSITIVE_KEYWORDS = [
  "funding",
  "raises",
  "raised",
  "series",
  "new office",
  "expands",
  "expansion",
  "hiring",
  "to hire",
  "headcount",
  "appoints",
  "launches",
  "new practice",
  "new hub",
  "investment",
  "backed",
  "opens",
];

const NEGATIVE_KEYWORDS = [
  "layoff",
  "laid off",
  "job cuts",
  "retrenchment",
  "firing",
  "losses",
  "deficit",
  "bankruptcy",
  "shutdown",
  "declining",
];

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      industry?: string;
      topCompanies?: string[];
      location?: string;
    };

    const industry = (body.industry || "").trim();
    const topCompanies = Array.isArray(body.topCompanies)
      ? body.topCompanies.filter((c) => typeof c === "string" && c.trim().length > 0)
      : [];
    const location = (body.location || "India").trim() || "India";

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

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const startPublishedDate = sixMonthsAgo.toISOString().split("T")[0];

    const industryQuery = `${industry} company ${location} funding expansion hiring new office 2025 2026`;
    const companiesPart = topCompanies.slice(0, 6).join(" OR ");
    const companyQuery = companiesPart
      ? `${companiesPart} hiring expansion funding ${location} 2025 2026`
      : industryQuery;

    const [industrySearch, companySearch] = await Promise.all([
      exa.search(industryQuery, {
        type: "auto",
        numResults: 15,
        category: "news",
        startPublishedDate,
        excludeDomains: JUNK_DOMAINS,
        contents: {
          highlights: {
            maxCharacters: 4000,
          },
        },
      } as any),
      exa.search(companyQuery, {
        type: "auto",
        numResults: 15,
        category: "news",
        startPublishedDate,
        excludeDomains: JUNK_DOMAINS,
        contents: {
          highlights: {
            maxCharacters: 4000,
          },
        },
      } as any),
    ]);

    const allResults = [
      ...((industrySearch as any)?.results ?? []),
      ...((companySearch as any)?.results ?? []),
    ];

    const seenUrls = new Set<string>();
    const signals = allResults
      .filter((r: any) => {
        if (!r?.url) return false;
        const url = String(r.url);
        if (seenUrls.has(url)) return false;

        const title = String(r.title ?? "");
        const highlight = Array.isArray(r.highlights) && r.highlights.length > 0
          ? String(r.highlights[0])
          : "";

        const text = `${title} ${highlight}`.toLowerCase();
        const hasPositive = POSITIVE_KEYWORDS.some((kw) =>
          text.includes(kw.toLowerCase())
        );
        const hasNegative = NEGATIVE_KEYWORDS.some((kw) =>
          text.includes(kw.toLowerCase())
        );

        if (!hasPositive || hasNegative) return false;

        seenUrls.add(url);
        return true;
      })
      .map((r: any) => {
        const url = String(r.url);
        let host = "";
        try {
          host = new URL(url).hostname.replace(/^www\./i, "");
        } catch {
          host = "";
        }

        const highlight = Array.isArray(r.highlights) && r.highlights.length > 0
          ? String(r.highlights[0])
          : "";

        const publishedDate =
          r.publishedDate || r.published_date || r.date || "";

        return {
          title: String(r.title ?? ""),
          url,
          publishedDate: String(publishedDate || ""),
          snippet: highlight,
          source: host,
        };
      });

    return NextResponse.json({ signals });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message, signals: [] }, { status: 500 });
  }
}

