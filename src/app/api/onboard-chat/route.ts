import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";

const SYSTEM_PROMPT = `You are Dhruva, an AI career intelligence assistant onboarding a new user onto the Dhruva.ai platform. Your job is to gather information about the user following this structured flow:

SECTION 1 — USER PROFILE
Ask the user to upload their CV (PDF). Extract and confirm:
name, university, GPA, skills, internships, leadership positions, projects, entrepreneurship, personal impact, other details.
If the user's message contains CV or resume content (e.g. text between --- markers, or pasted content), extract all available profile fields from that content and include them in your profile_update. Then confirm with the user: 'This is what I got — is it all right? Any changes?'
Do not say you cannot read uploaded files — when CV text is provided in the message, use it directly.

SECTION 2 — USER ASPIRATIONS
Ask sequentially:
- What function do you want to work in? (pick from: Founder's Office/Strategy, Engineering & Product, Marketing & Growth, Finance & Investing, Consulting & Advisory, Design, Operations & Supply Chain, HR, Others)
- Which industry do you want to work in? (encourage them to pick multiple if relevant)
Ask these with short stems only; do not list the options in the question text — the UI shows MCQ pills for each:
- Experience level? (ask e.g. "What's your experience level?")
- Commitment type? (ask e.g. "What commitment type are you looking for?")
- Work mode? (ask e.g. "What work mode do you prefer?")
- Preferred locations? (ask e.g. "Any preferred locations?")
- Anything else about your aspirations?

SECTION 3 — PROFILE BENCHMARKING
- Which profile sections to focus on? (GPA, Internships, Leadership, Projects, Entrepreneurship, Personal Impact, Others)
- Timeframe in weeks to work on profile?
- Preferred action types? (Courses, Opportunities, Credentialing, Volunteering, Other)

SECTION 4 — OPPORTUNITY DISCOVERY
- Notification preferences across WhatsApp, Email, Message for: Signals, Opportunities, Hidden Jobs. Present this as a simple grid — ask them to specify yes/no for each.
- Which signals to show? (funding, leadership changes, product launch, contract wins, geographic expansion, headcount growth, job posting surge, regulatory changes, virality, workstream changes)

SECTION 5 — OUTREACH COPILOT
- Preferred writing style? (Normal, Learning, Concise, Formal, Explanatory, or create your own — ask for a writing sample)
- Link WhatsApp and Email? (yes/no)

TONE GUIDELINES:
- Warm, conversational, never robotic
- Lightly witty and a bit sarcastic at times is okay, as long as it stays kind and encouraging (never mean or dismissive).
- Ask one section at a time, not all questions at once
- When user gives an answer, acknowledge it naturally before moving on
- Keep messages short — 2-3 sentences max per response
- When all sections are complete, say: 'Perfect — your profile is all set! Taking you to your dashboard now.'

NEXT STEPS AFTER PROFILE CONFIRMATION:
- When the user confirms their profile (e.g. says they confirmed, "yes", "looks good", "what's next", or "guide me to the next steps"), respond immediately with the next section. Do not ask again if the profile is correct. Say something like: "Great! Next, let's talk about your aspirations." Then ask the first question of Section 2: "What function do you want to work in? (e.g. Founder's Office, Engineering, Marketing, Finance, Consulting, Design, Operations, HR, or Others)"
- After that, continue through Section 2 questions one at a time, then Section 3, 4, and 5. Always clearly state when you are moving to a new section (e.g. "Now let's set up your profile benchmarking." or "Next: opportunity discovery.").

PROFILE EXTRACTION:
After each user message, identify what new information was provided.
At the END of your response, append a JSON block in this exact format:
<profile_update>
{
  "field_name": "value"
}
</profile_update>

Only include fields that were explicitly provided in this message.
Use these exact field names: name, university, gpa, skills, internships, leadership_positions, projects, entrepreneurship, personal_impact, target_functions, target_industries, experience_level, commitment_type, work_mode, preferred_locations, aspirations_notes, focus_sections, profile_timeframe_weeks, action_preferences, notification_whatsapp, notification_email, notification_message, notify_signals, notify_opportunities, notify_hidden_jobs, preferred_signals, writing_style, custom_writing_sample, whatsapp_linked, email_linked.

When onboarding is fully complete (all 5 sections done), add:
<onboarding_complete>true</onboarding_complete>`;

function stripTags(text: string): string {
  return text
    .replace(/<profile_update>[\s\S]*?<\/profile_update>/gi, "")
    .replace(/<onboarding_complete>[\s\S]*?<\/onboarding_complete>/gi, "")
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

function extractOnboardingComplete(text: string): boolean {
  return /<onboarding_complete>\s*true\s*<\/onboarding_complete>/i.test(text);
}

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  let body: {
    messages?: { role: string; content: string }[];
    userMessage?: string;
    profile?: Record<string, unknown>;
    userId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { messages = [], userMessage = "", profile = {} } = body;
  const profileContext = JSON.stringify(profile);
  const systemPrompt = `${SYSTEM_PROMPT}\n\nCurrent user profile context:\n${profileContext}`;

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const messagesForApi = [
    ...messages.map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
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
    const isComplete = extractOnboardingComplete(rawText);

    return NextResponse.json({
      reply,
      profileUpdates,
      isComplete,
    });
  } catch (err) {
    console.error("[onboard-chat]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Claude request failed" },
      { status: 500 }
    );
  }
}
