import { NextRequest, NextResponse } from "next/server";
import {
  generateDorkQueries,
  executeHunt,
  type SentinelFilters,
} from "@/lib/services/sentinel";

/**
 * Temporary test route for Sentinel (Opportunity Intelligence Day 1).
 * POST with body: { industry, jobType, experience, location?, pay?, companies?, roles? }
 * Returns raw JSON: { dorkQueries, huntResults, error? } so you can verify dorks.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SentinelFilters;
    const industry = body.industry ?? "Consulting";
    const jobType = body.jobType ?? "Consultant";
    const experience = body.experience ?? "0-2 years";

    const filters: SentinelFilters = {
      industry,
      jobType,
      experience,
      location: body.location,
      pay: body.pay,
      companies: body.companies,
      roles: body.roles,
    };

    const dorkQueries = generateDorkQueries(filters);
    const queryStrings = dorkQueries.map((d) => d.query);
    const huntResults = await executeHunt(queryStrings);

    return NextResponse.json({
      filters,
      dorkQueries,
      huntResults,
      meta: {
        queriesCount: dorkQueries.length,
        resultsCount: huntResults.length,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: message, dorkQueries: null, huntResults: null },
      { status: 500 }
    );
  }
}

/**
 * GET with query params for quick test: ?industry=X&jobType=Y&experience=Z
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filters: SentinelFilters = {
    industry: searchParams.get("industry") ?? "Consulting",
    jobType: searchParams.get("jobType") ?? "Consultant",
    experience: searchParams.get("experience") ?? "0-2 years",
    location: searchParams.get("location") ?? undefined,
    pay: searchParams.get("pay") ?? undefined,
    companies: searchParams.get("companies")?.split(",").map((s) => s.trim()) ?? undefined,
    roles: searchParams.get("roles")?.split(",").map((s) => s.trim()) ?? undefined,
  };

  try {
    const dorkQueries = generateDorkQueries(filters);
    const queryStrings = dorkQueries.map((d) => d.query);
    const huntResults = await executeHunt(queryStrings);

    return NextResponse.json({
      filters,
      dorkQueries,
      huntResults,
      meta: {
        queriesCount: dorkQueries.length,
        resultsCount: huntResults.length,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: message, dorkQueries: null, huntResults: null },
      { status: 500 }
    );
  }
}
