import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

let anthropicClient: Anthropic | null = null;

function getAnthropic(): Anthropic | null {
  if (!ANTHROPIC_API_KEY) {
    console.warn(
      "[radar-explanation] ANTHROPIC_API_KEY is not configured; skipping personalised reasons."
    );
    return null;
  }
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      company?: string;
      title?: string;
      snippet?: string;
    };
    const company = (body.company ?? "").trim();
    const title = (body.title ?? "").trim();
    const snippet = (body.snippet ?? "").trim();

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to view personalised radar insights." },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("user_profiles")
    .select(
      "skills, internships, leadership_positions, projects, others, current_university"
    )
    .eq("id", user.id)
      .maybeSingle();

    const skills = (profile as any)?.skills ?? "";
    const experienceParts = [
      (profile as any)?.internships,
      (profile as any)?.leadership_positions,
      (profile as any)?.projects,
      (profile as any)?.others,
    ]
      .filter((v) => v != null && v !== "")
      .map((s: any) => String(s).trim())
      .filter(Boolean);
    const experience = experienceParts.join(" | ");
  const education = (profile as any)?.current_university ?? "";

    const hasProfile = skills || experience || education;
    if (!hasProfile) {
      return NextResponse.json(
        { error: "Save your profile first to view personalised radar insights." },
        { status: 400 }
      );
    }

    const client = getAnthropic();
    if (!client) {
      return NextResponse.json(
        { error: "Anthropic is not configured for personalised insights." },
        { status: 500 }
      );
    }

    const profileText = [
      skills && `Skills: ${skills}`,
      experience && `Experience: ${experience}`,
      education && `Education: ${education}`,
    ]
      .filter(Boolean)
      .join("\n");

    const signalText = [
      company && `Company: ${company}`,
      title && `Headline: ${title}`,
      snippet && `Signal: ${snippet}`,
    ]
      .filter(Boolean)
      .join("\n");

    const completion = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 160,
      temperature: 0.3,
      system: [
        "You are a concise career advisor helping a candidate decide why a specific company signal is worth reaching out to.",
        "Given the candidate's background and a short news snippet about a company (funding, expansion, new office, etc.),",
        "write EXACTLY ONE short sentence explaining why this company is a strong or time-sensitive fit for them.",
        "Speak directly to the candidate (\"Because you...\"), and focus on the opportunity created by the signal.",
      ].join(" "),
      messages: [
        {
          role: "user",
          content: [
            "CANDIDATE PROFILE:",
            profileText,
            "",
            "COMPANY SIGNAL:",
            signalText,
          ].join("\n"),
        },
      ],
    });

    const textPart = completion.content.find(
      (c) => c.type === "text"
    ) as { type: "text"; text: string } | undefined;
    const reason = textPart?.text?.trim() ?? "";
    if (!reason) {
      return NextResponse.json(
        { error: "Could not generate a personalised reason." },
        { status: 500 }
      );
    }

    return NextResponse.json({ reason });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    const is429 =
      message.includes("429") ||
      message.includes("rate_limit") ||
      (e as { status?: number })?.status === 429;
    if (is429) {
      return NextResponse.json(
        {
          error:
            "Too many requests. Please wait a moment and try again, or refresh the page.",
        },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

