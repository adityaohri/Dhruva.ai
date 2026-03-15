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

const EXA_API_KEY = Deno.env.get("EXA_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const ALL_INDUSTRIES = [
  "consulting",
  "technology",
  "finance",
  "marketing",
  "operations",
  "product",
  "data & analytics",
  "investment banking",
  "private equity & vc",
  "fmcg",
  "pharma & healthcare",
  "energy & infrastructure",
  "media & entertainment",
  "legal",
  "human resources",
  "real estate",
  "logistics & supply chain",
  "e-commerce & d2c",
  "edtech",
  "banking & financial services",
  "manufacturing & automotive",
];

const INDUSTRY_QUERIES: Record<string, string[]> = {
  consulting: [
    "site:linkedin.com/posts hiring consultant India",
    "site:linkedin.com/posts \"we are hiring\" strategy consulting India",
    "site:linkedin.com/posts \"looking for\" consultant analyst India",
  ],
  technology: [
    "site:linkedin.com/posts hiring engineer developer India",
    "site:linkedin.com/posts \"we are hiring\" software India",
    "site:linkedin.com/posts \"join our team\" tech startup India",
  ],
  finance: [
    "site:linkedin.com/posts hiring finance analyst India",
    "site:linkedin.com/posts \"we are hiring\" CFO finance India",
    "site:linkedin.com/posts \"looking for\" finance professional India",
  ],
  marketing: [
    "site:linkedin.com/posts hiring marketing manager India",
    "site:linkedin.com/posts \"we are hiring\" brand growth India",
    "site:linkedin.com/posts \"join us\" marketing India",
  ],
  operations: [
    "site:linkedin.com/posts hiring operations manager India",
    "site:linkedin.com/posts \"we are hiring\" operations India",
    "site:linkedin.com/posts \"looking for\" ops lead India",
  ],
  product: [
    "site:linkedin.com/posts hiring product manager India",
    "site:linkedin.com/posts \"we are hiring\" PM product India",
    "site:linkedin.com/posts \"join our team\" product India",
  ],
  "data & analytics": [
    "site:linkedin.com/posts hiring data analyst scientist India",
    "site:linkedin.com/posts \"we are hiring\" data analytics India",
    "site:linkedin.com/posts \"looking for\" data engineer India",
  ],
  "investment banking": [
    "site:linkedin.com/posts hiring investment banking analyst India",
    "site:linkedin.com/posts \"we are hiring\" IB M&A India",
    "site:linkedin.com/posts \"join our team\" investment bank India",
  ],
  "private equity & vc": [
    "site:linkedin.com/posts hiring private equity venture capital India",
    "site:linkedin.com/posts \"we are hiring\" PE VC fund India",
    "site:linkedin.com/posts \"looking for\" investment associate India",
  ],
  fmcg: [
    "site:linkedin.com/posts hiring FMCG brand India",
    "site:linkedin.com/posts \"we are hiring\" consumer goods India",
    "site:linkedin.com/posts \"join us\" FMCG sales marketing India",
  ],
  "pharma & healthcare": [
    "site:linkedin.com/posts hiring pharma healthcare India",
    "site:linkedin.com/posts \"we are hiring\" medical pharmaceutical India",
    "site:linkedin.com/posts \"looking for\" healthcare professional India",
  ],
  "energy & infrastructure": [
    "site:linkedin.com/posts hiring energy infrastructure India",
    "site:linkedin.com/posts \"we are hiring\" renewable energy India",
    "site:linkedin.com/posts \"join our team\" infrastructure India",
  ],
  "media & entertainment": [
    "site:linkedin.com/posts hiring media content creator India",
    "site:linkedin.com/posts \"we are hiring\" entertainment media India",
    "site:linkedin.com/posts \"looking for\" content media India",
  ],
  legal: [
    "site:linkedin.com/posts hiring lawyer legal India",
    "site:linkedin.com/posts \"we are hiring\" legal counsel India",
    "site:linkedin.com/posts \"looking for\" advocate solicitor India",
  ],
  "human resources": [
    "site:linkedin.com/posts hiring HR human resources India",
    "site:linkedin.com/posts \"we are hiring\" HR manager India",
    "site:linkedin.com/posts \"looking for\" talent acquisition India",
  ],
  "real estate": [
    "site:linkedin.com/posts hiring real estate India",
    "site:linkedin.com/posts \"we are hiring\" property realty India",
    "site:linkedin.com/posts \"join us\" real estate India",
  ],
  "logistics & supply chain": [
    "site:linkedin.com/posts hiring logistics supply chain India",
    "site:linkedin.com/posts \"we are hiring\" logistics India",
    "site:linkedin.com/posts \"looking for\" supply chain India",
  ],
  "e-commerce & d2c": [
    "site:linkedin.com/posts hiring ecommerce D2C India",
    "site:linkedin.com/posts \"we are hiring\" ecommerce startup India",
    "site:linkedin.com/posts \"join our team\" D2C brand India",
  ],
  edtech: [
    "site:linkedin.com/posts hiring edtech education India",
    "site:linkedin.com/posts \"we are hiring\" edtech India",
    "site:linkedin.com/posts \"looking for\" education technology India",
  ],
  "banking & financial services": [
    "site:linkedin.com/posts hiring banking BFSI India",
    "site:linkedin.com/posts \"we are hiring\" bank financial services India",
    "site:linkedin.com/posts \"join us\" NBFC fintech India",
  ],
  "manufacturing & automotive": [
    "site:linkedin.com/posts hiring manufacturing automotive India",
    "site:linkedin.com/posts \"we are hiring\" factory plant India",
    "site:linkedin.com/posts \"looking for\" manufacturing engineer India",
  ],
};

const UNIVERSAL_QUERIES = [
  "site:linkedin.com/posts \"hiring\" \"DM me\" India 2025",
  "site:linkedin.com/posts \"we're hiring\" India freshers graduates",
  "site:linkedin.com/posts \"open roles\" India apply now",
  "site:linkedin.com/posts \"job opportunity\" India hiring",
];

function getQueriesForIndustry(industry: string): string[] {
  const industryQueries = INDUSTRY_QUERIES[industry] ?? [];
  return [...industryQueries, ...UNIVERSAL_QUERIES];
}

async function exaSearch(query: string): Promise<any[]> {
  if (!EXA_API_KEY) {
    console.error("[index-linkedin-posts] EXA_API_KEY missing");
    return [];
  }
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  try {
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "x-api-key": EXA_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        numResults: 10,
        type: "neural",
        useAutoprompt: false,
        includeDomains: ["linkedin.com"],
        startPublishedDate: startDate,
        contents: {
          text: { maxCharacters: 400 },
        },
      }),
    });
    if (!res.ok) {
      console.error("[index-linkedin-posts] Exa search failed:", res.status, await res.text());
      return [];
    }
    const data = (await res.json()) as { results?: any[] };
    return data.results ?? [];
  } catch (err) {
    console.error("[index-linkedin-posts] Exa search error:", err);
    return [];
  }
}

async function upsertPost(result: any, industry: string): Promise<void> {
  const row = {
    url: result.url,
    title: result.title ?? null,
    snippet: result.text ?? result.snippet ?? null,
    posted_at: result.publishedDate ?? null,
    industry,
    source: "exa_linkedin",
  };
  const { error } = await supabase.from("linkedin_hiring_posts").upsert(row, {
    onConflict: "url",
    ignoreDuplicates: true,
  });
  if (error) {
    console.error("[index-linkedin-posts] upsert error:", error.message);
    return;
  }
  console.log("[index-linkedin-posts] upserted:", result.url);
}

async function processIndustry(industry: string): Promise<number> {
  const queries = getQueriesForIndustry(industry);
  const seen = new Set<string>();
  let count = 0;

  for (const query of queries) {
    const results = await exaSearch(query);
    for (const result of results) {
      if (!result.url?.includes("linkedin.com")) continue;
      if (seen.has(result.url)) continue;
      seen.add(result.url);
      await upsertPost(result, industry);
      count++;
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  return count;
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

  const body = (await req.json().catch(() => ({}))) as { industry?: string };
  const industry: string | null = body.industry ?? null;

  try {
    if (industry) {
      const count = await processIndustry(industry);
      return new Response(
        JSON.stringify({ ok: true, industry, processed: count }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let total = 0;
    for (const ind of ALL_INDUSTRIES) {
      const count = await processIndustry(ind);
      total += count;
      await new Promise((r) => setTimeout(r, 600));
    }

    return new Response(
      JSON.stringify({ ok: true, processed: total }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
