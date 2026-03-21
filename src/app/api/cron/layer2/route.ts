import { NextResponse } from "next/server";
import { runConsultingLayer2Job, runIBLayer2Job } from "@/lib/layer2";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const industry = url.searchParams.get("industry") ?? "consulting";
  const forceFull =
    url.searchParams.get("full") === "1" ||
    url.searchParams.get("full") === "true";

  try {
    if (industry === "ib") {
      await runIBLayer2Job(forceFull ? { forceFullRun: true } : undefined);
    } else {
      await runConsultingLayer2Job(forceFull ? { forceFullRun: true } : undefined);
    }
    return NextResponse.json({ success: true, industry, mode: forceFull ? "full" : "scheduled" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
