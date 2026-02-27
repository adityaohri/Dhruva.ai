import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

type ExperienceEntry = {
  title: string;
  company: string;
  start_date?: string | null;
  end_date?: string | null;
  description?: string | null;
};

type SuccessProfile = {
  full_name: string;
  current_occupation: string;
  experience_history: ExperienceEntry[];
  skills: string[];
  education: string[];
};

export type SuccessPattern = {
  common_previous_roles: string[];
  top_skills_delta: string[];
  avg_tenure_in_previous_step: number;
  impact_keyword_density: number;
};

type DiscoveryResult = {
  profiles: SuccessProfile[];
  pattern: SuccessPattern;
};

const cache = new Map<string, DiscoveryResult>();

// Fiber AI & model keys
const FIBER_API_KEY = process.env.FIBER_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const TECH_KEYWORDS = [
  "python",
  "r",
  "sql",
  "excel",
  "power bi",
  "tableau",
  "javascript",
  "java",
];

const SOFT_KEYWORDS = [
  "leadership",
  "communication",
  "teamwork",
  "stakeholder management",
  "presentation",
  "client",
];

function estimateFiberCost(numResults: number): number {
  // Fiber AI pricing will differ, but we log a simple estimate so you can
  // keep an eye on credit usage in the console.
  return numResults; // adjust if you know the exact credit model
}

async function fiberPersonSearch(
  targetRole: string,
  targetCompany: string,
  targetIndustry?: string,
  pageSize: number = 15
): Promise<any[]> {
  if (!FIBER_API_KEY) {
    throw new Error("FIBER_API_KEY is not configured.");
  }

  // Fiber people search endpoint
  const url = "https://api.fiber.ai/v1/people-search";

  // We:
  // - pass the API key in the body (per Fiber docs),
  // - filter by currentCompanies (target company, as object),
  // - and use keywords.containsAny for the target role text,
  // - request detailed work experience so the Golden Step logic has richer data.
  const body = {
    apiKey: FIBER_API_KEY,
    searchParams: {
      getDetailedWorkExperience: true,
      // Restrict people search to India using Fiber's
      // country3LetterCode.anyOf filter.
      country3LetterCode: {
        anyOf: ["IND"],
      },
      keywords: {
        containsAny: targetIndustry
          ? [targetRole, targetIndustry]
          : [targetRole],
      },
    },
    pageSize,
    cursor: null,
    currentCompanies: [
      {
        name: targetCompany,
      },
    ],
    prospectExclusionListIDs: [],
    companyExclusionListIDs: [],
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Fiber AI error ${resp.status}: ${text}`);
  }

  const data = await resp.json();

  // According to Fiber's OpenAPI spec, the people-search response
  // shape is: { output: { data: [ ...profiles ] } }
  // We also keep some defensive fallbacks for future changes.
  const results =
    (Array.isArray(data) && data) ||
    data.output?.data ||
    data.profiles ||
    data.results ||
    data.data ||
    [];

  console.log(
    "[discovery] Fiber AI returned",
    results.length,
    "results (estimated cost ~",
    estimateFiberCost(results.length),
    "credits)"
  );

  return results as any[];
}

function getLinkedInUrl(raw: any): string | null {
  return (
    raw.url || // Fiber's generic profile URL (often LinkedIn)
    raw.linkedin_url ||
    raw.linkedinUrl ||
    raw.linkedin ||
    raw.profile_url ||
    raw.profileUrl ||
    null
  );
}

function getFollowerCount(raw: any): number {
  const candidates = [
    raw.linkedin_followers,
    raw.linkedinFollowers,
    raw.followers,
    raw.num_followers,
    raw.connections,
    raw.linkedin_connections,
    raw.linkedinConnections,
  ];

  for (const val of candidates) {
    if (typeof val === "number" && Number.isFinite(val)) return val;
    if (typeof val === "string") {
      const n = Number(val.replace(/,/g, "").trim());
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

function normaliseCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\b(ltd|limited|inc|llp|company|co)\b/g, "")
    .trim();
}

function deriveParentCompanyName(name: string): string | null {
  const lower = name.toLowerCase();
  const splitByAmp = lower.split("&")[0]?.trim();
  if (splitByAmp && splitByAmp.length >= 3) return splitByAmp;
  const tokens = lower.split(/\s+/);
  if (tokens.length > 1) return tokens[0];
  return null;
}

function getCurrentCompanyName(raw: any): string {
  if (raw.current_company && typeof raw.current_company === "string") {
    return raw.current_company;
  }
  if (raw.currentCompany && typeof raw.currentCompany === "string") {
    return raw.currentCompany;
  }
  const experiencesRaw =
    raw.experience || raw.experiences || raw.employment_history || [];
  if (Array.isArray(experiencesRaw) && experiencesRaw.length > 0) {
    const exp = experiencesRaw[0];
    if (exp) {
      if (typeof exp.company === "string") return exp.company;
      if (exp.company && typeof exp.company === "object") {
        return (
          exp.company.name ||
          exp.company_title ||
          exp.employer_name ||
          ""
        );
      }
      if (typeof exp.employer_name === "string") return exp.employer_name;
    }
  }
  return "";
}

function rankFiberResults(
  rawResults: any[],
  targetRole: string,
  targetCompany: string
): any[] {
  if (!rawResults.length) return [];

  const normTargetCompany = normaliseCompanyName(targetCompany);
  const parent = deriveParentCompanyName(targetCompany);
  const normParent = parent ? normaliseCompanyName(parent) : null;
  const roleLower = targetRole.toLowerCase();

  const scored = rawResults.map((raw) => {
    const followers = getFollowerCount(raw);
    const companyName = getCurrentCompanyName(raw);
    const normCompany = normaliseCompanyName(companyName);

    const companyMatch =
      !!normCompany && normCompany.includes(normTargetCompany);
    const parentMatch =
      normParent && normParent.length >= 3
        ? normCompany.includes(normParent)
        : false;

    const headline = String(
      raw.headline || raw.current_title || raw.current_position || ""
    ).toLowerCase();
    const roleMatch = !!roleLower && headline.includes(roleLower);

    let score = 0;
    if (followers >= 500) score += 10;
    else score += followers / 1000;
    if (companyMatch) score += 5;
    if (parentMatch) score += 3;
    if (roleMatch) score += 4;

    return {
      raw,
      score,
      followers,
      companyMatch,
      parentMatch,
      roleMatch,
    };
  });

  // Prefer profiles with at least 500 followers; if none, fall back to all.
  let filtered = scored.filter((s) => s.followers >= 500);
  if (!filtered.length) filtered = scored;

  filtered.sort(
    (a, b) =>
      b.score - a.score ||
      b.followers - a.followers
  );

  return filtered.map((s) => s.raw);
}

async function suggestPeerCompanies(
  targetRole: string,
  targetCompany: string,
  targetIndustry?: string
): Promise<string[]> {
  if (!OPENAI_API_KEY) return [];

  const client = new OpenAI({ apiKey: OPENAI_API_KEY });
  const prompt = [
    "You are a career intelligence assistant.",
    `Given the target role "${targetRole}" at company "${targetCompany}",`,
    targetIndustry
      ? `and the target industry "${targetIndustry}",`
      : "and its current industry context,",
    "suggest 3 peer companies of similar size, prestige, and industry.",
    "Return ONLY a comma-separated list of company names, no extra text.",
  ].join(" ");

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });
    const content = completion.choices[0]?.message?.content ?? "";
    return content
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);
  } catch (e) {
    console.warn("[discovery] OpenAI peer company suggestion failed:", e);
    return [];
  }
}

function mapFiberProfile(raw: any): SuccessProfile {
  /**
   * Fiber AI typically returns a structured person object.
   * We defensively check several likely keys so the frontend
   * `SuccessProfile` shape remains stable even if the exact Fiber
   * JSON fields change slightly.
   */
  const full_name =
    raw.full_name || raw.name || raw.display_name || "Unknown";

  const headline =
    raw.headline ||
    raw.current_title ||
    raw.current_position ||
    "";

  const experiencesRaw =
    raw.experience ||
    raw.experiences ||
    raw.employment_history ||
    [];
  const experience_history: ExperienceEntry[] = [];
  for (const exp of experiencesRaw) {
    const title = exp.title || exp.role || exp.position || "";
    let company = "";
    if (exp.company && typeof exp.company === "object") {
      company = exp.company.name || exp.company_title || "";
    } else if (typeof exp.company === "string") {
      company = exp.company;
    } else if (exp.employer_name) {
      company = exp.employer_name;
    }
    if (!title && !company) continue;
    experience_history.push({
      title,
      company,
      start_date:
        exp.start_date ||
        exp.starts_at ||
        exp.start_date_iso ||
        null,
      end_date:
        exp.end_date ||
        exp.ends_at ||
        exp.end_date_iso ||
        null,
      description:
        exp.description ||
        exp.summary ||
        exp.responsibilities ||
        null,
    });
  }

  const skillsRaw = raw.skills || raw.skill_tags || [];
  let skills: string[];
  if (typeof skillsRaw === "string") {
    skills = skillsRaw
      .split(/[,;\n]/)
      .map((s: string) => s.trim())
      .filter(Boolean);
  } else {
    skills = (skillsRaw as any[])
      .map((s) => String(s).trim())
      .filter(Boolean);
  }

  const educationRaw = raw.education || raw.education_history || [];
  const education: string[] = [];
  for (const ed of educationRaw) {
    if (typeof ed === "string") {
      education.push(ed);
    } else if (ed && typeof ed === "object") {
      const name = ed.school || ed.school_name || ed.degree || "";
      if (name) education.push(name);
    }
  }

  const current_occupation =
    headline ||
    (experience_history.length ? experience_history[0].title : "Unknown");

  return {
    full_name,
    current_occupation,
    experience_history,
    skills,
    education,
  };
}

function findGoldenStep(
  profile: SuccessProfile,
  targetRole: string,
  targetCompany: string
): ExperienceEntry | null {
  const exps = profile.experience_history;
  if (!exps.length) return null;

  for (let i = 0; i < exps.length - 1; i++) {
    const current = exps[i];
    const prev = exps[i + 1];
    const roleMatch = current.title
      .toLowerCase()
      .includes(targetRole.toLowerCase());
    const companyMatch = current.company
      .toLowerCase()
      .includes(targetCompany.toLowerCase());
    if (roleMatch && companyMatch) {
      return prev;
    }
  }
  return null;
}

function tenureInYears(exp: ExperienceEntry): number | null {
  if (!exp.start_date) return null;
  const start = new Date(exp.start_date);
  if (Number.isNaN(start.getTime())) return null;
  const end = exp.end_date ? new Date(exp.end_date) : new Date();
  if (Number.isNaN(end.getTime())) return null;
  const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.max(years, 0);
}

function impactDensity(text: string | null | undefined): number {
  if (!text) return 0;
  const tokens = text.replace(/\s+/g, " ").split(" ").filter(Boolean);
  if (!tokens.length) return 0;
  const impactful = tokens.filter(
    (t) => /[0-9]/.test(t) || t.includes("%") || t.includes("$")
  );
  return impactful.length / tokens.length;
}

function deriveSuccessPattern(
  profiles: SuccessProfile[],
  targetRole: string,
  targetCompany: string
): SuccessPattern {
  const goldenRoles: string[] = [];
  const tenures: number[] = [];
  const impactScores: number[] = [];
  const allSkills: string[] = [];

  for (const p of profiles) {
    allSkills.push(...p.skills);
    const golden = findGoldenStep(p, targetRole, targetCompany);
    if (!golden) continue;
    goldenRoles.push(golden.title);
    const t = tenureInYears(golden);
    if (t !== null) tenures.push(t);
    impactScores.push(impactDensity(golden.description));
  }

  const roleCounts = new Map<string, number>();
  for (const r of goldenRoles) {
    const key = r.trim();
    if (!key) continue;
    roleCounts.set(key, (roleCounts.get(key) ?? 0) + 1);
  }
  const common_previous_roles = Array.from(roleCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([role]) => role);

  const skillCounts = new Map<string, number>();
  for (const s of allSkills) {
    const key = s.toLowerCase().trim();
    if (!key) continue;
    skillCounts.set(key, (skillCounts.get(key) ?? 0) + 1);
  }
  const top_skills_delta = Array.from(skillCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([skill]) => skill);

  const avg_tenure_in_previous_step =
    tenures.length > 0
      ? tenures.reduce((a, b) => a + b, 0) / tenures.length
      : 0;

  const impact_keyword_density =
    impactScores.length > 0
      ? impactScores.reduce((a, b) => a + b, 0) / impactScores.length
      : 0;

  return {
    common_previous_roles,
    top_skills_delta,
    avg_tenure_in_previous_step,
    impact_keyword_density,
  };
}

/** Ensures gapAnalysis has no string field containing raw JSON (avoids wall of text in UI/PDF). */
function normaliseGapAnalysis(raw: any): Record<string, unknown> {
  const out: Record<string, unknown> = {
    overallSummary: "",
    trajectoryFit: "",
    careerAnchors: [] as string[],
    skillGaps: { missingTechnical: [], missingSoft: [] as string[] },
    concreteActions: [] as string[],
  };

  const tryParseJsonString = (s: unknown): unknown => {
    if (typeof s !== "string" || !s.trim().startsWith("{")) return s;
    try {
      return JSON.parse(s.replace(/^[\s\S]*?\{/, "{").replace(/\}[\s\S]*$/, "}"));
    } catch {
      return s;
    }
  };

  const str = (v: unknown): string =>
    typeof v === "string" ? v.trim() : v != null ? String(v) : "";

  const parsed = tryParseJsonString(raw);
  const obj = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : { overallSummary: str(raw) };

  const overallStr = str(obj.overallSummary);
  out.overallSummary = overallStr;
  if (overallStr && overallStr.startsWith("{")) {
    try {
      const inner = JSON.parse(overallStr) as Record<string, unknown>;
      if (inner.overallSummary != null) out.overallSummary = str(inner.overallSummary);
      if (inner.trajectoryFit != null) out.trajectoryFit = str(inner.trajectoryFit);
      if (Array.isArray(inner.careerAnchors))
        out.careerAnchors = inner.careerAnchors.map((x) => str(x)).filter(Boolean);
      if (inner.skillGaps && typeof inner.skillGaps === "object") {
        const sg = inner.skillGaps as Record<string, unknown>;
        const tech = Array.isArray(sg.missingTechnical)
          ? sg.missingTechnical
              .map((t) =>
                typeof t === "object" && t && "name" in t
                  ? {
                      name: str((t as any).name),
                      resourceUrl:
                        typeof (t as any).resourceUrl === "string"
                          ? (t as any).resourceUrl
                          : undefined,
                    }
                  : { name: str(t), resourceUrl: undefined }
              )
              .filter((t) => t.name)
          : [];
        out.skillGaps = {
          missingTechnical: tech,
          missingSoft: Array.isArray(sg.missingSoft)
            ? sg.missingSoft.map((x) => str(x)).filter(Boolean)
            : [],
        };
      }
      if (Array.isArray(inner.concreteActions))
        out.concreteActions = inner.concreteActions.map((x) => str(x)).filter(Boolean);
    } catch {
      // If we cannot parse the nested JSON, fall back to the original
      // text so the UI and PDF still show a detailed summary instead
      // of an error placeholder.
      out.overallSummary = overallStr;
    }
  }

  if (!out.trajectoryFit) out.trajectoryFit = str(obj.trajectoryFit);

  if (Array.isArray(obj.careerAnchors)) out.careerAnchors = obj.careerAnchors.map((x) => str(x)).filter(Boolean);
  if (obj.skillGaps && typeof obj.skillGaps === "object") {
    const sg = obj.skillGaps as Record<string, unknown>;
    const tech = Array.isArray(sg.missingTechnical)
      ? sg.missingTechnical.map((t) =>
          typeof t === "object" && t && "name" in t
            ? { name: str((t as any).name), resourceUrl: typeof (t as any).resourceUrl === "string" ? (t as any).resourceUrl : undefined }
            : { name: str(t), resourceUrl: undefined }
        ).filter((t) => t.name)
      : [];
    const soft = Array.isArray(sg.missingSoft) ? (sg.missingSoft as unknown[]).map((x) => str(x)).filter(Boolean) : [];
    out.skillGaps = { missingTechnical: tech, missingSoft: soft };
  }
  if (Array.isArray(obj.concreteActions)) out.concreteActions = obj.concreteActions.map((x) => str(x)).filter(Boolean);

  return out;
}

export async function POST(req: NextRequest) {
  const { targetRole, targetCompany, targetIndustry, phase } = await req.json();

  if (!targetRole || !targetCompany) {
    return NextResponse.json(
      { error: "targetRole and targetCompany are required" },
      { status: 400 }
    );
  }

  const mode = (phase as "fiber" | "gap" | undefined) ?? "fiber";
  const key = `${targetCompany}::${targetRole}`.toLowerCase();

  try {
    // Always run Fiber search first
    let rawResults = await fiberPersonSearch(
      targetRole,
      targetCompany,
      targetIndustry
    );
    const targetResults = rankFiberResults(
      rawResults,
      targetRole,
      targetCompany
    );

    const similarCompanies: string[] = [];
    let similarResults: any[] = [];

    // If we don't have enough strong profiles (after follower + role/company ranking),
    // expand the search more aggressively across peer companies.
    if (targetResults.length < 8) {
      const peers = await suggestPeerCompanies(
        targetRole,
        targetCompany,
        targetIndustry
      );
      for (const peer of peers) {
        similarCompanies.push(peer);
        const more = await fiberPersonSearch(targetRole, peer, targetIndustry);
        rawResults = rawResults.concat(more);
        const rankedMore = rankFiberResults(more, targetRole, peer);
        similarResults = similarResults.concat(rankedMore);
      }
    }

    // Public view used by the dashboard: names + LinkedIn URLs, plus roles/companies
    const targetPublicProfiles = targetResults.map((raw: any) => {
      const mapped = mapFiberProfile(raw);
      const firstExp = mapped.experience_history[0];
      return {
        full_name: mapped.full_name,
        current_title: mapped.current_occupation || null,
        current_company: firstExp?.company ?? null,
        linkedin_url: getLinkedInUrl(raw),
      };
    });

    const similarPublicProfiles = similarResults.map((raw: any) => {
      const mapped = mapFiberProfile(raw);
      const firstExp = mapped.experience_history[0];
      return {
        full_name: mapped.full_name,
        current_title: mapped.current_occupation || null,
        current_company: firstExp?.company ?? null,
        linkedin_url: getLinkedInUrl(raw),
      };
    });

    if (mode === "fiber") {
      return NextResponse.json({
        companiesSearched: [targetCompany],
        similarCompanies,
        targetProfiles: targetPublicProfiles.slice(0, 15),
        similarProfiles: similarPublicProfiles.slice(0, 15),
      });
    }

    // ---- Gap analysis phase ----

    const profiles = rawResults.map(mapFiberProfile);
    const pattern = deriveSuccessPattern(profiles, targetRole, targetCompany);

    // Load current user's saved profile from Supabase
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to run gap analysis." },
        { status: 401 }
      );
    }

    const { data: row, error: rowError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (rowError) {
      return NextResponse.json(
        { error: rowError.message },
        { status: 500 }
      );
    }

    if (!row) {
      return NextResponse.json(
        { error: "No saved profile found for this user." },
        { status: 404 }
      );
    }

    const userProfileSummary = {
      full_name: row.full_name,
      university: row.university,
      gpa: row.gpa,
      skills: row.skills,
      internships: row.internships,
      leadership_positions: row.leadership_positions,
      projects: row.projects,
      others: row.others,
      entrepreneurial_leadership: row.entrepreneurial_leadership,
      personal_impact: row.personal_impact,
    };

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const prompt = `
You are an expert career coach. Your output will be parsed by code and shown in a structured report and PDF. You MUST return exactly one valid JSON object—no markdown, no code fences, no prose before or after.

INPUT: You will receive a JSON object with:
- userProfile: the candidate's parsed CV summary
- targetProfiles: real-world Fiber profiles (with experience_history, skills, education) for the target role/company
- successPattern: aggregate metrics from those profiles (common_previous_roles, top_skills_delta, avg_tenure_in_previous_step, impact_keyword_density)

TASK: Produce a DATA-DRIVEN gap analysis. Every claim must be grounded in the input data. Use percentages and counts where possible (e.g. "12 of 20 profiles had X").

OUTPUT FORMAT — You must return ONLY a single JSON object with these exact keys. Each value must be human-readable content (paragraphs or lists), NOT nested JSON or escaped strings:

1) "overallSummary": One short paragraph (2–4 sentences) summarizing how the candidate compares to the target profiles. Plain English only. Example: "Your profile is strong in X; relative to 20 target profiles, Y is a gap. Z% had prior experience in W."

2) "trajectoryFit": One short paragraph describing fit level (high/moderate/low) and why, with one concrete stat if possible. Plain English only. Example: "Moderate fit. About 65% of target profiles had a Big 4 or consulting internship before this role; your path is more product-focused."

3) "careerAnchors": An array of 3–6 short strings. Each string is ONE quantified insight about the target cohort (e.g. "87% IIT/IIM or equivalent pedigree", "~70% had a Tier-1 society role", "~60% had at least one strategy or finance internship"). No JSON inside strings.

4) "skillGaps": An object with exactly two keys:
   - "missingTechnical": Array of objects: { "name": "Skill name", "resourceUrl": "https://..." }. 3–8 skills the user lacks vs target profiles; each must have a real learning URL (Coursera, edX, Udemy, Kaggle, official docs, etc.). No invented or broken URLs.
   - "missingSoft": Array of 2–5 short skill names (e.g. "Stakeholder communication", "Client presentation").

5) "concreteActions": An array of 4–6 actionable bullet-point strings. Each must name a concrete step: company type, course name, or resource. Example: "Complete the Google Data Analytics certificate on Coursera." No nested JSON.

CRITICAL:
- Return ONLY the raw JSON object. No \`\`\`json\`\`\` or other markdown.
- Do NOT put a full JSON object or escaped JSON inside any string field. Each field must be readable text or a proper array/object.
- Populate ALL five top-level keys (overallSummary, trajectoryFit, careerAnchors, skillGaps, concreteActions). Empty arrays [] or short placeholder text are better than omitting a key or putting JSON inside a string.
`;

    const completion = await anthropic.messages.create({
      // Use Claude Sonnet 4.6 (correct model ID)
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      temperature: 0.3,
      system: "You are an expert Career Coach.",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "text",
              text: JSON.stringify({
                userProfile: userProfileSummary,
                // Send full structured profiles (with roles, skills, education)
                // so the model can make a truly data-driven comparison.
                targetProfiles: profiles,
                successPattern: pattern,
              }),
            },
          ],
        },
      ],
    });

    const textPart = completion.content.find(
      (c) => c.type === "text"
    ) as { type: "text"; text: string } | undefined;
    let content = textPart?.text?.trim() || "";
    if (!content) {
      return NextResponse.json(
        { error: "Gap model returned no content." },
        { status: 500 }
      );
    }

    // Try to coerce whatever Claude returned into the expected JSON shape.
    // We never hard‑fail; worst case we wrap the raw text as overallSummary.
    const stripFences = (text: string) =>
      text.replace(/```json/gi, "").replace(/```/g, "").trim();

    content = stripFences(content);

    let gapAnalysis: any = null;

    // 1) Try parsing as-is
    try {
      gapAnalysis = JSON.parse(content);
    } catch {
      // ignore
    }

    // 2) If it's a string that itself contains JSON, parse inner
    if (typeof gapAnalysis === "string") {
      try {
        gapAnalysis = JSON.parse(stripFences(gapAnalysis));
      } catch {
        // ignore
      }
    }

    // 3) If still not an object, try extracting between first/last { }
    if (!gapAnalysis || typeof gapAnalysis !== "object") {
      const firstBrace = content.indexOf("{");
      const lastBrace = content.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const inner = content.slice(firstBrace, lastBrace + 1);
        try {
          gapAnalysis = JSON.parse(inner);
        } catch {
          // ignore
        }
      }
    }

    // 4) Final fallback: at least give the UI something structured
    if (!gapAnalysis || typeof gapAnalysis !== "object") {
      gapAnalysis = {
        overallSummary: content,
        trajectoryFit: "",
        careerAnchors: [],
        skillGaps: { missingTechnical: [], missingSoft: [] },
        concreteActions: [],
      };
    }

    // 5) Normalise: ensure no field is a string containing JSON (would show as wall of text in UI/PDF)
    gapAnalysis = normaliseGapAnalysis(gapAnalysis);

    return NextResponse.json({ gapAnalysis });
  } catch (e: any) {
    console.error("[discovery] error:", e);
    return NextResponse.json(
      { error: e?.message || "Discovery failed" },
      { status: 500 }
    );
  }
}

