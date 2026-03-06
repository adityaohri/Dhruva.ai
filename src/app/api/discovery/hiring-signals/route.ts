import { NextRequest, NextResponse } from "next/server";
import Exa from "exa-js";

const exa = new Exa(process.env.EXA_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      industry?: string;
      topCompanies?: string[];
      roleVariants?: string[];
      location?: string;
    };

    const industry = (body.industry || "").trim();
    const topCompanies = Array.isArray(body.topCompanies)
      ? body.topCompanies.filter((c) => typeof c === "string" && c.trim().length > 0)
      : [];
    const roleVariants = Array.isArray(body.roleVariants)
      ? body.roleVariants.filter((r) => typeof r === "string" && r.trim().length > 0)
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

    const primaryRole = roleVariants[0] || "analyst";
    const roleGroup = roleVariants.slice(0, 3);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const startPublishedDate = sixMonthsAgo.toISOString().split("T")[0];

    const companiesPart = topCompanies.slice(0, 5).join(" OR ");
    const rolesPart = roleGroup.join(" OR ");

    const companyQuery = `${companiesPart} hiring ${primaryRole} ${location} open roles`;

    const roleQuery = `${rolesPart} hiring ${location} referral "we are looking for" OR "open roles" OR "join our team"`;

    const [companySearch, roleSearch] = await Promise.all([
      exa.search(companyQuery, {
        type: "auto",
        numResults: 20,
        includeDomains: ["linkedin.com"],
        startPublishedDate,
        contents: {
          highlights: {
            maxCharacters: 4000,
          },
        },
      } as any),
      exa.search(roleQuery, {
        type: "auto",
        numResults: 20,
        includeDomains: ["linkedin.com"],
        startPublishedDate,
        contents: {
          highlights: {
            maxCharacters: 4000,
          },
        },
      } as any),
    ]);

    const allResults = [
      ...((companySearch as any)?.results ?? []),
      ...((roleSearch as any)?.results ?? []),
    ];

    const seenUrls = new Set<string>();
    const signals = allResults
      .filter((r: any) => {
        if (!r?.url) return false;
        const url = String(r.url);
        if (seenUrls.has(url)) return false;
        seenUrls.add(url);
        return true;
      })
      .map((r: any) => {
        const url = String(r.url);
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
          source: "LinkedIn",
        };
      });

    return NextResponse.json({ signals });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message, signals: [] }, { status: 500 });
  }
}

