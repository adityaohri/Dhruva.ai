// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-ignore - Deno / ESM import; valid in Supabase Edge Runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
// @ts-ignore - Deno path import within functions folder
import {
  SIGNAL_SEARCH_QUERIES,
  INDUSTRY_SIGNAL_OVERLAYS,
  WATCHLIST_QUERY_TEMPLATES,
  INDIAN_SIGNAL_SOURCES,
  EXCLUDED_SIGNAL_DOMAINS,
  SignalType,
} from "./signalSources.ts"
import {
  enrichWithJobData,
  updateCompanySignalHistory,
  calculateBoostedStrength,
  normaliseCompanyName,
} from "./enrichSignal.ts"

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (handler: (req: Request) => Promise<Response>) => void;
};

const ALL_INDUSTRIES = [
  "consulting", "technology", "finance", "marketing", "operations",
  "product", "data & analytics", "investment banking",
  "private equity & vc", "fmcg", "pharma & healthcare",
  "energy & infrastructure", "media & entertainment", "legal",
  "human resources", "real estate", "logistics & supply chain",
  "e-commerce & d2c", "edtech", "banking & financial services",
  "manufacturing & automotive",
]

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const EXA_API_KEY = Deno.env.get("EXA_API_KEY")!
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!

// ─── Exa search ──────────────────────────────────────────────────────────────

async function exaSearch(query: string): Promise<ExaResult[]> {
  console.log("[EXA] Searching for:", query)
  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": EXA_API_KEY,
    },
    body: JSON.stringify({
      query,
      numResults: 5,
      useAutoprompt: true,
      type: "neural",
      startPublishedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      contents: {
        text: { maxCharacters: 800 },
      },
    }),
  })
  const data = await res.json()
  console.log("[EXA] Status:", res.status, "Results:", data.results?.length ?? 0)
  if (!res.ok) console.log("[EXA] Full error:", JSON.stringify(data))
  if (!res.ok) return []
  return data.results ?? []
}

// ─── Claude Haiku classifier ─────────────────────────────────────────────────

async function classifySignal(
  result: ExaResult,
  industry: string
): Promise<ClassifiedSignal | null> {
  console.log("[CLASSIFY] Classifying:", result.title)
  const systemPrompt = `You are a hiring signal classifier for Indian companies.
Given a news article, determine if it indicates a company is likely to hire new people in the next 30–90 days.

Signal types and calibrated strength scores:
- funding (90): Company raised investment — seed, pre-A, series A/B/C/D, growth round, debt funding
- contract_win (85): Won government tender, GeM order, PSU deal, large enterprise contract
- leadership (80): New CXO, VP, Director, MD joined or appointed
- geography (75): New office, new city, new market, new country entered
- product_launch (70): New product, platform, app, service, or major feature launched
- workstream (65): M&A, new vertical, strategic partnership, JV, demerger, pivot
- headcount (62): Hiring milestone crossed, team growth announced, mass hiring drive
- job_posting_surge (60): Multiple open roles posted, urgent hiring announced
- regulatory (55): SEBI/RBI/DPIIT/FSSAI/IRDAI/CDSCO approval, new licence granted
- virality (50): YC/Shark Tank/major accelerator selection, unicorn/soonicorn status, award

Rules:
- Only return isSignal true if you are confident the company will hire soon
- Extract the exact company name as it appears in the article
- Guess the company domain from the company name (e.g. Razorpay → razorpay.com)
- Write summary in ONE crisp sentence, maximum 15 words, explaining why this = hiring
- Respond ONLY with valid JSON. No markdown, no backticks, no explanation.

JSON format:
{
  "isSignal": true or false,
  "signalType": "one of the 10 signal type strings above" or null,
  "companyName": "exact company name" or null,
  "companyDomain": "domain.com" or null,
  "signalStrength": number 0-100,
  "summary": "one crisp sentence max 15 words" or null
}`

  const userPrompt = `Title: ${result.title}
Content: ${(result.text ?? "").slice(0, 800)}
Published: ${result.publishedDate ?? "unknown"}
Industry context: ${industry}
Source URL: ${result.url}`

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    })

    const raw = await res.text()
    console.log("[CLASSIFY] Claude status:", res.status)
    console.log("[CLASSIFY] Claude raw:", raw)

    if (!res.ok) return null

    let data: any
    try {
      data = JSON.parse(raw)
    } catch (err) {
      console.log("[CLASSIFY] JSON parse error:", String(err))
      return null
    }

    const text = data?.content?.[0]?.text
    console.log("[CLASSIFY] Claude response:", text)
    if (!text) return null
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim())
    if (!parsed.isSignal) return null

    // Override strength with our calibrated map
    const strengthMap: Record<string, number> = {
      funding: 90, contract_win: 85, leadership: 80, geography: 75,
      product_launch: 70, workstream: 65, headcount: 62,
      job_posting_surge: 60, regulatory: 55, virality: 50,
    }

    return {
      isSignal: true,
      signalType: parsed.signalType ?? null,
      companyName: parsed.companyName ?? null,
      companyDomain: parsed.companyDomain ?? null,
      signalStrength: parsed.signalType ? (strengthMap[parsed.signalType] ?? parsed.signalStrength) : parsed.signalStrength,
      summary: parsed.summary ?? null,
    }
  } catch {
    return null
  }
}

// ─── Upsert signal to Supabase ────────────────────────────────────────────────

async function upsertSignal(
  result: ExaResult,
  classified: ClassifiedSignal,
  industry: string,
  mode: "industry" | "watchlist",
  watchlistCompany?: string
) {
  const jobData = classified.companyName
    ? await enrichWithJobData(classified.companyName)
    : { job_count: 0, job_titles: [], job_count_30d: 0, canonical_company_name: null }

  const signalHistory = classified.companyName
    ? await updateCompanySignalHistory(
        classified.companyName,
        classified.companyDomain,
        classified.signalType ?? "",
        industry
      )
    : 0

  const boostedStrength = calculateBoostedStrength(
    classified.signalStrength,
    jobData.job_count,
    signalHistory
  )

  // Use canonical company name from jobs_index if available
  const finalCompanyName = jobData.canonical_company_name ?? classified.companyName

  console.log(
    "[UPSERT] Company:", finalCompanyName,
    "| Signal:", classified.signalType,
    "| Strength:", boostedStrength,
    "| Jobs:", jobData.job_count,
    "| History:", signalHistory
  )

  await supabase.from("signals_index").upsert(
    {
      title: result.title,
      url: result.url,
      snippet: (result.text ?? "").slice(0, 300),
      company_name: finalCompanyName,
      company_domain: classified.companyDomain,
      signal_type: classified.signalType,
      signal_strength: boostedStrength,
      summary: classified.summary,
      industry: industry.toLowerCase(),
      posted_at: result.publishedDate
        ? new Date(result.publishedDate).toISOString()
        : new Date().toISOString(),
      is_active: true,
      is_reviewed: false,
      mode,
      watchlist_company: watchlistCompany ?? null,
      job_count: jobData.job_count,
      job_titles: jobData.job_titles,
      job_count_30d: jobData.job_count_30d,
    },
    { onConflict: "url" }
  )
}

// ─── Industry mode processor ──────────────────────────────────────────────────

async function processIndustry(
  industry: string,
  signalType: SignalType
) {
  const seen = new Set<string>()
  let processed = 0

  const generic = SIGNAL_SEARCH_QUERIES[signalType] ?? []
  const overlay = (INDUSTRY_SIGNAL_OVERLAYS[industry] as Record<string, string[]> | undefined)?.[signalType] ?? []
  const queries = [...generic, ...overlay].slice(0, 6)

  console.log("[PROCESS] Industry:", industry, "Signal:", signalType, "Queries:", queries.length)

  for (const query of queries) {
    const results = await exaSearch(query)
    for (const result of results) {
      if (seen.has(result.url)) continue
      seen.add(result.url)

      const classified = await classifySignal(result, industry)
      if (!classified) continue

      await upsertSignal(result, classified, industry, "industry")
      processed++
    }
    await new Promise(r => setTimeout(r, 300))
  }

  return processed
}

// ─── Watchlist mode processor ─────────────────────────────────────────────────

async function processWatchlist() {
  // Fetch all distinct watchlisted companies across all users
  const { data: companies } = await supabase
    .from("tracked_companies")
    .select("company_name, company_domain")

  if (!companies || companies.length === 0) return 0

  // Deduplicate by company_name
  const unique = Array.from(
    new Map(
      (companies as any[]).map((c: any) => [
        String(c.company_name ?? "").toLowerCase(),
        c,
      ]),
    ).values()
  )

  let processed = 0
  const seen = new Set<string>()

  for (const company of unique) {
    for (const signalType of SIGNAL_TYPES) {
      const templates = WATCHLIST_QUERY_TEMPLATES[signalType] ?? []
      const queries = templates
        .map((t: string) => t.replace(/\{\{COMPANY\}\}/g, company.company_name))
        .slice(0, 3) // max 3 queries per signal type per company per run

      for (const query of queries) {
        const results = await exaSearch(query)
        for (const result of results) {
          if (seen.has(result.url)) continue
          seen.add(result.url)

          const classified = await classifySignal(result, "general")
          if (!classified) continue

          // Only keep signals that actually mention this company
          const mentionsCompany = result.title
            .toLowerCase()
            .includes(company.company_name.toLowerCase()) ||
            (result.text ?? "")
              .toLowerCase()
              .includes(company.company_name.toLowerCase())
          if (!mentionsCompany) continue

          await upsertSignal(
            result,
            classified,
            classified.signalType ?? "general",
            "watchlist",
            company.company_name
          )
          processed++
        }
        await new Promise(r => setTimeout(r, 300))
      }
    }
  }

  return processed
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  const body = await req.json().catch(() => ({}))
  const mode: "industry" | "watchlist" = body.mode ?? "industry"
  const signalType: SignalType = body.signalType ?? "funding"
  const industry: string | null = body.industry ?? null

  try {
    if (mode === "watchlist") {
      const count = await processWatchlist()
      return new Response(
        JSON.stringify({ ok: true, mode: "watchlist", processed: count }),
        { headers: { "Content-Type": "application/json" } }
      )
    }

    // If a specific industry is passed, process just that one
    if (industry) {
      const count = await processIndustry(industry, signalType)
      return new Response(
        JSON.stringify({ ok: true, mode: "industry", industry, signalType, processed: count }),
        { headers: { "Content-Type": "application/json" } }
      )
    }

    // Otherwise loop through ALL industries for this signal type
    let total = 0
    for (const ind of ALL_INDUSTRIES) {
      const count = await processIndustry(ind, signalType)
      total += count
      await new Promise(r => setTimeout(r, 500))
    }

    return new Response(
      JSON.stringify({ ok: true, mode: "industry", signalType, processed: total }),
      { headers: { "Content-Type": "application/json" } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExaResult {
  title: string
  url: string
  text?: string
  publishedDate?: string
}

interface ClassifiedSignal {
  isSignal: boolean
  signalType: string | null
  companyName: string | null
  companyDomain: string | null
  signalStrength: number
  summary: string | null
}

