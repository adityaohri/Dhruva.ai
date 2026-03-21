import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildLayer2SignalIntelligence } from "@/lib/layer2/strategyContext";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";

type PlanTask = {
  title: string;
  description: string;
  gapArea: "Work-Ex" | "Acads" | "Leadership" | "Other";
  stageLabel: string;
  difficulty: "Easy" | "Hard";
  impact: "High" | "Low";
  estimatedHours: number;
  toolCta?: "opportunity-discovery" | "outreach-copilot";
};

type StoredStrategyPlan = {
  summary: string;
  tasks: PlanTask[];
};

type RequestBody = {
  audit: {
    targetRole?: string;
    targetCompany?: string;
    targetIndustry?: string;
    gapAnalysis?: unknown;
  };
  discussion: {
    timeline: string;
    bandwidth: string;
    priority: string;
    preferences: string;
    budget: string;
    network: string;
  };
  refinement?: string;
  currentPlan?: StoredStrategyPlan;
};

const SYSTEM_PROMPT = `You are Dhruva Strategy Agent.
Generate a concise, execution-focused one-week plan for a job seeker.

Return STRICT JSON ONLY with shape:
{
  "summary": "string",
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "gapArea": "Work-Ex | Acads | Leadership | Other",
      "stageLabel": "string",
      "difficulty": "Easy | Hard",
      "impact": "High | Low",
      "estimatedHours": number,
      "toolCta": "opportunity-discovery | outreach-copilot | null"
    }
  ]
}

Rules:
- 5 to 8 tasks total
- Plan must be one-week and realistic
- Use user's discussion preferences and bandwidth directly
- If "refinement" is present in input, revise the current plan to address it while keeping the plan feasible.
- If task is about applying/discovery/job search, use toolCta "opportunity-discovery"
- If task is about networking/outreach/referrals/messages, use toolCta "outreach-copilot"
- Otherwise toolCta null
- Use layer2SignalIntelligence context to prioritize tasks using the strongest and most role-relevant signals.
- No markdown, no commentary, JSON only`;

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  try {
    const { context: layer2SignalIntelligence } = await buildLayer2SignalIntelligence(
      supabase,
      body.audit
    );

    const modelInput = {
      ...body,
      layer2SignalIntelligence,
    };

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1800,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: JSON.stringify(modelInput),
        },
      ],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    const cleaned = text.replace(/```json|```/g, "").trim();
    let parsed: StoredStrategyPlan;
    try {
      parsed = JSON.parse(cleaned) as StoredStrategyPlan;
    } catch {
      return NextResponse.json({ error: "Invalid plan response from model" }, { status: 502 });
    }

    const { error: saveError } = await supabase.from("custom_strategies").insert({
      user_id: user.id,
      plan: parsed,
    });

    if (saveError) {
      return NextResponse.json(
        { error: `Plan generated but save failed: ${saveError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ...parsed, saved: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Strategy generation failed" },
      { status: 500 }
    );
  }
}

