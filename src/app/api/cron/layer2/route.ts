import { NextResponse } from "next/server";
import { runConsultingLayer2Job, runIBLayer2Job } from "@/lib/layer2";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const industry = new URL(request.url).searchParams.get("industry") ?? "consulting";

  try {
    if (industry === "ib") {
      await runIBLayer2Job();
    } else {
      await runConsultingLayer2Job();
    }
    return NextResponse.json({ success: true, industry });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
