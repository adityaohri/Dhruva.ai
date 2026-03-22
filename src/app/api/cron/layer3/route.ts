import { NextResponse } from "next/server";
import type { Layer3Step } from "@/lib/layer3/scheduler";
import {
  runConsultingLayer3ExtractStep,
  runConsultingLayer3FetchStep,
  runConsultingLayer3Job,
  runConsultingLayer3MatrixStep,
  runIBLayer3ExtractStep,
  runIBLayer3FetchStep,
  runIBLayer3Job,
  runIBLayer3MatrixStep,
} from "@/lib/layer3";

export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const industry = url.searchParams.get("industry") ?? "consulting";
  const step = (url.searchParams.get("step") ?? "all") as Layer3Step;

  const isIB = industry === "ib";

  try {
    if (step === "fetch") {
      const result = isIB
        ? await runIBLayer3FetchStep()
        : await runConsultingLayer3FetchStep();
      return NextResponse.json({ success: true, industry, step, ...result });
    }

    if (step === "extract") {
      const batchParam = Number(url.searchParams.get("batch") ?? "5");
      const batch = Number.isFinite(batchParam)
        ? Math.max(1, Math.min(20, batchParam))
        : 5;
      const result = isIB
        ? await runIBLayer3ExtractStep(batch)
        : await runConsultingLayer3ExtractStep(batch);
      return NextResponse.json({ success: true, industry, step, ...result });
    }

    if (step === "matrix") {
      const result = isIB
        ? await runIBLayer3MatrixStep()
        : await runConsultingLayer3MatrixStep();
      return NextResponse.json({ success: true, industry, step, ...result });
    }

    if (isIB) {
      await runIBLayer3Job();
    } else {
      await runConsultingLayer3Job();
    }
    return NextResponse.json({ success: true, industry, step: "all" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
