import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildLayer2SignalIntelligence } from "@/lib/layer2/strategyContext";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const targetRole = req.nextUrl.searchParams.get("targetRole") ?? undefined;
  const targetCompany = req.nextUrl.searchParams.get("targetCompany") ?? undefined;
  const max = Number(req.nextUrl.searchParams.get("limit") ?? "12");
  const limit = Number.isFinite(max) ? Math.max(1, Math.min(30, max)) : 12;

  const { context, lines } = await buildLayer2SignalIntelligence(
    supabase,
    { targetRole, targetCompany },
    limit
  );

  return NextResponse.json({
    ok: true,
    limit,
    targetRole: targetRole ?? null,
    targetCompany: targetCompany ?? null,
    lineCount: lines.length,
    context,
    lines,
  });
}
