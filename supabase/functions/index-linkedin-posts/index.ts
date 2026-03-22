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

type QueryPack = "core" | "city" | "role" | "seniority";

const QUERY_PACKS: Record<QueryPack, string[]> = {
  // Highest intent: direct calls to apply, send CV, DM for role.
  core: [
    '"we are hiring" India site:linkedin.com/posts',
    '"we\'re hiring" India site:linkedin.com/posts',
    '"I am hiring" India site:linkedin.com/posts',
    '"we are looking for" India site:linkedin.com/posts',
    '"we\'re looking for" India site:linkedin.com/posts',
    '"apply now" India site:linkedin.com/posts',
    '"apply here" India site:linkedin.com/posts',
    '"send your resume" India site:linkedin.com/posts',
    '"drop your CV" India site:linkedin.com/posts',
    '"share your CV" India site:linkedin.com/posts',
    '"DM me for this role" India site:linkedin.com/posts',
    '"join our team" India site:linkedin.com/posts',
    '"open positions" India site:linkedin.com/posts',
    '"open roles" India site:linkedin.com/posts',
  ],
  // City-focused queries to diversify geographic coverage in India.
  city: [
    '"we are hiring" Bangalore site:linkedin.com/posts',
    '"we are hiring" Bengaluru site:linkedin.com/posts',
    '"we are hiring" Mumbai site:linkedin.com/posts',
    '"we are hiring" Delhi site:linkedin.com/posts',
    '"we are hiring" Gurugram site:linkedin.com/posts',
    '"we are hiring" Noida site:linkedin.com/posts',
    '"we are hiring" Hyderabad site:linkedin.com/posts',
    '"we are hiring" Pune site:linkedin.com/posts',
    '"we are hiring" Chennai site:linkedin.com/posts',
    '"we are hiring" Kolkata site:linkedin.com/posts',
    '"hiring" "remote India" site:linkedin.com/posts',
    '"hiring" "work from home India" site:linkedin.com/posts',
  ],
  // Role-focused queries to diversify sectors/functions.
  role: [
    // Product & Strategy
    '"hiring a product manager" India site:linkedin.com/posts',
    '"hiring product analyst" India site:linkedin.com/posts',
    '"hiring strategy analyst" India site:linkedin.com/posts',
    '"hiring business development" India site:linkedin.com/posts',
    '"hiring chief of staff" India site:linkedin.com/posts',
    '"hiring founder office" India site:linkedin.com/posts',

    // Technology & Engineering
    '"hiring software engineer" India site:linkedin.com/posts',
    '"hiring frontend engineer" India site:linkedin.com/posts',
    '"hiring backend engineer" India site:linkedin.com/posts',
    '"hiring full stack engineer" India site:linkedin.com/posts',
    '"hiring data engineer" India site:linkedin.com/posts',
    '"hiring ML engineer" India site:linkedin.com/posts',

    // Data & Analytics
    '"hiring data analyst" India site:linkedin.com/posts',
    '"hiring data scientist" India site:linkedin.com/posts',
    '"hiring business analyst" India site:linkedin.com/posts',
    '"hiring analytics manager" India site:linkedin.com/posts',

    // Finance & Investing
    '"hiring finance analyst" India site:linkedin.com/posts',
    '"hiring investment analyst" India site:linkedin.com/posts',
    '"hiring equity research analyst" India site:linkedin.com/posts',
    '"hiring financial analyst" India site:linkedin.com/posts',
    '"hiring investment banking analyst" India site:linkedin.com/posts',
    '"hiring private equity analyst" India site:linkedin.com/posts',
    '"hiring venture capital analyst" India site:linkedin.com/posts',
    '"hiring credit analyst" India site:linkedin.com/posts',

    // Consulting & Advisory
    '"hiring consultant" India site:linkedin.com/posts',
    '"hiring management consultant" India site:linkedin.com/posts',
    '"hiring strategy consultant" India site:linkedin.com/posts',
    '"hiring associate consultant" India site:linkedin.com/posts',

    // Marketing & Growth
    '"hiring marketing manager" India site:linkedin.com/posts',
    '"hiring growth manager" India site:linkedin.com/posts',
    '"hiring brand manager" India site:linkedin.com/posts',
    '"hiring content manager" India site:linkedin.com/posts',
    '"hiring digital marketing" India site:linkedin.com/posts',
    '"hiring performance marketing" India site:linkedin.com/posts',

    // Operations & Supply Chain
    '"hiring operations manager" India site:linkedin.com/posts',
    '"hiring supply chain analyst" India site:linkedin.com/posts',
    '"hiring operations analyst" India site:linkedin.com/posts',
    '"hiring program manager" India site:linkedin.com/posts',

    // Sales
    '"hiring sales manager" India site:linkedin.com/posts',
    '"hiring account manager" India site:linkedin.com/posts',
    '"hiring sales development" India site:linkedin.com/posts',
    '"hiring inside sales" India site:linkedin.com/posts',

    // Design
    '"hiring UI UX designer" India site:linkedin.com/posts',
    '"hiring product designer" India site:linkedin.com/posts',
    '"hiring graphic designer" India site:linkedin.com/posts',

    // HR & People
    '"hiring recruiter" India site:linkedin.com/posts',
    '"hiring HR manager" India site:linkedin.com/posts',
    '"hiring talent acquisition" India site:linkedin.com/posts',

    // Entry level & Campus
    '"hiring internship" India site:linkedin.com/posts',
    '"campus hiring" India site:linkedin.com/posts',
    '"hiring freshers" India site:linkedin.com/posts',
    '"hiring graduate trainee" India site:linkedin.com/posts',
    '"hiring management trainee" India site:linkedin.com/posts',
  ],
  // Seniority-focused high-intent queries.
  seniority: [
    '"hiring freshers" India site:linkedin.com/posts',
    '"entry level hiring" India site:linkedin.com/posts',
    '"graduate trainee hiring" India site:linkedin.com/posts',
    '"internship hiring" India site:linkedin.com/posts',
    '"associate hiring" India site:linkedin.com/posts',
    '"senior engineer hiring" India site:linkedin.com/posts',
    '"engineering manager hiring" India site:linkedin.com/posts',
    '"head of hiring" India site:linkedin.com/posts',
    '"founding team hiring" India site:linkedin.com/posts',
    '"immediate joining hiring" India site:linkedin.com/posts',
  ],
};

async function exaSearch(query: string, numResults: number): Promise<any[]> {
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
        numResults,
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

async function processHiringPosts(opts?: {
  pack?: QueryPack;
  queryIndex?: number;
  numResultsPerQuery?: number;
}): Promise<{ processed: number; pack: QueryPack; queryIndex: number }> {
  const packOrder: QueryPack[] = ["core", "city", "role", "seniority"];
  const rotationIndex = Math.floor(Date.now() / (10 * 60 * 1000)) % packOrder.length;
  const activePack = opts?.pack && QUERY_PACKS[opts.pack] ? opts.pack : packOrder[rotationIndex];
  const packQueries = QUERY_PACKS[activePack] ?? [];

  const queryIndex = opts?.queryIndex ?? 0;
  const query = packQueries[queryIndex];
  if (!query) {
    console.log(
      `[index-linkedin-posts] activePack=${activePack} queryIndex=${queryIndex} out of range (len=${packQueries.length})`
    );
    return { processed: 0, pack: activePack, queryIndex };
  }

  const numResultsPerQuery = Math.max(5, Math.min(opts?.numResultsPerQuery ?? 20, 40));

  console.log(
    `[index-linkedin-posts] activePack=${activePack} queryIndex=${queryIndex} numResults=${numResultsPerQuery}`
  );

  const seen = new Set<string>();
  let count = 0;

  const results = await exaSearch(query, numResultsPerQuery);
  for (const result of results) {
    if (!result.url?.includes("linkedin.com")) continue;
    if (seen.has(result.url)) continue;
    seen.add(result.url);
    await upsertPost(result, null);
    count++;
  }

  return { processed: count, pack: activePack, queryIndex };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    let payload: {
      pack?: QueryPack;
      queryIndex?: number;
      numResultsPerQuery?: number;
    } = {};
    try {
      payload = (await req.json()) as {
        pack?: QueryPack;
        queryIndex?: number;
        numResultsPerQuery?: number;
      };
    } catch {
      payload = {};
    }

    const { pack, queryIndex, numResultsPerQuery } = payload;
    const result = await processHiringPosts({ pack, queryIndex, numResultsPerQuery });
    return new Response(
      JSON.stringify({ ok: true, ...result }),
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
