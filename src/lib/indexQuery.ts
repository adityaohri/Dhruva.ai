import { createClient } from "@supabase/supabase-js";
import type { OpportunityResult } from "@/types/opportunity";

export async function queryJobsIndex(
  industry: string,
  limit: number = 200
): Promise<OpportunityResult[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return [];

  const supabase = createClient(url, anonKey);

  const { data, error } = await supabase
    .from("jobs_index")
    .select("title, company, url, snippet, source, industry, experience_level, location, bucket, posted_at")
    .eq("industry", industry.toLowerCase())
    .eq("is_active", true)
    .order("posted_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data
    .filter((row: Record<string, unknown>) => {
      const u = row.url;
      return u != null && String(u).trim() !== "";
    })
    .map((row: Record<string, unknown>) => ({
    title: String(row.title ?? ""),
    company: row.company ?? null,
    url: String(row.url).trim(),
    snippet: String(row.snippet ?? ""),
    source: (row.source as string) ?? "index",
    location: (row.location as string) ?? "India",
    posted_at: row.posted_at ?? null,
    bucket: (row.bucket as OpportunityResult["bucket"]) ?? "B",
    industry: row.industry ?? null,
    match_score: null,
    experience_level: row.experience_level ?? null,
    isDirect: false,
  })) as OpportunityResult[];
}
