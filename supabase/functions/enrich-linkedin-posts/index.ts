/* eslint-disable @typescript-eslint/no-explicit-any */
import "https://deno.land/x/xhr@0.1.0/mod.ts";
// @ts-ignore - Deno / ESM import; valid in Supabase Edge Runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (handler: (req: Request) => Promise<Response>) => void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function shouldKeepLowIntentPost(
  companyName: string | null,
  posterTitle: string | null,
  scrapedAt: string | null,
  enrichmentConfidence: string | null,
  enrichmentAttempts: number
): Promise<boolean> {
  // Rule 1A — Delete if low confidence AND already enriched twice AND older than 7 days
  if (
    enrichmentConfidence === "low" &&
    enrichmentAttempts >= 2 &&
    scrapedAt &&
    Date.now() - new Date(scrapedAt).getTime() > 7 * 24 * 60 * 60 * 1000
  ) {
    return false; // safe to delete
  }

  // Rule 1 — Keep if enrichment confidence is low (first attempt only)
  if (enrichmentConfidence === "low") return true;

  // Rule 2 — Keep if post is less than 3 days old
  if (scrapedAt) {
    const age = Date.now() - new Date(scrapedAt).getTime();
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    if (age < threeDays) return true;
  }

  // Rule 3 — Keep if poster is a senior decision-maker
  if (posterTitle) {
    const seniorKeywords = [
      "founder",
      "co-founder",
      "cofounder",
      "ceo",
      "cto",
      "coo",
      "cfo",
      "chief",
      "vice president",
      "vp ",
      "v.p.",
      "director",
      "head of",
      "partner",
      "managing director",
      "md ",
      "president",
    ];
    const titleLower = posterTitle.toLowerCase();
    if (seniorKeywords.some((k) => titleLower.includes(k))) return true;
  }

  // Rules 4, 5, 6 require a company name to check
  if (!companyName) return false;

  // Rule 4 — Keep if company exists in jobs_index
  const { count: jobCount } = await supabase
    .from("jobs_index")
    .select("*", { count: "exact", head: true })
    .ilike("company", `%${companyName}%`)
    .eq("is_active", true);

  if (jobCount && jobCount > 0) return true;

  // Rule 5 — Keep if company has recent signals in signals_index
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { count: signalCount } = await supabase
    .from("signals_index")
    .select("*", { count: "exact", head: true })
    .ilike("company_name", `%${companyName}%`)
    .in("signal_type", ["funding", "headcount", "leadership", "product_launch", "contract_win"])
    .gte("scraped_at", thirtyDaysAgo)
    .eq("is_active", true);

  if (signalCount && signalCount > 0) return true;

  // Rule 6 — Keep if company is tracked in company_signal_profiles
  const { count: profileCount } = await supabase
    .from("company_signal_profiles")
    .select("*", { count: "exact", head: true })
    .ilike("company_name", `%${companyName}%`);

  if (profileCount && profileCount > 0) return true;

  // Failed all keep rules — safe to delete
  return false;
}

async function deleteLowIntentPosts(): Promise<number> {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: candidates } = await supabase
    .from("linkedin_hiring_posts")
    .select(
      "id, company_name, poster_title, scraped_at, enrichment_confidence, enrichment_attempts"
    )
    .eq("hiring_intent", "low")
    .eq("is_enriched", true)
    .lt("scraped_at", threeDaysAgo);

  if (!candidates || candidates.length === 0) return 0;

  const toDelete: string[] = [];

  for (const post of candidates as {
    id: string;
    company_name: string | null;
    poster_title: string | null;
    scraped_at: string | null;
    enrichment_confidence: string | null;
    enrichment_attempts?: number | null;
  }[]) {
    const keep = await shouldKeepLowIntentPost(
      post.company_name,
      post.poster_title,
      post.scraped_at,
      post.enrichment_confidence,
      post.enrichment_attempts ?? 1
    );
    if (!keep) toDelete.push(post.id);
    await new Promise((r) => setTimeout(r, 50));
  }

  if (toDelete.length === 0) return 0;

  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += 50) {
    const batch = toDelete.slice(i, i + 50);
    const { error } = await supabase.from("linkedin_hiring_posts").delete().in("id", batch);
    if (!error) deleted += batch.length;
  }

  console.log(
    `[enrich-linkedin-posts] Deleted ${deleted} low-intent posts not found in any internal table`
  );
  return deleted;
}

async function deleteStaleMediumHighIntentPosts(): Promise<number> {
  const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
  const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: mediumCandidates }, { data: highCandidates }] = await Promise.all([
    supabase
      .from("linkedin_hiring_posts")
      .select("id")
      .eq("is_enriched", true)
      .eq("hiring_intent", "medium")
      .lt("scraped_at", fifteenDaysAgo),
    supabase
      .from("linkedin_hiring_posts")
      .select("id")
      .eq("is_enriched", true)
      .eq("hiring_intent", "high")
      .lt("scraped_at", twentyDaysAgo),
  ]);

  const ids = [
    ...((mediumCandidates ?? []) as { id: string }[]).map((r) => r.id),
    ...((highCandidates ?? []) as { id: string }[]).map((r) => r.id),
  ].filter(Boolean);

  if (ids.length === 0) return 0;

  let deleted = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const { error } = await supabase.from("linkedin_hiring_posts").delete().in("id", batch);
    if (!error) deleted += batch.length;
  }

  console.log(
    `[enrich-linkedin-posts] Deleted ${deleted} stale medium/high intent posts (15d/20d rule)`
  );
  return deleted;
}

type PostRow = {
  id: string;
  title: string | null;
  snippet: string | null;
  industry: string | null;
  posted_at: string | null;
  enrichment_attempts?: number | null;
};

async function enrichPost(post: PostRow): Promise<Record<string, any> | null> {
  if (!ANTHROPIC_API_KEY) {
    console.error("[enrich-linkedin-posts] ANTHROPIC_API_KEY missing");
    return null;
  }
  const userContent = `
Extract structured hiring data from this LinkedIn post.

Title: ${post.title ?? "unknown"}
Snippet: ${post.snippet ?? "unknown"}
Industry hint: ${post.industry ?? "not provided — infer from post text"}

Return a JSON object with exactly these fields:
{
  "job_title": "specific role being hired for, or null",
  "company_name": "company hiring, or null",
  "location": "city or Remote or Pan-India, or null",
  "experience_level": "fresher / 0-2 years / 2-5 years / 5+ years / senior / not specified",
  "role_type": "full-time / internship / contract / freelance / not specified",
  "poster_name": "name of person who posted, or null",
  "poster_title": "their job title/designation, or null",
  "apply_method": "DM / email / link / not specified",
  "is_india_role": true or false,
  "enriched_industry": "REQUIRED — carefully infer from the post text and map to exactly one of: consulting, technology, finance, marketing, operations, product, data & analytics, investment banking, private equity & vc, fmcg, pharma & healthcare, energy & infrastructure, media & entertainment, legal, human resources, real estate, logistics & supply chain, e-commerce & d2c, edtech, banking & financial services, manufacturing & automotive. Use the company name, role title, and post content as clues. Only return null if truly impossible to determine.",
  "enrichment_confidence": "high / medium / low",
  "hiring_intent": "high / medium / low",
  "enriched_snippet": "1–2 sentence, clear natural-language summary of what the post is about, suitable to show directly to a user"
}

Rules:
- is_india_role: true only if post mentions India, Indian cities, or Indian companies
- If snippet is too short or unclear, set enrichment_confidence to "low"
- Never guess — use null if not clearly inferable from the text

Hiring intent classification rules:
- "high": Post is directly and explicitly about hiring a specific person or role. Contains clear signals like "we are hiring", "looking for a [role]", "join our team", "apply now", "DM me for this role", job description details, or a direct call to apply. The primary purpose of the post is recruitment.
- "medium": Post suggests the organisation may be hiring or growing but does not directly solicit applications. Includes posts about team expansion, company growth milestones, "exciting things ahead", general culture posts, or posts where hiring is mentioned but not the primary focus.
- "low": Post is clearly NOT about recruiting someone. Includes event participation announcements, reflections on hiring experiences, commentary on job market trends, celebrating a hire that already happened, or any post where the organisation is not actively seeking candidates.
`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 400,
        system:
          "You are a structured data extractor. Extract hiring information from LinkedIn post snippets. Always respond with valid JSON only. No preamble, no explanation, no markdown backticks.",
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!res.ok) {
      console.error("[enrich-linkedin-posts] Claude error:", res.status, await res.text());
      return null;
    }

    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.[0]?.text;
    if (!text || typeof text !== "string") {
      console.error("[enrich-linkedin-posts] No text in Claude response");
      return null;
    }

    const raw = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(raw) as Record<string, any>;
    return parsed;
  } catch (err) {
    console.error("[enrich-linkedin-posts] enrichPost error:", err);
    return null;
  }
}

async function processBatch(batchSize: number = 50): Promise<{ enriched: number; deleted: number }> {
  // Process a single batch of unenriched posts.
  // We no longer artificially sleep between calls; with typical batch sizes
  // (≤ 20) and short snippets this stays comfortably within Claude's
  // Tier 1 rate limits and avoids hitting the Edge runtime wall-clock limit.
  const { data: rows, error: fetchError } = await supabase
    .from("linkedin_hiring_posts")
    .select("id, title, snippet, industry, posted_at, enrichment_attempts")
    .eq("is_enriched", false)
    .not("snippet", "is", null)
    .order("scraped_at", { ascending: false })
    .limit(batchSize);

  if (fetchError) {
    console.error("[enrich-linkedin-posts] fetch error:", fetchError.message);
    throw fetchError;
  }

  if (!rows?.length) {
    const [deletedLow, deletedStale] = await Promise.all([
      deleteLowIntentPosts(),
      deleteStaleMediumHighIntentPosts(),
    ]);
    return { enriched: 0, deleted: deletedLow + deletedStale };
  }

  let totalEnriched = 0;

  for (const row of rows as PostRow[]) {
    const result = await enrichPost(row);

    if (result != null) {
      const { error: updateError } = await supabase
        .from("linkedin_hiring_posts")
        .update({
          job_title: result.job_title ?? null,
          company_name: result.company_name ?? null,
          location: result.location ?? null,
          experience_level: result.experience_level ?? null,
          role_type: result.role_type ?? null,
          poster_name: result.poster_name ?? null,
          poster_title: result.poster_title ?? null,
          apply_method: result.apply_method ?? null,
          is_india_role: result.is_india_role ?? null,
          enriched_industry: result.enriched_industry ?? null,
          enrichment_confidence: result.enrichment_confidence ?? null,
          hiring_intent: result.hiring_intent ?? null,
          enriched_snippet: result.enriched_snippet ?? null,
          is_enriched: true,
          enrichment_attempts: (row.enrichment_attempts ?? 1) + 1,
        })
        .eq("id", row.id);

      if (updateError) {
        console.error("[enrich-linkedin-posts] update error:", updateError.message);
      } else {
        totalEnriched++;
      }
    } else {
      await supabase
        .from("linkedin_hiring_posts")
        .update({
          is_enriched: true,
          enrichment_attempts: (row.enrichment_attempts ?? 1) + 1,
        })
        .eq("id", row.id);
    }

  }

  const [deletedLow, deletedStale] = await Promise.all([
    deleteLowIntentPosts(),
    deleteStaleMediumHighIntentPosts(),
  ]);

  return { enriched: totalEnriched, deleted: deletedLow + deletedStale };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { ...corsHeaders } });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = (await req.json().catch(() => ({}))) as { batchSize?: number };
  const batchSize = body.batchSize ?? 50;

  try {
    const { enriched, deleted } = await processBatch(batchSize);
    return new Response(JSON.stringify({ ok: true, enriched, deleted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
