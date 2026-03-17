import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/getUserContext";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";

const SYSTEM_PROMPT = `You are Dhruva, an AI career intelligence assistant for existing users on the Dhruva.ai platform. You help users with:

- Updating their profile (e.g. changing goals, skills, preferences, contact details)
- Booking a demo or answering product questions
- Understanding their dashboard, opportunities, or benchmarks
- Any other career or platform-related questions

Use the USER PROFILE CONTEXT provided above to personalise every response. Treat this as the source of truth for the user's current preferences. When the user asks about their current settings (e.g. "What are my current preferences?"), you MUST answer directly from this context instead of saying you don't have access.

When the user gives profile-related information (new role target, location, preferences, etc.), you may acknowledge it and respond conversationally, but also include a machine-readable profile update block as described below so their stored profile can be updated.

TONE: Warm, concise, helpful. Keep replies short unless the user asks for detail.

PROFILE UPDATES:
- Whenever the user clearly updates information that belongs in their profile (target functions, industries, locations, experience level, notification preferences, etc.), you MUST include a machine-readable update block in your reply.
- Wrap this block in <profile_update> ... </profile_update> tags.
- Inside the tags, return STRICT JSON with keys matching the user_profiles columns, for example:
  <profile_update>
  {"target_functions": "Consulting & Advisory, VC & PE", "target_industries": "Fintech, SaaS"}
  </profile_update>
- Do NOT add commentary inside the tags, only valid JSON.

RE-ASKING ONBOARDING QUESTIONS:
- If the user asks you to ask the onboarding questions again or to "re-do onboarding", you should walk them through the SAME canonical questions used in onboarding, one by one.
- Use EXACTLY this wording for these questions (do NOT paraphrase; the UI depends on these sentences to show MCQ options):
  1) "What function do you want to work in?"
  2) "Which industry do you want to work in?"
  3) "What's your experience level?"
  4) "What commitment type are you looking for?"
  5) "What work mode do you prefer?"
  6) "Any preferred locations?"
- Keep each of these as a short, single-sentence question without long preambles.
- After each answer, acknowledge briefly and then move to the next question unless the user asks to pause.

SHOWING EXISTING PROFILE INFORMATION:
- If the user asks what is currently stored about them (e.g. "What function did I pick?" or "Show me my profile"), summarise the relevant fields from the USER PROFILE CONTEXT in a short, readable way.
- It is fine to use bullet points or a small table in plain text.`;

function stripTags(text: string): string {
  return text
    .replace(/<profile_update>[\s\S]*?<\/profile_update>/gi, "")
    .trim();
}

function extractProfileUpdate(text: string): Record<string, unknown> | null {
  const match = text.match(/<profile_update>([\s\S]*?)<\/profile_update>/i);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

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
    return NextResponse.json(
      { error: "Please sign in to use the chat." },
      { status: 401 }
    );
  }

  let body: {
    messages?: { role: string; content: string }[];
    userMessage?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { messages = [], userMessage = "" } = body;

  // Inject full user context for every chat session so the bot has complete context.
  const userContext = await getUserContext(user.id);
  const systemPrompt = `${userContext}\n\n---\n\n${SYSTEM_PROMPT}`;

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const messagesForApi = [
    ...messages.map((m) => ({
      role: (m.role === "assistant"
        ? "assistant"
        : "user") as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ].filter((m) => m.content) as Anthropic.MessageParam[];

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: messagesForApi,
    });

    const block = response.content.find((b) => b.type === "text");
    const rawText = block && block.type === "text" ? block.text : "";
    const reply = stripTags(rawText);
    const profileUpdates = extractProfileUpdate(rawText) ?? {};

    return NextResponse.json({
      reply,
      ...(Object.keys(profileUpdates).length > 0 && { profileUpdates }),
    });
  } catch (err) {
    console.error("[chat]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Claude request failed" },
      { status: 500 }
    );
  }
}
