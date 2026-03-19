import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";

const SYSTEM_PROMPT = `You are a career intelligence assistant helping an early-career job seeker in India identify companies to reach out to for hidden job opportunities.

The user will give you a list of company names. Your job is to:
1. Parse the list (handle commas, newlines, numbered lists, bullet points)
2. For each company, identify:
   - The canonical company name (clean, properly capitalised)
   - The primary industry it operates in (use a concise label, e.g. "Fintech", "EdTech", "Management Consulting", "E-commerce", "SaaS — HR Tech", etc.)
   - The company's approximate size bracket: "Startup (<50)", "Mid-size (50–500)", "Large (500–5000)", "Enterprise (5000+)"
   - Headquarters country
3. Return ONLY a valid JSON array. No markdown, no explanation, no preamble.

Format:
[
  {
    "name": "Canonical Company Name",
    "industry": "Industry Label",
    "size": "Size Bracket",
    "hq": "Country"
  }
]

If a company name is ambiguous or unrecognisable, make your best inference and include it.
Never return anything other than the raw JSON array.`;

interface RequestBody {
  userMessage?: string;
  step?: string;
}

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const userMessage = body.userMessage?.trim() ?? "";
  const step = body.step ?? "";

  if (!userMessage) {
    return NextResponse.json({ error: "userMessage is required" }, { status: 400 });
  }

  if (step !== "enrich_companies") {
    return NextResponse.json({ error: "Unsupported step" }, { status: 400 });
  }

  try {
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const completion = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const content = completion.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return NextResponse.json({ content });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

