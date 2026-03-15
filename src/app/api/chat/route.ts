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

Use the USER PROFILE CONTEXT provided above to personalise every response. Do not repeat that context back to the user unless they ask. When the user gives profile-related information (new role target, location, preferences, etc.), you may acknowledge it and suggest they confirm changes in their profile settings, or respond conversationally as appropriate.

TONE: Warm, concise, helpful. Keep replies short unless the user asks for detail.`;

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
