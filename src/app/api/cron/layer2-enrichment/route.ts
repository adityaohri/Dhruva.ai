import { NextResponse } from "next/server";
import { backfillSignalEnrichment as backfillConsulting } from "@/lib/layer2/scraper";
import { backfillSignalEnrichment as backfillIB } from "@/lib/layer2/ib/scraper";

export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const industry = url.searchParams.get("industry") ?? "consulting";
  const maxRowsParam = Number(url.searchParams.get("maxRows") ?? "2000");
  const maxRows = Number.isFinite(maxRowsParam)
    ? Math.max(1, Math.min(10000, maxRowsParam))
    : 2000;

  try {
    const updated =
      industry === "ib"
        ? await backfillIB(maxRows)
        : await backfillConsulting(maxRows, "consulting");

    return NextResponse.json({
      success: true,
      mode: "enrichment_only",
      industry,
      updated,
      maxRows,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
