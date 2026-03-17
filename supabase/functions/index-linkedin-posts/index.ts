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

const HIRING_QUERIES = [
  '"we are hiring" India site:linkedin.com/posts',
  '"we\'re hiring" India site:linkedin.com/posts',
  '"I am hiring" India site:linkedin.com/posts',
  '"we\'re looking for" India site:linkedin.com/posts',
  '"we are looking for" India site:linkedin.com/posts',
  '"DM me" "hiring" India site:linkedin.com/posts',
  '"DM me" "looking for" India site:linkedin.com/posts',
  '"drop your CV" India site:linkedin.com/posts',
  '"send your resume" India site:linkedin.com/posts',
  '"share your CV" India site:linkedin.com/posts',
  '"apply now" "India" site:linkedin.com/posts',
  '"apply here" India site:linkedin.com/posts',
  '"link in bio" "hiring" India site:linkedin.com/posts',
  '"link in comments" "hiring" India site:linkedin.com/posts',
  '"join our team" India site:linkedin.com/posts',
  '"join us" "hiring" India site:linkedin.com/posts',
  '"we have openings" India site:linkedin.com/posts',
  '"open positions" India site:linkedin.com/posts',
  '"open roles" India site:linkedin.com/posts',
  '"open role" India site:linkedin.com/posts',
  '"we are hiring" Bangalore site:linkedin.com/posts',
  '"we are hiring" Mumbai site:linkedin.com/posts',
  '"we are hiring" Delhi site:linkedin.com/posts',
  '"we are hiring" Gurugram site:linkedin.com/posts',
  '"we are hiring" Hyderabad site:linkedin.com/posts',
  '"we are hiring" Pune site:linkedin.com/posts',
  '"hiring freshers" India site:linkedin.com/posts',
  '"entry level" "hiring" India site:linkedin.com/posts',
  '"campus hiring" India site:linkedin.com/posts',
  '"internship" "apply" India site:linkedin.com/posts',
  '"urgently hiring" India site:linkedin.com/posts',
  '"immediate joining" India site:linkedin.com/posts',
  '"referral" "hiring" India site:linkedin.com/posts',
  '"know anyone" "hiring" India site:linkedin.com/posts',
  '"founding team" "hiring" India site:linkedin.com/posts',
  '"Head of" "hiring" India site:linkedin.com/posts',
  '"hiring a product manager" India site:linkedin.com/posts',
  '"hiring an engineer" India site:linkedin.com/posts',
  '"vacancy" "apply" India site:linkedin.com/posts',
  '"we are hiring" Chennai site:linkedin.com/posts',
];

async function exaSearch(query: string): Promise<any[]> {
  if (!EXA_API_KEY) {
    console.error("[index-linkedin-posts] EXA_API_KEY missing");
    return [];
  }
  const startDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
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

async function upsertPost(result: any, industry: string | null): Promise<void> {
  const row = {
    url: result.url,
    title: result.title ?? null,
    snippet: result.text ?? result.snippet ?? null,
    posted_at: result.publishedDate ?? null,
    industry: industry ?? null,
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

async function processHiringPosts(): Promise<number> {
  const seen = new Set<string>();
  let count = 0;

  for (const query of HIRING_QUERIES) {
    const results = await exaSearch(query);
    for (const result of results) {
      if (!result.url?.includes("linkedin.com")) continue;
      if (seen.has(result.url)) continue;
      seen.add(result.url);
      await upsertPost(result, null);
      count++;
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  return count;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const count = await processHiringPosts();
    return new Response(
      JSON.stringify({ ok: true, processed: count }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
