import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
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

// Fiber AI & OpenAI keys
const FIBER_API_KEY = process.env.FIBER_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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
  pageSize: number = 10
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
      keywords: {
        containsAny: [targetRole],
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
  const results =
    (Array.isArray(data) && data) ||
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
    raw.linkedin_url ||
    raw.linkedinUrl ||
    raw.linkedin ||
    raw.profile_url ||
    raw.profileUrl ||
    null
  );
}

async function suggestPeerCompanies(
  targetRole: string,
  targetCompany: string
): Promise<string[]> {
  if (!OPENAI_API_KEY) return [];

  const client = new OpenAI({ apiKey: OPENAI_API_KEY });
  const prompt = [
    "You are a career intelligence assistant.",
    `Given the target role "${targetRole}" at company "${targetCompany}",`,
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

export async function POST(req: NextRequest) {
  const { targetRole, targetCompany, phase } = await req.json();

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
    let rawResults = await fiberPersonSearch(targetRole, targetCompany);

    if (rawResults.length < 5) {
      const peers = await suggestPeerCompanies(targetRole, targetCompany);
      for (const peer of peers) {
        const more = await fiberPersonSearch(targetRole, peer);
        rawResults = rawResults.concat(more);
      }
    }

    // Public view used by the dashboard: names + LinkedIn URLs
    const publicProfiles = rawResults.map((raw: any) => ({
      full_name: raw.full_name || raw.name || raw.display_name || "Unknown",
      linkedin_url: getLinkedInUrl(raw),
    }));

    if (mode === "fiber") {
      // For the first call, just show the target profiles list
      return NextResponse.json({ profiles: publicProfiles });
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

    const targetProfilesPublic = publicProfiles;

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey: OPENAI_API_KEY });

    const prompt = `
You are an expert Career Coach.

Compare this user's profile against the successful "Target Profiles" found by Fiber.

Treat “Experience”, “Work Experience”, and “Internships” as the same dimension when comparing.

Analyze discrepancies across:
- GPA
- Internships / Experience
- Leadership
- Projects
- Personal Impact
- Skills

Return ONLY a JSON object in the following shape:

{
  "gpa": { "assessment": string, "recommendations": string[] },
  "experience": { "assessment": string, "recommendations": string[] },
  "leadership": { "assessment": string, "recommendations": string[] },
  "projects": { "assessment": string, "recommendations": string[] },
  "personalImpact": { "assessment": string, "recommendations": string[] },
  "skills": {
    "missingTechnical": string[],
    "missingSoft": string[],
    "summary": string
  },
  "bonusPointers": string[]
}

Do not include any explanatory text outside of this JSON.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      temperature: 0.3,
      messages: [
        { role: "system", content: "You are an expert Career Coach." },
        {
          role: "user",
          content: prompt,
        },
        {
          role: "user",
          content: JSON.stringify({
            userProfile: userProfileSummary,
            targetProfiles: targetProfilesPublic,
            successPattern: pattern,
          }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "OpenAI returned no content." },
        { status: 500 }
      );
    }

    let gapAnalysis: any;
    try {
      gapAnalysis = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "OpenAI returned invalid JSON." },
        { status: 500 }
      );
    }

    return NextResponse.json({ gapAnalysis, profiles: publicProfiles });
  } catch (e: any) {
    console.error("[discovery] error:", e);
    return NextResponse.json(
      { error: e?.message || "Discovery failed" },
      { status: 500 }
    );
  }
}

