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

type PostRow = {
  id: string;
  title: string | null;
  snippet: string | null;
  industry: string | null;
  posted_at: string | null;
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
Industry hint: ${post.industry ?? "unknown"}

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
  "enriched_industry": "map to one of: consulting, technology, finance, marketing, operations, product, data & analytics, investment banking, private equity & vc, fmcg, pharma & healthcare, energy & infrastructure, media & entertainment, legal, human resources, real estate, logistics & supply chain, e-commerce & d2c, edtech, banking & financial services, manufacturing & automotive — or null if unclear",
  "enrichment_confidence": "high / medium / low"
}

Rules:
- is_india_role: true only if post mentions India, Indian cities, or Indian companies
- If snippet is too short or unclear, set enrichment_confidence to "low"
- Never guess — use null if not clearly inferable from the text
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

async function processBatch(batchSize: number = 50): Promise<number> {
  const { data: rows, error: fetchError } = await supabase
    .from("linkedin_hiring_posts")
    .select("id, title, snippet, industry, posted_at")
    .eq("is_enriched", false)
    .not("snippet", "is", null)
    .order("scraped_at", { ascending: false })
    .limit(batchSize);

  if (fetchError) {
    console.error("[enrich-linkedin-posts] fetch error:", fetchError.message);
    throw fetchError;
  }

  if (!rows?.length) return 0;

  let enrichedCount = 0;

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
          is_enriched: true,
        })
        .eq("id", row.id);

      if (updateError) {
        console.error("[enrich-linkedin-posts] update error:", updateError.message);
      } else {
        enrichedCount++;
      }
    } else {
      await supabase
        .from("linkedin_hiring_posts")
        .update({ is_enriched: true })
        .eq("id", row.id);
    }

    await new Promise((r) => setTimeout(r, 1300));
  }

  return enrichedCount;
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
    const count = await processBatch(batchSize);
    return new Response(JSON.stringify({ ok: true, enriched: count }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
