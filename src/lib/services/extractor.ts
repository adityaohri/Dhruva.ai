import Anthropic from "@anthropic-ai/sdk";
import { fetchJobHtml } from "@/lib/services/scrapingdog";

/**
 * Shape of a minimal job object coming from Sentinel before extraction.
 * Kept generic so this service can be reused across routes.
 */
export type RawJob = {
  title: string;
  url: string;
  snippet: string;
  source: string;
  company?: string | null;
  // Allow any additional fields (e.g. isDirect) to flow through.
  [key: string]: unknown;
};

export type EnrichedJob = RawJob & {
  /**
   * Human readable label used in the UI.
   * Nomenclature: "Company: Role".
   */
  displayName: string;
  /**
   * 3‑bullet AI summary of the role, or null if unavailable.
   */
  summary: string | null;
};

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic | null {
  if (!ANTHROPIC_API_KEY) {
    console.warn("[extractor] ANTHROPIC_API_KEY is not configured; job summaries will be skipped.");
    return null;
  }
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const LOCATION_TOKENS = [
  "bengaluru",
  "bangalore",
  "mumbai",
  "delhi",
  "new delhi",
  "gurgaon",
  "gurugram",
  "pune",
  "hyderabad",
  "chennai",
  "kolkata",
  "noida",
  "india",
  "remote",
];

function isLocationToken(value: string): boolean {
  const lower = value.toLowerCase().trim();
  if (!lower) return false;
  return LOCATION_TOKENS.includes(lower);
}

const REDUNDANT_PHRASES = [
  "hiring for",
  "we are hiring",
  "job opening for",
  "job opportunity",
  "apply now",
  "immediate joiner",
  "immediate joining",
];

const GENERIC_ROLE_TOKENS = new Set([
  "product",
  "designer",
  "consultant",
  "consulting",
  "strategy",
  "strategist",
  "analyst",
  "associate",
  "manager",
  "engineer",
  "developer",
  "officer",
  "executive",
  "intern",
  "internship",
  "lead",
  "principal",
  "director",
  "architect",
  "specialist",
  "advisor",
  "team",
  "consulting",
  "services",
  "consultancy",
  "pre-sales",
  "presales",
  "consulting team",
]);

function looksLikeGenericRoleName(name: string): boolean {
  const tokens = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length) return false;
  return tokens.every((t) => GENERIC_ROLE_TOKENS.has(t));
}

/**
 * Strict title normalisation for Opportunity Intelligence.
 *
 * - Strips leading locations (e.g. "Bengaluru:")
 * - Removes "Hiring for", "Hiring", "Careers at", etc.
 * - Drops redundant role suffixes ("jobs", "openings", "positions", "careers")
 * - Ensures the final format is: "<Company>: <Cleaned Role>"
 *
 * Example:
 *   normalizeJobTitle("Bengaluru: KPMG India hiring Consultant", "KPMG India")
 *   => "KPMG India: Consultant"
 */
export function normalizeJobTitle(rawTitle: string, rawCompany: string): string {
  const company = (rawCompany || "Unknown Company").trim();
  let title = (rawTitle || "").trim();

  // Strip some known noisy prefixes seen in aggregator snippets.
  title = title.replace(/^our\s+consulting\s+team\s*[:\-–—]\s*/i, "");
  title = title.replace(/^delhi,\s*india\.\s*sign\s*[:\-–—]\s*/i, "");
  title = title.replace(/^delhi,\s*india\.\s*the\s+role\s*[:\-–—]\s*/i, "");
  // Some Naukri snippets prefix with "Naukri:" which is not part of the role.
  title = title.replace(/^naukri\s*[:\-–—]\s*/i, "");
  // Some LinkedIn snippets prefix with "In:" which is not part of the role.
  title = title.replace(/^in\s*[:\-–—]\s*/i, "");

  // Remove leading location tags, e.g. "Bengaluru: KPMG India hiring Consultant"
  for (const loc of LOCATION_TOKENS) {
    const re = new RegExp(`^${escapeRegExp(loc)}\\s*[:\\-–—]\\s*`, "i");
    if (re.test(title)) {
      title = title.replace(re, "");
      break;
    }
  }

  let role: string | null = null;

  if (company) {
    // Pattern: "<Company> ... hiring (for) <Role>"
    const companyHiringRe = new RegExp(
      `${escapeRegExp(company)}[^\\n]*?hiring(?:\\s+for)?\\s+(.+)$`,
      "i"
    );
    const m1 = title.match(companyHiringRe);
    if (m1 && m1[1]) {
      role = m1[1];
    }

    // Pattern: "Hiring (for) <Role> at <Company>"
    if (!role) {
      const hiringAtRe = new RegExp(
        `hiring(?:\\s+for)?\\s+(.+?)\\s+at\\s+${escapeRegExp(company)}\\b`,
        "i"
      );
      const m2 = title.match(hiringAtRe);
      if (m2 && m2[1]) {
        role = m2[1];
      }
    }

    // Pattern: "Careers at <Company> - <Role>"
    if (!role) {
      const careersRe = new RegExp(
        `careers?\\s+at\\s+${escapeRegExp(company)}[^\\w]*([^-|:]+)$`,
        "i"
      );
      const m3 = title.match(careersRe);
      if (m3 && m3[1]) {
        role = m3[1];
      }
    }
  }

  if (!role) {
    // Remove "Careers at <Company>" prefix if present.
    if (company) {
      const careersAtCompanyRe = new RegExp(
        `^careers?\\s+at\\s+${escapeRegExp(company)}[\\s:|\\-–—]*`,
        "i"
      );
      title = title.replace(careersAtCompanyRe, "");
    }

    // Generic "Careers at X" prefix.
    title = title.replace(/^careers?\s+at\s+[^\-|:]+[:\-\s]*/i, "");

    // Leading "We are hiring", "Hiring for", "Hiring".
    title = title.replace(/^(we\s+are\s+hiring|hiring\s+for|hiring)\s+/i, "");

    // Remove company from beginning if repeated in title.
    if (company) {
      const companyPrefix = new RegExp(
        `^${escapeRegExp(company)}\\s*[-|–—:,]*\\s*`,
        "i"
      );
      title = title.replace(companyPrefix, "");

      // Also remove trailing "- Company" style suffixes from the title.
      const trailingCompanyDash = new RegExp(
        `[-|–—:,]\\s*${escapeRegExp(company)}\\s*$`,
        "i"
      );
      title = title.replace(trailingCompanyDash, "");

      const atCompanySuffix = new RegExp(
        `\\s+at\\s+${escapeRegExp(company)}\\b.*$`,
        "i"
      );
      title = title.replace(atCompanySuffix, "");
    }

    role = title;
  }

  // Remove experience tags like "0-2 years", "1 – 3 yrs", "5+ years"
  role = role.replace(/\b\d+\s*[-–]\s*\d+\s*(years?|yrs?)\b/gi, "");
  role = role.replace(/\b\d+\+?\s*(years?|yrs?)\b/gi, "");

  // Remove redundant phrases and role suffixes.
  role = role.replace(/\bhiring(?:\s+for)?\b/gi, "");
  role = role.replace(
    /\b(jobs?|openings?|roles?|positions?|opportunities?|careers?|career)\b/gi,
    ""
  );
  for (const phrase of REDUNDANT_PHRASES) {
    const re = new RegExp(escapeRegExp(phrase), "gi");
    role = role.replace(re, "");
  }

  // Clean stray separators and whitespace.
  role = role.replace(/^[\s\-–—|:,]+/, "").replace(/[\s\-–—|:,]+$/, "");
  role = role.replace(/\s+/g, " ").trim();

  const cleanedRoleName = role || "Role";
  return `${company}: ${cleanedRoleName}`;
}

// Backwards-compatible alias (if used elsewhere in the app).
export function standardizeTitle(rawTitle: string, company: string): string {
  return normalizeJobTitle(rawTitle, company);
}

/**
 * Claude Summarizer.
 *
 * Summarize a job description into three high‑impact bullet points for a
 * strong candidate considering this role.
 *
 * Prompt:
 * "Summarize this job description into 3 high-impact bullet points:
 *  1) The Core Mission,
 *  2) Key Skills required, and
 *  3) The \"Golden Step\" (why this role is a career accelerator)."
 */
export async function generateJobSummary(description: string): Promise<string | null> {
  const text = description?.trim();
  if (!text) return null;

  const client = getAnthropicClient();
  if (!client) return null;

  const prompt = [
    "You are a career coach helping a high-potential candidate quickly scan job listings.",
    "Using the raw job data below (title, company, snippet, and source),",
    "write ONE concise sentence (max ~30 words) that describes what this role is about and why it matters.",
    "",
    "Return only that single sentence, no bullet points, no list, no headings.",
    "",
    "RAW JOB DATA:",
    text,
  ].join("\n");

  try {
    const completion = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      temperature: 0.4,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const textPart = completion.content.find(
      (c) => c.type === "text"
    ) as { type: "text"; text: string } | undefined;

    const summary = textPart?.text?.trim() ?? "";
    return summary || null;
  } catch (e) {
    console.warn("[extractor] generateJobSummary failed:", e);
    return null;
  }
}

function guessCompanyFromDomain(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    const withoutTld = host.split(".")[0] || "";
    if (!withoutTld) return null;
    const tokens = withoutTld.split(/[-_]/).filter(Boolean);
    if (!tokens.length) return null;
    return tokens
      .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
      .join(" ");
  } catch {
    return null;
  }
}

async function aiExtractCompanyFromContext(
  url: string | undefined,
  snippet: string | undefined
): Promise<string | null> {
  const client = getAnthropicClient();
  if (!client) return null;

  const ctxUrl = url ?? "";
  const baseSnippet = snippet ?? "";
  if (!ctxUrl && !baseSnippet) return null;

  let htmlPreview = "";
  if (ctxUrl) {
    try {
      const html = await fetchJobHtml(ctxUrl);
      // Collapse whitespace and cap length so prompts stay bounded.
      htmlPreview = html.replace(/\s+/g, " ").slice(0, 4000);
    } catch (e) {
      console.warn("[extractor] fetchJobHtml failed in aiExtractCompanyFromContext:", e);
    }
  }

  const ctxSnippet =
    baseSnippet +
    (htmlPreview
      ? `\n\nHTML_PREVIEW (truncated):\n${htmlPreview}`
      : "");

  const prompt = [
    "You are helping normalise job listings.",
    "Given a job posting URL and snippet, extract the primary hiring company name.",
    "Return only the company name, with correct capitalisation, and no extra words.",
    "",
    `URL: ${ctxUrl}`,
    "",
    "Snippet:",
    ctxSnippet,
  ].join("\n");

  try {
    const completion = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 64,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const textPart = completion.content.find(
      (c) => c.type === "text"
    ) as { type: "text"; text: string } | undefined;

    const name = textPart?.text?.trim() ?? "";
    // Keep it short to avoid the model returning a whole sentence.
    if (!name || name.length > 80) return null;
    return name;
  } catch (e) {
    console.warn("[extractor] aiExtractCompanyFromContext failed:", e);
    return null;
  }
}

function isPlaceholderCompanyName(name: string): boolean {
  const lower = name.toLowerCase().trim();
  if (!lower) return true;
  if (lower === "myworkdayjobs.com" || lower === "myworkdayjobs.com 0") return true;
  if (lower.includes("myworkdayjobs.com")) return true;
  if (isLocationToken(lower)) return true;
  // Single-word "in" (from LinkedIn snippets) is never a company.
  if (lower === "in") return true;
  // Aggregator / job‑board brands should never be treated as the hiring company.
  if (/\b(naukri|linkedin|indeed|glassdoor|monster|google jobs?)\b/.test(lower)) return true;
  // Purely generic role phrases are not company names.
  if (looksLikeGenericRoleName(name)) return true;
  // Common marketing taglines we see in snippets.
  if (/\bwe are\b/.test(lower) && /\bfast\b/.test(lower)) return true;
  if (/series\s+a\s+startup/.test(lower)) return true;
  return false;
}

function extractCompanyFromCareersText(text: string | undefined): string | null {
  if (!text) return null;
  const m = text.match(/careers?\s+at\s+([A-Za-z0-9&.,'()\- ]{2,80})/i);
  if (!m || !m[1]) return null;
  let company = m[1].trim();
  // Drop anything after common separators, e.g. "Careers at KPMG India - Consulting"
  company = company.replace(/[-–—|:].*$/, "").trim();
  if (!company) return null;
  return company
    .split(/\s+/)
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .join(" ");
}

function deriveCompanyFromWorkdayUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (!host.includes("myworkdayjobs.com")) return null;

    const subdomain = host.split(".")[0]; // e.g. "kpmg" from "kpmg.wd3.myworkdayjobs.com"
    let name = subdomain.replace(/^wd\d*$/i, "").trim();
    if (!name) {
      // Fallback: look for a segment like "KPMG_Careers" in the path.
      const seg = u.pathname
        .split("/")
        .filter(Boolean)
        .find((s) => /careers/i.test(s));
      if (seg) {
        name = seg.split(/[_-]/)[0];
      }
    }
    if (!name) return null;
    return name
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
      .join(" ");
  } catch {
    return null;
  }
}

function deriveCompanyFromTitle(titleRaw: string): string | null {
  if (!titleRaw) return null;
  let title = titleRaw.trim();

  // Strip leading "<Location>:" prefixes
  for (const loc of LOCATION_TOKENS) {
    const re = new RegExp(`^${escapeRegExp(loc)}\\s*[:\\-–—]\\s*`, "i");
    if (re.test(title)) {
      title = title.replace(re, "").trim();
      break;
    }
  }

  const ROLE_KEYWORDS = [
    "Consultant",
    "Analyst",
    "Associate",
    "Manager",
    "Engineer",
    "Developer",
    "Intern",
    "Internship",
    "Lead",
    "Principal",
    "Director",
    "Architect",
    "Scientist",
    "Strategist",
    "Specialist",
    "Advisor",
    "Product Manager",
    "Program Manager",
    "Project Manager",
  ];

  for (const roleWord of ROLE_KEYWORDS) {
    const re = new RegExp(`^(.+?)\\s+${escapeRegExp(roleWord)}\\b`, "i");
    const m = title.match(re);
    if (m && m[1]) {
      const candidate = m[1].trim();
      if (candidate && !isLocationToken(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

function extractCompanyFromSnippetIntro(snippet: string | undefined): string | null {
  if (!snippet) return null;
  const text = snippet.trim();
  if (!text) return null;

  // Pattern: "At DiligenceVault, we are..." or "At Webologix Ltd/ INC in Bengaluru..."
  const m = text.match(
    /\bAt\s+([A-Z][A-Za-z0-9&.,'()/\- ]{1,80}?)(?=,|\s+we\b|\sin\b|\.|\|)/i
  );
  if (!m || !m[1]) return null;
  let company = m[1].trim();
  // Strip trailing obvious location fragments.
  company = company.replace(/\b(India|Bengaluru|Bangalore|Mumbai|Delhi)\b.*$/i, "").trim();
  if (!company || isLocationToken(company)) return null;
  return company
    .split(/\s+/)
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .join(" ");
}

/**
 * Standardise a raw Sentinel job into an enriched job with:
 * - displayName: "Company: Role"
 * - summary: 3‑bullet AI summary (when possible)
 */
export async function standardiseAndSummariseJob(raw: RawJob): Promise<EnrichedJob> {
  const url = raw.url as string | undefined;
  const snippet = raw.snippet as string | undefined;
  let rawCompany = (raw.company ?? "").toString().trim();
  if (rawCompany && isPlaceholderCompanyName(rawCompany)) {
    rawCompany = "";
  }

  const careersCompany = extractCompanyFromCareersText(
    `${raw.title ?? ""} ${raw.snippet ?? ""}`
  );
  const workdayCompany = deriveCompanyFromWorkdayUrl(url);
  const snippetIntroCompany = extractCompanyFromSnippetIntro(snippet);
  const titleCompany = deriveCompanyFromTitle((raw.title ?? "").toString());

  let company: string | null = null;

  const candidateOrder: Array<string | null> = [
    rawCompany,
    careersCompany,
    workdayCompany,
    snippetIntroCompany,
    guessCompanyFromDomain(url),
  ];

  for (const c of candidateOrder) {
    if (c && !isPlaceholderCompanyName(c)) {
      company = c;
      break;
    }
  }

  if (!company) {
    const aiCompany = await aiExtractCompanyFromContext(url, snippet);
    if (aiCompany && !isPlaceholderCompanyName(aiCompany)) {
      company = aiCompany;
    }
  }

  if (!company && titleCompany && !isPlaceholderCompanyName(titleCompany)) {
    company = titleCompany;
  }

  if (!company) {
    company = "Unknown Company";
  }

  const displayName = normalizeJobTitle((raw.title ?? "").toString(), company);

  const summaryInput = JSON.stringify({
    title: raw.title ?? "",
    company,
    snippet: raw.snippet ?? "",
    source: raw.source ?? "",
    url: raw.url ?? "",
  });
  const summary = await generateJobSummary(summaryInput);

  return {
    ...raw,
    company,
    displayName,
    summary: summary ?? null,
  };
}

/**
 * Convenience helper to enrich an array of jobs in parallel.
 */
export async function standardiseAndSummariseJobs<T extends RawJob>(
  jobs: T[]
): Promise<Array<EnrichedJob & T>> {
  const enriched = await Promise.all(
    jobs.map((job) => standardiseAndSummariseJob(job))
  );
  // TypeScript cannot see that EnrichedJob & T is satisfied; cast at the boundary.
  return enriched as Array<EnrichedJob & T>;
}

