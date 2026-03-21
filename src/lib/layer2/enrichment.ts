import type { QueryConfig } from "./queries";

export type SignalStrength = "High" | "Medium" | "Low";

export type EnrichedSignalFields = {
  cleaned_summary: string;
  signal_strength: SignalStrength;
  inferred_role: string;
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
  role: string
): string {
  if (signalType === "interview_experience") {
    return `Prioritize mock cases and personal-experience stories for ${role} interviews this week.`;
  }
  if (signalType === "hiring_criteria") {
    return `Refine resume bullets and projects to match recurring shortlist criteria for ${role}.`;
  }
  if (signalType === "process_structure") {
    return `Build a stage-wise prep plan aligned to the stated hiring process for ${role}.`;
  }
  return `Convert profile tips into a concrete weekly routine (resume, projects, and outreach) for ${role}.`;
}

export function enrichSignal(
  signalType: QueryConfig["signal_type"],
  content: string
): EnrichedSignalFields {
  const summary = firstSentences(content, 2);
  const inferredRole = inferRoleFromText(content);
  const signalStrength = scoreStrength(content, signalType);
  const actionableInference = inferenceByType(signalType, inferredRole);

  return {
    cleaned_summary: summary || "Insufficient content to summarize.",
    signal_strength: signalStrength,
    inferred_role: inferredRole,
    actionable_inference: actionableInference,
  };
}
