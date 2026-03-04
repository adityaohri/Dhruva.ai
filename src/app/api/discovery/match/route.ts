import { NextRequest, NextResponse } from "next/server";
import { calculateMatchScore, type JobData, type UserProfile } from "@/lib/services/analyst";
import { createClient } from "@/lib/supabase/server";

export type MatchResponse = {
  score: number;
  band: "Strong" | "Good" | "Moderate" | "Stretch";
  strengths: string[];
  gaps: string[];
  actionItem: string;
};

/**
 * POST /api/discovery/match
 * Body: { job: { title, company?, description?, url?, source?, seniorityHint? } }
 * Returns on-demand CV-to-JD match (score, band, strengths, gaps, actionItem).
 * Requires authenticated user with a saved profile.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { job?: Partial<JobData> };
    const job = body.job;
    if (!job?.title) {
      return NextResponse.json(
        { error: "Missing job.title in request body." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Sign in to check profile match." },
        { status: 401 }
      );
    }

    const { data: row } = await supabase
      .from("user_profiles")
      .select("skills, internships, leadership_positions, projects, others, university")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!row) {
      return NextResponse.json(
        { error: "Save your profile first to check match." },
        { status: 400 }
      );
    }

    const skills = (row as any).skills ?? "";
    const experienceParts = [
      (row as any).internships,
      (row as any).leadership_positions,
      (row as any).projects,
      (row as any).others,
    ]
      .filter((v) => v != null && v !== "")
      .map((s: any) => String(s).trim())
      .filter(Boolean);
    const experience = experienceParts.join(" | ");
    const education = (row as any).university ?? "";

    const userProfile: UserProfile = {
      skills: skills ?? "",
      experience,
      education,
    };

    const jobData: JobData = {
      title: job.title,
      company: job.company ?? null,
      location: job.location ?? null,
      description: job.description ?? null,
      seniorityHint: job.seniorityHint ?? null,
      requiredSkills: job.requiredSkills ?? [],
      niceToHaveSkills: job.niceToHaveSkills ?? [],
      source: job.source ?? null,
      url: job.url ?? null,
    };

    const analysis = await calculateMatchScore(jobData, userProfile);
    if (!analysis) {
      return NextResponse.json(
        { error: "Match analysis failed." },
        { status: 500 }
      );
    }

    const payload: MatchResponse = {
      score: analysis.score,
      band: analysis.band,
      strengths: analysis.strengths ?? [],
      gaps: analysis.gaps ?? [],
      actionItem: analysis.actionItem ?? "",
    };
    return NextResponse.json(payload);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
