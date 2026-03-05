import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  findRelevantPeopleForCompany,
  type PdlPerson,
} from "@/lib/services/pdl";

export type PeopleResponse = {
  people: PdlPerson[];
};

/**
 * POST /api/opportunity/people
 * Body: { company: string }
 *
 * Returns 10–15 relevant people at the given company, prioritising
 * alumni or industry connections with the current user's saved profile.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { company?: string };
    const company = body.company?.trim();
    if (!company) {
      return NextResponse.json(
        { error: "Company is required." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to view people for outreach." },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("university, skills")
      .eq("user_id", user.id)
      .maybeSingle();

    const alumniSchool = (profile as any)?.university ?? null;
    const industryHint = null; // Optional: derive from skills later.

    const { people } = await findRelevantPeopleForCompany({
      company,
      alumniSchool,
      industryHint,
      size: 15,
    });

    return NextResponse.json({ people } as PeopleResponse);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

