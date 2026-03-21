import type { QueryConfig } from "./queries";
import Anthropic from "@anthropic-ai/sdk";

export type SignalStrength = "High" | "Medium" | "Low";

export type EnrichedSignalFields = {
  cleaned_summary: string;
  signal_strength: SignalStrength;
  inferred_role: string;
  actionable_inference: string;
};

type LLMEnrichmentPayload = {
  cleaned_summary: string;
  actionable_inference: string;
};

const ROLE_PATTERNS: RegExp[] = [
  /\b(analyst|business analyst|strategy analyst)\b/i,
  /\b(associate consultant|consultant|strategy consultant)\b/i,
  /\b(research analyst|insights analyst)\b/i,
  /\b(intern|summer intern|trainee)\b/i,
  /\b(associate|senior associate)\b/i,
  /\b(manager|engagement manager|project leader)\b/i,
];

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function stripNoise(input: string): string {
  return normalizeWhitespace(
    input
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[#*_`>|[\]]/g, " ")
      .replace(/\s{2,}/g, " ")
  );
}

function firstSentences(input: string, maxSentences: number): string {
  const text = stripNoise(input);
  if (!text) return "";
  const parts = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return text.slice(0, 220);
  return parts.slice(0, maxSentences).join(" ").slice(0, 280).trim();
}

function inferRoleFromText(content: string): string {
  for (const p of ROLE_PATTERNS) {
    const m = content.match(p);
    if (m?.[1]) return m[1].toLowerCase();
  }
  return "analyst / associate";
}

function scoreStrength(content: string, signalType: QueryConfig["signal_type"]): SignalStrength {
  const text = content.toLowerCase();
  const evidence = [
    "round",
    "shortlist",
    "test",
    "assessment",
    "case interview",
    "what they look for",
    "criteria",
    "offer",
    "selected",
    "screening",
  ].filter((kw) => text.includes(kw)).length;

  if (signalType === "interview_experience" || signalType === "hiring_criteria") {
    if (evidence >= 3) return "High";
    if (evidence >= 2) return "Medium";
    return "Low";
  }

  if (signalType === "process_structure") {
    if (/\b(round 1|round 2|final round|aptitude|case)\b/i.test(content)) return "High";
    if (evidence >= 2) return "Medium";
    return "Low";
  }

  // profile_tip
  if (/\b(example|timeline|resume|cv|project|quantified)\b/i.test(content)) return "Medium";
  return evidence >= 2 ? "Medium" : "Low";
}

function inferenceByType(
  signalType: QueryConfig["signal_type"],
  role: string,
  summary: string,
  content: string
): string {
  const text = `${summary} ${content}`.toLowerCase();
  const has = (re: RegExp) => re.test(text);

  const prepFocus =
    (has(/\b(case interview|case)\b/) && "case interviews") ||
    (has(/\b(guesstimate|market sizing)\b/) && "guesstimates and market sizing") ||
    (has(/\b(aptitude|quant|numerical)\b/) && "aptitude and quantitative sections") ||
    (has(/\b(group discussion|gd)\b/) && "group discussion performance") ||
    (has(/\b(cv|resume|bullet)\b/) && "resume clarity and impact bullets") ||
    (has(/\b(excel|powerpoint|sql|python)\b/) && "tool fluency with measurable project proof") ||
    "core interview readiness";

  if (signalType === "interview_experience") {
    return `Based on this signal, prioritize ${prepFocus} for ${role} interviews and run 2-3 targeted mocks this week.`;
  }
  if (signalType === "hiring_criteria") {
    return `Based on stated criteria in the summary, tailor resume bullets and project narratives for ${role} to emphasize ${prepFocus}.`;
  }
  if (signalType === "process_structure") {
    const roundHint =
      (has(/\b(final round|partner round|leadership round)\b/) && "final/partner-round simulations") ||
      (has(/\b(round 1|screening|online test)\b/) && "screening + round-1 drills first") ||
      "stage-wise progression";
    return `Use the described process to build a stage-wise prep plan for ${role}, with explicit focus on ${roundHint}.`;
  }
  return `Convert these profile tips into a weekly execution plan for ${role}, with emphasis on ${prepFocus} and evidence-backed storytelling.`;
}

export function enrichSignal(
  signalType: QueryConfig["signal_type"],
  content: string
): EnrichedSignalFields {
  const summary = firstSentences(content, 2);
  const inferredRole = inferRoleFromText(content);
  const signalStrength = scoreStrength(content, signalType);
  const actionableInference = inferenceByType(
    signalType,
    inferredRole,
    summary,
    content
  );

  return {
    cleaned_summary: summary || "Insufficient content to summarize.",
    signal_strength: signalStrength,
    inferred_role: inferredRole,
    actionable_inference: actionableInference,
  };
}

function readEnv(value: string | undefined): string {
  if (!value) return "";
  return value.trim().split(/\r?\n/)[0].trim();
}

let _anthropic: Anthropic | null = null;
function getAnthropicClient(): Anthropic | null {
  if (_anthropic) return _anthropic;
  const apiKey = readEnv(process.env.ANTHROPIC_API_KEY);
  if (!apiKey) return null;
  _anthropic = new Anthropic({ apiKey });
  return _anthropic;
}

function parseJsonBlock(input: string): LLMEnrichmentPayload | null {
  const cleaned = input.replace(/```json|```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as Partial<LLMEnrichmentPayload>;
    if (
      typeof parsed.cleaned_summary === "string" &&
      parsed.cleaned_summary.trim() &&
      typeof parsed.actionable_inference === "string" &&
      parsed.actionable_inference.trim()
    ) {
      return {
        cleaned_summary: parsed.cleaned_summary.trim().slice(0, 450),
        actionable_inference: parsed.actionable_inference.trim().slice(0, 450),
      };
    }
  } catch {
    return null;
  }
  return null;
}

export async function enrichSignalWithLLM(
  signalType: QueryConfig["signal_type"],
  content: string
): Promise<EnrichedSignalFields> {
  const fallback = enrichSignal(signalType, content);
  const anthropic = getAnthropicClient();
  if (!anthropic) return fallback;

  const compactContent = stripNoise(content).slice(0, 3500);
  if (!compactContent) return fallback;

  const systemPrompt = `You are an enrichment engine for hiring signals.
Return ONLY valid JSON with exactly two keys:
- cleaned_summary
- actionable_inference

Rules:
- cleaned_summary: 2-3 precise sentences summarizing factual signal content from input text only.
- actionable_inference: must be hyper-specific to cleaned_summary details; include concrete actions a candidate should take.
- Do not write generic advice. Tie inference to specific rounds, criteria, tools, or skills mentioned in the text.
- No markdown, no bullets, no extra keys.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      temperature: 0.2,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `signal_type=${signalType}\n\ncontent:\n${compactContent}`,
        },
      ],
    });

    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === "text"
    );
    const raw = textBlocks.map((b) => b.text).join("\n").trim();
    if (!raw) return fallback;

    const parsed = parseJsonBlock(raw);
    if (!parsed) return fallback;

    return {
      ...fallback,
      cleaned_summary: parsed.cleaned_summary,
      actionable_inference: parsed.actionable_inference,
    };
  } catch {
    return fallback;
  }
}
