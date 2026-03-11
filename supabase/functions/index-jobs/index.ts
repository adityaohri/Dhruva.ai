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

const EXPERIENCE_TIERS = [
  {
    jsearchValue: "no_experience",
    label: "fresher",
  },
  {
    jsearchValue: "under_3_years_experience",
    label: "junior",
  },
  {
    jsearchValue: "more_than_3_years_experience",
    label: "mid-senior",
  },
] as const;

const RAPIDAPI_URL = "https://jsearch.p.rapidapi.com/search";
const OPENWEBNINJA_URL = "https://api.openwebninja.com/jsearch/search";

/** Detect provider from key: OpenWeb Ninja keys typically start with "ak_" */
function getJSearchConfig(apiKey: string): { url: string; headers: Record<string, string> } {
  const key = apiKey?.trim() ?? "";
  const isOpenWebNinja = key.startsWith("ak_") ||
    (Deno.env.get("JSEARCH_PROVIDER") ?? "").toLowerCase() === "openwebninja";

  if (isOpenWebNinja) {
    return {
      url: OPENWEBNINJA_URL,
      headers: { "x-api-key": key },
    };
  }
  return {
    url: RAPIDAPI_URL,
    headers: {
      "X-RapidAPI-Key": key,
      "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    },
  };
}

function jsearchFetch(apiKey: string, query: string): Promise<{ data?: any[] }> {
  const { url: baseUrl, headers } = getJSearchConfig(apiKey);
  const url = new URL(baseUrl);
  url.searchParams.set("query", query);
  url.searchParams.set("country", "IN");
  url.searchParams.set("date_posted", "month");
  url.searchParams.set("num_pages", "5");

  return fetch(url.toString(), {
    method: "GET",
    headers,
  }).then((r) => r.json());
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { ...corsHeaders },
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  let industry: string;
  try {
    const body = await req.json();
    industry = typeof body?.industry === "string" ? body.industry.trim() : "";
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  if (!industry) {
    return new Response(
      JSON.stringify({ error: "industry is required" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const apiKey = Deno.env.get("JSEARCH_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "JSEARCH_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const queries = [
      `${industry} jobs India`,
      `${industry} careers India`,
    ];

    const { url: baseUrl, headers } = getJSearchConfig(apiKey);
    const allResults: any[] = [];

    for (const tier of EXPERIENCE_TIERS) {
      const tierFetches = queries.map((query) => {
        const url = new URL(baseUrl);
        url.searchParams.set("query", query);
        url.searchParams.set("country", "IN");
        url.searchParams.set("date_posted", "month");
        url.searchParams.set("num_pages", "5");
        url.searchParams.set("job_requirements", tier.jsearchValue);

        return fetch(url.toString(), {
          method: "GET",
          headers,
        })
          .then((r) => r.json())
          .then((data) => ({
            results: data.data ?? [],
            experienceLabel: tier.label,
          }));
      });

      const tierResults = await Promise.all(tierFetches);

      for (const { results, experienceLabel } of tierResults) {
        for (const job of results) {
          allResults.push({ ...job, _experienceLabel: experienceLabel });
        }
      }

      // Pause between tiers to avoid rate limiting
      await new Promise((r) => setTimeout(r, 500));
    }

    const seen = new Set<string>();
    const combined: any[] = [];
    for (const job of allResults) {
      const link = job?.job_apply_link;
      if (link && typeof link === "string" && !seen.has(link)) {
        seen.add(link);
        combined.push(job);
      }
    }

    const rows = combined
      .map((job) => {
        const url = job?.job_apply_link;
        if (url == null || String(url).trim() === "") return null;
        return {
          title: job.job_title ?? null,
          company: job.employer_name ?? null,
          url: String(url).trim(),
          snippet:
            typeof job.job_description === "string"
              ? job.job_description.slice(0, 500)
              : null,
          source: job.job_publisher ?? null,
          industry,
          experience_level: job._experienceLabel ?? "unknown",
          location:
            job.job_city || job.job_country || "India",
          bucket: "B",
          posted_at: job.job_posted_at_datetime_utc ?? null,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r != null);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Supabase env not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await supabase
      .from("jobs_index")
      .upsert(rows, { onConflict: "url" });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message, details: error }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        industry,
        indexed: rows.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
