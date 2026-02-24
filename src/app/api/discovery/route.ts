import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

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

const PROXYCURL_API_KEY = process.env.PROXYCURL_API_KEY;
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

function estimateProxycurlCost(numResults: number): number {
  return numResults * 2.5; // mid-point of 2–3 credits / result
}

async function proxycurlPersonSearch(
  targetRole: string,
  targetCompany: string,
  pageSize: number = 10
): Promise<any[]> {
  if (!PROXYCURL_API_KEY) {
    throw new Error("PROXYCURL_API_KEY is not configured.");
  }

  const url = "https://nubela.co/proxycurl/api/v2/search/person/";
  const params = new URLSearchParams({
    enrich_profiles: "enrich",
    current_role_title: targetRole,
    current_company_name: targetCompany,
    page_size: String(pageSize),
  });

  const resp = await fetch(`${url}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${PROXYCURL_API_KEY}`,
    },
    cache: "no-store",
  });

  if (!resp.ok) {
    throw new Error(`Proxycurl error ${resp.status}: ${await resp.text()}`);
  }

  const data = await resp.json();
  const results = Array.isArray(data) ? data : data.results ?? [];
  console.log(
    "[discovery] Proxycurl returned",
    results.length,
    "results (~",
    estimateProxycurlCost(results.length),
    "credits)"
  );
  return results;
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

function mapProxycurlProfile(raw: any): SuccessProfile {
  const full_name = raw.full_name || raw.name || "Unknown";
  const headline = raw.headline || "";

  const experiencesRaw = raw.experiences || raw.employment || [];
  const experience_history: ExperienceEntry[] = [];
  for (const exp of experiencesRaw) {
    const title = exp.title || exp.role || "";
    let company = "";
    if (exp.company && typeof exp.company === "object") {
      company = exp.company.name || "";
    } else if (typeof exp.company === "string") {
      company = exp.company;
    }
    if (!title && !company) continue;
    experience_history.push({
      title,
      company,
      start_date: exp.start_date || exp.starts_at || null,
      end_date: exp.end_date || exp.ends_at || null,
      description: exp.description || exp.summary || null,
    });
  }

  const skillsRaw = raw.skills || [];
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

  const educationRaw = raw.education || [];
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
  const { targetRole, targetCompany } = await req.json();

  if (!targetRole || !targetCompany) {
    return NextResponse.json(
      { error: "targetRole and targetCompany are required" },
      { status: 400 }
    );
  }

  const key = `${targetCompany}::${targetRole}`.toLowerCase();
  if (cache.has(key)) {
    const cached = cache.get(key)!;
    return NextResponse.json(cached);
  }

  try {
    let rawResults = await proxycurlPersonSearch(targetRole, targetCompany);

    if (rawResults.length < 5) {
      const peers = await suggestPeerCompanies(targetRole, targetCompany);
      for (const peer of peers) {
        const more = await proxycurlPersonSearch(targetRole, peer);
        rawResults = rawResults.concat(more);
      }
    }

    const profiles = rawResults.map(mapProxycurlProfile);
    const pattern = deriveSuccessPattern(profiles, targetRole, targetCompany);

    const result: DiscoveryResult = {
      profiles: profiles.slice(0, 10),
      pattern,
    };
    cache.set(key, result);

    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[discovery] error:", e);
    return NextResponse.json(
      { error: e?.message || "Discovery failed" },
      { status: 500 }
    );
  }
}

