import { NextResponse } from "next/server";
import { runMonthlyJob } from "@/lib/layer2/scheduler";

/** Full scrape can take several minutes (many Exa calls + delays). */
export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const forceFull =
    url.searchParams.get("full") === "1" ||
    url.searchParams.get("full") === "true";

  try {
    await runMonthlyJob(forceFull ? { forceFullRun: true } : undefined);
    return NextResponse.json({
      success: true,
      mode: forceFull ? "full" : "scheduled",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
