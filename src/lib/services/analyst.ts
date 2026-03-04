import Anthropic from "@anthropic-ai/sdk";
import {
  classifyCompany,
  classifyInstitution,
  type Tier,
} from "@/lib/tierRegistry";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export type MatchBand = "Strong" | "Good" | "Moderate" | "Stretch";

export interface JobData {
  title: string;
  company?: string | null;
  location?: string | null;
  description?: string | null;
  seniorityHint?: string | null;
  requiredSkills?: string[];
  niceToHaveSkills?: string[];
  source?: string | null;
  url?: string | null;
}

export interface UserProfile {
  skills: string;
  experience: string;
  education: string;
}

export interface DimensionScore {
  name:
    | "Skills Match"
    | "Experience Relevance"
    | "Pedigree Alignment"
    | "Seniority Fit"
    | "Location"
    | "Trajectory";
  /** Weight percentage (must sum to 100 across all dimensions). */
  weight: number;
  /** Score 0–100 for this dimension. */
  score: number;
}

export interface MatchResult {
  /** Final composite score after validation and tier bonus, 0–100. */
  score: number;
  band: MatchBand;
  dimensions: DimensionScore[];
  strengths: string[];
  gaps: string[];
  actionItem: string;
  jobTier: Tier;
  backgroundTier: Tier;
  tierBonus: number;
  /** Extra debugging info (not for UI). */
  debug?: {
    modelCompositeScore: number;
    tsCompositeScore: number;
    compositeOverridden: boolean;
  };
}

const DIMENSION_WEIGHTS: Record<DimensionScore["name"], number> = {
  "Skills Match": 25,
  "Experience Relevance": 25,
  "Pedigree Alignment": 20,
  "Seniority Fit": 15,
  Location: 10,
  Trajectory: 5,
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function tierRank(tier: Tier): number {
  switch (tier) {
    case "Tier1":
      return 3;
    case "Tier2":
      return 2;
    case "Tier3":
    default:
      return 1;
  }
}

function computeWeightedScore(dimensions: DimensionScore[]): number {
  let total = 0;
  let weightSum = 0;
  for (const dim of dimensions) {
    total += dim.score * dim.weight;
    weightSum += dim.weight;
  }
  if (!weightSum) return 0;
  return clampScore(total / weightSum);
}

function applyTierBonus(
  baseScore: number,
  jobTier: Tier,
  backgroundTier: Tier
): { score: number; bonus: number } {
  let bonus = 0;
  if (jobTier === "Tier1" && backgroundTier === "Tier1") {
    bonus = 15;
  } else if (jobTier === "Tier1" && backgroundTier === "Tier2") {
    bonus = -10;
  }
  const final = clampScore(baseScore + bonus);
  return { score: final, bonus };
}

export function deriveMatchBand(score: number): MatchBand {
  if (score >= 80) return "Strong";
  if (score >= 65) return "Good";
  if (score >= 50) return "Moderate";
  return "Stretch";
}

/**
 * Double‑check Claude's composite score against our own calculation from
 * the dimension scores and fixed weights. If the discrepancy is > 5 pts,
 * override with our TypeScript calculation.
 */
export function validateCompositeScore(params: {
  dimensions: DimensionScore[];
  modelCompositeScore: number;
  jobTier: Tier;
  backgroundTier: Tier;
}): {
  finalScore: number;
  tsCompositeScore: number;
  modelCompositeScore: number;
  compositeOverridden: boolean;
  tierBonus: number;
} {
  const tsCompositeScore = computeWeightedScore(params.dimensions);
  const modelComposite = clampScore(params.modelCompositeScore);
  const diff = Math.abs(tsCompositeScore - modelComposite);

  const base = diff > 5 ? tsCompositeScore : modelComposite;
  const { score: finalScore, bonus: tierBonus } = applyTierBonus(
    base,
    params.jobTier,
    params.backgroundTier
  );

  return {
    finalScore,
    tsCompositeScore,
    modelCompositeScore: modelComposite,
    compositeOverridden: diff > 5,
    tierBonus,
  };
}

function inferJobTier(company?: string | null): Tier {
  if (!company) return "Tier3";
  const match = classifyCompany(company);
  return match?.tier ?? "Tier3";
}

function inferBackgroundTier(profile: UserProfile): Tier {
  let bestTier: Tier = "Tier3";
  let bestRank = tierRank(bestTier);

  if (profile.experience) {
    const m = classifyCompany(profile.experience);
    if (m) {
      const rank = tierRank(m.tier);
      if (rank > bestRank) {
        bestTier = m.tier;
        bestRank = rank;
      }
    }
  }

  if (profile.education) {
    const inst = classifyInstitution(profile.education);
    if (inst) {
      const rank = tierRank(inst.tier);
      if (rank > bestRank) {
        bestTier = inst.tier;
        bestRank = rank;
      }
    }
  }

  return bestTier;
}

function buildAnthropicClient(): Anthropic | null {
  if (!ANTHROPIC_API_KEY) {
    console.warn(
      "[analyst] ANTHROPIC_API_KEY is not configured. Match analyst will be disabled."
    );
    return null;
  }
  return new Anthropic({ apiKey: ANTHROPIC_API_KEY });
}

export async function calculateMatchScore(
  jobData: JobData,
  userProfile: UserProfile
): Promise<MatchResult | null> {
  const client = buildAnthropicClient();
  if (!client) return null;

  const jobTier = inferJobTier(jobData.company ?? undefined);
  const backgroundTier = inferBackgroundTier(userProfile);

  const systemPrompt = [
    "You are a CV-to-JD match analyst for top-tier roles.",
    "You must score a candidate against a job description using a 6-dimensional model.",
    "",
    "Dimensions and their fixed weights (must always be used):",
    "- Skills Match (25%)",
    "- Experience Relevance (25%)",
    "- Pedigree Alignment (20%)",
    "- Seniority Fit (15%)",
    "- Location (10%)",
    "- Trajectory (5%)",
    "",
    "For each dimension, you will assign a SCORE from 0 to 100,",
    "where 0 = terrible fit and 100 = perfect fit.",
    "",
    "COMPOSITE SCORE:",
    "- Compute a base composite score on a 0–100 scale as the weighted average",
    "  of these dimension scores using the weights above.",
    "- DO NOT apply any extra bonus/penalty for tiers; the backend code will add",
    "  the Tier 1 vs Tier 2 bonuses separately.",
    "",
    "You will receive:",
    "- jobData: title, company, description, location, skills, etc.",
    "- userProfile: skills, experience, education.",
    "- jobTier: Tier1/Tier2/Tier3 for the hiring company.",
    "- backgroundTier: Tier1/Tier2/Tier3 derived from the candidate's pedigree.",
    "",
    "You may use these tiers as context when reasoning about Pedigree Alignment,",
    "but DO NOT add or subtract numeric bonus for them yourself.",
    "",
    "OUTPUT FORMAT:",
    "Return EXACTLY ONE JSON object with the following shape and no extra keys:",
    "{",
    '  "dimensions": [',
    '    { "name": "Skills Match", "score": 0-100 },',
    '    { "name": "Experience Relevance", "score": 0-100 },',
    '    { "name": "Pedigree Alignment", "score": 0-100 },',
    '    { "name": "Seniority Fit", "score": 0-100 },',
    '    { "name": "Location", "score": 0-100 },',
    '    { "name": "Trajectory", "score": 0-100 }',
    "  ],",
    '  "modelCompositeScore": 0-100,',
    '  "strengthsTop2": ["...", "..."],',
    '  "gapsTop2": ["...", "..."],',
    '  "actionItem": "One concrete next step the candidate should take."',
    "}",
    "",
    "CRITICAL:",
    "- The dimensions array MUST contain all six dimensions with the EXACT names above.",
    "- The modelCompositeScore MUST equal the weighted average of dimension scores",
    "  using the fixed weights.",
    "- Do not include any commentary or Markdown, only raw JSON.",
  ].join("\n");

  const userContent = {
    jobData,
    userProfile,
    jobTier,
    backgroundTier,
  };

  const completion = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    temperature: 0.2,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: JSON.stringify(userContent),
          },
        ],
      },
    ],
  });

  const textPart = completion.content.find(
    (c) => c.type === "text"
  ) as { type: "text"; text: string } | undefined;

  if (!textPart?.text) {
    console.warn("[analyst] Claude returned no text content");
    return null;
  }

  let raw = textPart.text.trim();
  // Strip potential ```json fences.
  raw = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Fallback: try to extract the first {...} block.
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      try {
        parsed = JSON.parse(raw.slice(first, last + 1));
      } catch (e) {
        console.warn("[analyst] Failed to parse Claude JSON:", e);
        return null;
      }
    } else {
      console.warn("[analyst] No JSON object found in Claude response");
      return null;
    }
  }

  const dimsInput = Array.isArray(parsed?.dimensions)
    ? parsed.dimensions
    : [];

  const dimensions: DimensionScore[] = ([
    "Skills Match",
    "Experience Relevance",
    "Pedigree Alignment",
    "Seniority Fit",
    "Location",
    "Trajectory",
  ] as DimensionScore["name"][]).map((name) => {
    const found = dimsInput.find(
      (d: any) =>
        typeof d?.name === "string" &&
        d.name.toLowerCase() === name.toLowerCase()
    );
    const scoreRaw =
      found && typeof found.score === "number" ? found.score : 0;
    return {
      name,
      weight: DIMENSION_WEIGHTS[name],
      score: clampScore(scoreRaw),
    };
  });

  const modelCompositeScore =
    typeof parsed?.modelCompositeScore === "number"
      ? parsed.modelCompositeScore
      : computeWeightedScore(dimensions);

  const strengths: string[] = Array.isArray(parsed?.strengthsTop2)
    ? parsed.strengthsTop2.map((s: any) => String(s).trim()).filter(Boolean)
    : [];

  const gaps: string[] = Array.isArray(parsed?.gapsTop2)
    ? parsed.gapsTop2.map((s: any) => String(s).trim()).filter(Boolean)
    : [];

  const actionItem: string =
    typeof parsed?.actionItem === "string"
      ? parsed.actionItem.trim()
      : "";

  const validation = validateCompositeScore({
    dimensions,
    modelCompositeScore,
    jobTier,
    backgroundTier,
  });

  const band = deriveMatchBand(validation.finalScore);

  return {
    score: validation.finalScore,
    band,
    dimensions,
    strengths: strengths.slice(0, 2),
    gaps: gaps.slice(0, 2),
    actionItem,
    jobTier,
    backgroundTier,
    tierBonus: validation.tierBonus,
    debug: {
      modelCompositeScore: validation.modelCompositeScore,
      tsCompositeScore: validation.tsCompositeScore,
      compositeOverridden: validation.compositeOverridden,
    },
  };
}

