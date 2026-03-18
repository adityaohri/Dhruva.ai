import { createClient } from "@/lib/supabase/client";

const CACHE_THRESHOLD = 15;
// Minimum profiles needed to skip PDL call

async function checkInternalCache(
  role: string,
  company?: string,
  industry?: string
): Promise<{ hasEnough: boolean; profiles: any[] }> {
  const supabase = createClient();
  const safeRole = (role ?? "").trim();
  const safeCompany = company?.trim();
  const safeIndustry = industry?.trim();

  let query = supabase.from("benchmark_profiles").select("*").limit(30);

  if (safeCompany) {
    query = query
      .ilike("job_company_name", `%${safeCompany}%`)
      .ilike("job_title", `%${safeRole}%`);
  } else if (safeIndustry) {
    query = query
      .ilike("job_company_industry", `%${safeIndustry}%`)
      .ilike("job_title", `%${safeRole}%`);
  } else {
    query = query.ilike("job_title", `%${safeRole}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("[benchmarkProfiles] cache query error:", error.message);
    return { hasEnough: false, profiles: [] };
  }

  const results = (data as any[]) ?? [];
  return {
    hasEnough: results.length >= CACHE_THRESHOLD,
    profiles: results,
  };
}

function mapPdlPersonToRow(
  person: any,
  queryRole: string,
  queryCompany: string | undefined,
  queryIndustry: string | undefined,
  queryPass: string
): Record<string, any> {
  const knownKeys = new Set<string>([
    "pdl_id",
    "full_name",
    "first_name",
    "last_name",
    "middle_name",
    "gender",
    "birth_year",
    "job_title",
    "job_title_role",
    "job_title_sub_role",
    "job_title_levels",
    "job_company_name",
    "job_company_id",
    "job_company_industry",
    "job_company_size",
    "job_company_founded",
    "job_company_type",
    "job_company_location_name",
    "job_company_location_country",
    "job_start_date",
    "job_last_updated",
    "location_name",
    "location_country",
    "location_region",
    "location_locality",
    "location_metro",
    "location_postal_code",
    "location_street_address",
    "location_geo",
    "location_last_updated",
    "education",
    "highest_education_degree",
    "highest_education_school",
    "highest_education_field",
    "highest_education_gpa",
    "highest_education_start_date",
    "highest_education_end_date",
    "experience",
    "total_experience_months",
    "inferred_years_experience",
    "skills",
    "linkedin_url",
    "linkedin_username",
    "linkedin_id",
    "github_url",
    "github_username",
    "twitter_url",
    "twitter_username",
    "facebook_url",
    "emails",
    "phone_numbers",
    "industry",
    "inferred_salary",
    "inferred_salary_currency",
    "certifications",
    "languages",
    "interests",
    "summary",
    "query_role",
    "query_company",
    "query_industry",
    "query_pass",
    "pdl_likelihood",
    "pdl_version",
    "updated_at",
    "additional_fields",
  ]);

  const education0 = person?.education?.[0];
  const row: Record<string, any> = {
    pdl_id: person.id,
    full_name: person.full_name,
    first_name: person.first_name,
    last_name: person.last_name,
    middle_name: person.middle_name,
    gender: person.gender,
    birth_year: person.birth_year,
    job_title: person.job_title,
    job_title_role: person.job_title_role,
    job_title_sub_role: person.job_title_sub_role,
    job_title_levels: person.job_title_levels ?? [],
    job_company_name: person.job_company_name,
    job_company_id: person.job_company_id,
    job_company_industry: person.job_company_industry,
    job_company_size: person.job_company_size,
    job_company_founded: person.job_company_founded,
    job_company_type: person.job_company_type,
    job_company_location_name: person.job_company_location_name,
    job_company_location_country: person.job_company_location_country,
    job_start_date: person.job_start_date,
    job_last_updated: person.job_last_updated,
    location_name: person.location_name,
    location_country: person.location_country,
    location_region: person.location_region,
    location_locality: person.location_locality,
    location_metro: person.location_metro,
    location_postal_code: person.location_postal_code,
    location_street_address: person.location_street_address,
    location_geo: person.location_geo,
    location_last_updated: person.location_last_updated,
    education: person.education ?? [],
    highest_education_degree: education0?.degrees?.[0] ?? null,
    highest_education_school: education0?.school?.name ?? null,
    highest_education_field: education0?.majors?.[0] ?? null,
    highest_education_gpa: education0?.gpa ?? null,
    highest_education_start_date: education0?.start_date ?? null,
    highest_education_end_date: education0?.end_date ?? null,
    experience: person.experience ?? [],
    total_experience_months: person.inferred_years_experience
      ? person.inferred_years_experience * 12
      : null,
    inferred_years_experience: person.inferred_years_experience,
    skills: person.skills ?? [],
    linkedin_url: person.linkedin_url,
    linkedin_username: person.linkedin_username,
    linkedin_id: person.linkedin_id,
    github_url: person.github_url,
    github_username: person.github_username,
    twitter_url: person.twitter_url,
    twitter_username: person.twitter_username,
    facebook_url: person.facebook_url,
    emails: person.emails ?? [],
    phone_numbers: person.phone_numbers ?? [],
    industry: person.industry,
    inferred_salary: person.inferred_salary,
    inferred_salary_currency: person.inferred_salary_currency,
    certifications: person.certifications ?? [],
    languages: person.languages ?? [],
    interests: person.interests ?? [],
    summary: person.summary,
    query_role: queryRole,
    query_company: queryCompany ?? null,
    query_industry: queryIndustry ?? null,
    query_pass: queryPass,
    pdl_likelihood: person.likelihood,
    pdl_version: person.version,
    updated_at: new Date().toISOString(),
  };

  const additional: Record<string, unknown> = {};
  if (person && typeof person === "object") {
    for (const [k, v] of Object.entries(person)) {
      if (knownKeys.has(k)) continue;
      additional[k] = v;
    }
  }
  row.additional_fields = additional;

  return row;
}

async function storePdlResults(
  results: any[],
  queryRole: string,
  queryCompany: string | undefined,
  queryIndustry: string | undefined,
  queryPass: string
): Promise<number> {
  const supabase = createClient();
  let count = 0;

  for (const person of results ?? []) {
    const row = mapPdlPersonToRow(
      person,
      queryRole,
      queryCompany,
      queryIndustry,
      queryPass
    );

    const { error } = await supabase
      .from("benchmark_profiles")
      .upsert(row, { onConflict: "pdl_id" });

    if (error) {
      console.warn("[benchmarkProfiles] upsert error:", error.message);
      continue;
    }
    count++;
  }

  return count;
}

async function pdlPersonSearch(
  role: string,
  company?: string,
  industry?: string,
  size: number = 30
): Promise<{ results: any[]; pass: string }> {
  const PDL_API_KEY = process.env.PDL_API_KEY;
  if (!PDL_API_KEY) {
    console.warn("[benchmarkProfiles] PDL_API_KEY is not configured.");
    return { results: [], pass: "no-key" };
  }

  const baseUrl = "https://api.peopledatalabs.com/v5/person/search";
  const params = new URLSearchParams();
  params.set("api_key", PDL_API_KEY);

  const baseMust: any[] = [];
  const safeRole = role.trim();
  const safeCompany = company?.trim();
  const safeIndustry = industry?.trim();

  if (safeRole) baseMust.push({ match_phrase: { job_title: safeRole } });
  if (safeCompany) baseMust.push({ match_phrase: { job_company_name: safeCompany } });
  baseMust.push({ term: { location_country: "india" } });

  const passes: { must: any[]; label: string }[] = [];
  if (safeIndustry) {
    passes.push({
      must: [
        ...baseMust,
        { match_phrase: { industry: safeIndustry } },
        { match_phrase: { job_company_industry: safeIndustry } },
      ],
      label: "role+company+industry",
    });
  }
  passes.push({ must: baseMust, label: "role+company" });
  if (safeCompany) {
    passes.push({
      must: [
        { term: { location_country: "india" } },
        { match_phrase: { job_company_name: safeCompany } },
      ],
      label: "company-only",
    });
  }

  for (const pass of passes) {
    const esQuery = { query: { bool: { must: pass.must } } };
    const resp = await fetch(`${baseUrl}?${params.toString()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ size, query: esQuery }),
      cache: "no-store",
    });
    const text = await resp.text().catch(() => "");
    if (resp.status === 404) continue;
    if (!resp.ok) {
      console.warn(
        "[benchmarkProfiles] PDL person/search error",
        resp.status,
        text?.slice(0, 200)
      );
      continue;
    }

    const data = text ? JSON.parse(text) : {};
    const results =
      (Array.isArray(data) && data) ||
      data.data ||
      data.results ||
      [];

    if (Array.isArray(results) && results.length > 0) {
      return { results, pass: pass.label };
    }
  }

  return { results: [], pass: "none" };
}

export async function getBenchmarkProfiles(
  role: string,
  company?: string,
  industry?: string
): Promise<{
  profiles: any[];
  source: "cache" | "pdl" | "empty";
  count: number;
}> {
  const cache = await checkInternalCache(role, company, industry);
  if (cache.hasEnough) {
    return { profiles: cache.profiles, source: "cache", count: cache.profiles.length };
  }

  const { results, pass } = await pdlPersonSearch(role, company, industry, 30);
  if (results.length > 0) {
    await storePdlResults(results, role, company, industry, pass);
    return { profiles: results, source: "pdl", count: results.length };
  }

  return {
    profiles: cache.profiles,
    source: cache.profiles.length > 0 ? "cache" : "empty",
    count: cache.profiles.length,
  };
}

export { checkInternalCache, mapPdlPersonToRow, storePdlResults };

