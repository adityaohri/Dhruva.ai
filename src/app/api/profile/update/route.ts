import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  let body: { updates?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const updates = body.updates ?? {};
  if (!updates || Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const payload = {
    user_id: user.id,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("user_profiles")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    console.error("[profile/update] upsert error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

