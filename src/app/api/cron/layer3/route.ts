import { NextResponse } from "next/server";
import { runConsultingLayer3Job, runIBLayer3Job } from "@/lib/layer3";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const industry = new URL(request.url).searchParams.get("industry") ?? "consulting";

  try {
    if (industry === "ib") {
      await runIBLayer3Job();
    } else {
      await runConsultingLayer3Job();
    }
    return NextResponse.json({ success: true, industry });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
