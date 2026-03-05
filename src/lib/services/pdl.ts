const PDL_API_KEY = process.env.PDL_API_KEY;

export interface PdlPerson {
  full_name?: string;
  job_title?: string;
  job_company_name?: string;
  linkedin_url?: string;
  education?: Array<{ school?: string | null }>;
  industry?: string | null;
}

export interface PdlPeopleResponse {
  people: PdlPerson[];
}

async function pdlSearch(
  must: any[],
  size: number
): Promise<PdlPerson[]> {
  if (!PDL_API_KEY) {
    console.warn("[pdl] PDL_API_KEY is not configured.");
    return [];
  }

  const baseUrl = "https://api.peopledatalabs.com/v5/person/search";

  const params = new URLSearchParams();
  params.set("api_key", PDL_API_KEY);

  const esQuery = {
    query: {
      bool: {
        must,
      },
    },
  };

  const resp = await fetch(`${baseUrl}?${params.toString()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      size,
      query: esQuery,
    }),
    cache: "no-store",
  });

  const text = await resp.text().catch(() => "");
  if (!resp.ok) {
    console.warn(
      "[pdl] person/search error",
      resp.status,
      text?.slice(0, 200)
    );
    return [];
  }
  const data = text ? JSON.parse(text) : {};
  const results =
    (Array.isArray(data) && data) ||
    data.data ||
    data.results ||
    [];
  if (!Array.isArray(results)) return [];
  return results as PdlPerson[];
}

/**
 * Find 10–15 people at the given company who share an alumni or industry
 * connection with the user.
 */
export async function findRelevantPeopleForCompany(params: {
  company: string;
  alumniSchool?: string | null;
  industryHint?: string | null;
  size?: number;
}): Promise<PdlPeopleResponse> {
  const company = params.company.trim();
  if (!company) {
    return { people: [] };
  }
  const size = params.size ?? 15;

  const must: any[] = [
    { term: { location_country: "india" } },
    { match_phrase: { job_company_name: company } },
  ];

  if (params.industryHint) {
    must.push({
      match_phrase: { industry: params.industryHint },
    });
  }

  if (params.alumniSchool) {
    must.push({
      match_phrase: { education_school_name: params.alumniSchool },
    });
  }

  const people = await pdlSearch(must, size);
  return { people };
}

