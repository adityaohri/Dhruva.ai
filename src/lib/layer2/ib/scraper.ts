import Exa from "exa-js";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { QUERIES, CAREERS_PAGES, QueryConfig } from "./queries";
import { enrichSignalWithLLM } from "../enrichment";

function readEnv(value: string | undefined): string {
  if (!value) return "";
  return value.trim().split(/\r?\n/)[0].trim();
}

let _exa: Exa | null = null;
function getExa(): Exa {
  if (_exa) return _exa;
  const key = readEnv(process.env.EXA_API_KEY);
  if (!key) {
    throw new Error(
      "Missing EXA_API_KEY — add it to .env.local and Vercel env."
    );
  }
  _exa = new Exa(key);
  return _exa;
}

let _supabase: SupabaseClient | null = null;
function getServiceSupabase(): SupabaseClient {
  if (_supabase) return _supabase;
  const url = readEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = readEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) {
    throw new Error(
      "Missing Supabase service role env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (same pattern as Supabase Edge functions)."
    );
  }
  _supabase = createClient(url, key);
  return _supabase;
}

function hashContent(content: string): string {
  return crypto.createHash("md5").update(content).digest("hex");
}

function isRelevant(text: string, firm: string): boolean {
  const t = text.toLowerCase();
  const firmAliases: Record<string, string[]> = {
    goldman_sachs: ["goldman sachs", "goldman"],
    jpmorgan: ["jp morgan", "jpmorgan", "j.p. morgan"],
    morgan_stanley: ["morgan stanley"],
    bofa: ["bank of america", "bofa"],
    citi: ["citi", "citibank"],
    deutsche_bank: ["deutsche bank"],
    jefferies: ["jefferies"],
    hsbc: ["hsbc"],
    lazard: ["lazard"],
    rothschild: ["rothschild"],
    evercore: ["evercore"],
    houlihan_lokey: ["houlihan lokey"],
    kotak_ib: ["kotak", "kotak investment banking"],
    avendus: ["avendus"],
    axis_capital: ["axis capital"],
    icici_securities: ["icici securities", "icici"],
    jm_financial: ["jm financial"],
    sbicaps: ["sbi capital", "sbicaps"],
    all_ib: [
      "investment banking",
      "ib",
      "bulge bracket",
      "m&a",
      "valuation",
      "financial modelling",
    ],
  };
  const aliases = firmAliases[firm] ?? [firm.replace(/_/g, " "), firm];
  return aliases.some((a) => t.includes(a.toLowerCase()));
}

export type QualitativeSignalRow = {
  industry?: string;
  firm: string;
  firm_tier: string;
  source: string;
  source_url: string;
  content: string;
  content_hash: string;
  signal_type: string;
  cleaned_summary?: string;
  signal_strength?: "High" | "Medium" | "Low";
  inferred_role?: string;
  actionable_inference?: string;
  scraped_at: string;
  last_checked_at: string;
};

export async function runQuery(
  config: QueryConfig
): Promise<QualitativeSignalRow[]> {
  const exa = getExa();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const searchOptions = {
    numResults: 5,
    text: true as const,
    startPublishedDate: sixMonthsAgo.toISOString(),
    ...(config.source_domain
      ? { includeDomains: [config.source_domain] as string[] }
      : {}),
  };

  const result = await exa.searchAndContents(config.query, searchOptions);

  return Promise.all(
    result.results
      .filter((r) => r.text && r.text.length > 200)
      .filter((r) => isRelevant(r.text!, config.firm))
      .map(async (r) => {
        const slice = r.text!.slice(0, 3000);
        const enriched = await enrichSignalWithLLM(config.signal_type, slice as string);
        return {
          industry: "investment_banking",
          firm: config.firm,
          firm_tier: config.firm_tier,
          source: config.source_domain ?? new URL(r.url).hostname,
          source_url: r.url,
          content: slice,
          content_hash: hashContent(slice),
          signal_type: config.signal_type,
          cleaned_summary: enriched.cleaned_summary,
          signal_strength: enriched.signal_strength,
          inferred_role: enriched.inferred_role,
          actionable_inference: enriched.actionable_inference,
          scraped_at: new Date().toISOString(),
          last_checked_at: new Date().toISOString(),
        };
      })
  );
}

export async function saveSignals(
  signals: QualitativeSignalRow[]
): Promise<number> {
  if (signals.length === 0) return 0;

  const supabase = getServiceSupabase();
  const upsertCall = supabase
    .from("qualitative_signals")
    .upsert(signals, {
      onConflict: "source_url",
      ignoreDuplicates: false,
    });

  let { data, error } = await upsertCall.select("id");
  if (!error) return data?.length ?? 0;

  if (error.code === "PGRST204" || error.code === "42703") {
    const stripped = signals.map(
      ({
        industry,
        cleaned_summary,
        signal_strength,
        inferred_role,
        actionable_inference,
        ...base
      }) => base
    );

    const retry = await supabase
      .from("qualitative_signals")
      .upsert(stripped, {
        onConflict: "source_url",
        ignoreDuplicates: false,
      })
      .select("id");

    if (retry.error) throw retry.error;
    return retry.data?.length ?? 0;
  }

  throw error;
}

export async function fetchCareersPages(): Promise<number> {
  const exa = getExa();
  const supabase = getServiceSupabase();
  let saved = 0;

  for (const page of CAREERS_PAGES) {
    try {
      const result = await exa.getContents([page.url], { text: true });
      const text = result.results[0]?.text;
      if (!text) continue;

      const content = text.slice(0, 5000);
      const content_hash = hashContent(content);
      const enriched = await enrichSignalWithLLM("hiring_criteria", content);

      const { data: existing } = await supabase
        .from("qualitative_signals")
        .select("content_hash")
        .eq("source_url", page.url)
        .maybeSingle();

      if (existing?.content_hash === content_hash) {
        await supabase
          .from("qualitative_signals")
          .update({ last_checked_at: new Date().toISOString() })
          .eq("source_url", page.url);
        continue;
      }

      const upsertPayload = {
        industry: "investment_banking",
        firm: page.firm,
        firm_tier: "careers_page",
        source: new URL(page.url).hostname,
        source_url: page.url,
        content,
        content_hash,
        signal_type: "hiring_criteria",
        cleaned_summary: enriched.cleaned_summary,
        signal_strength: enriched.signal_strength,
        inferred_role: enriched.inferred_role,
        actionable_inference: enriched.actionable_inference,
        scraped_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(),
      };

      let { error: upsertError } = await supabase
        .from("qualitative_signals")
        .upsert(upsertPayload, { onConflict: "source_url" });

      if (upsertError && (upsertError.code === "PGRST204" || upsertError.code === "42703")) {
        const {
          industry,
          cleaned_summary,
          signal_strength,
          inferred_role,
          actionable_inference,
          ...basePayload
        } = upsertPayload;
        const retry = await supabase
          .from("qualitative_signals")
          .upsert(basePayload, { onConflict: "source_url" });
        upsertError = retry.error;
      }

      if (upsertError) throw upsertError;
      saved++;
    } catch (err) {
      console.error(`Careers page failed: ${page.firm}`, err);
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  return saved;
}

export async function runScrape(queries: QueryConfig[]): Promise<{
  queriesRun: number;
  totalSaved: number;
}> {
  const supabase = getServiceSupabase();

  const { data: logRow, error: logInsertError } = await supabase
    .from("scrape_run_log")
    .insert({ run_type: "layer2_ib", status: "running" })
    .select("id")
    .single();

  if (logInsertError || !logRow?.id) {
    throw logInsertError ?? new Error("Failed to insert scrape_run_log row");
  }

  const logId = logRow.id;
  let totalSaved = 0;
  let queriesRun = 0;

  try {
    for (const query of queries) {
      try {
        const signals = await runQuery(query);
        const saved = await saveSignals(signals);
        totalSaved += saved;
        queriesRun++;
        console.log(`✓ ${query.firm} | ${query.signal_type} | ${saved} saved`);
      } catch (err) {
        console.error(`✗ Query failed: ${query.query}`, err);
      }

      await new Promise((r) => setTimeout(r, 500));
    }

    await supabase
      .from("scrape_run_log")
      .update({
        status: "completed",
        queries_run: queriesRun,
        results_saved: totalSaved,
        completed_at: new Date().toISOString(),
      })
      .eq("id", logId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from("scrape_run_log")
      .update({
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", logId);
    throw err;
  }

  return { queriesRun, totalSaved };
}

export async function backfillSignalEnrichment(
  maxRows: number = 2000
): Promise<number> {
  const supabase = getServiceSupabase();
  let offset = 0;
  let updated = 0;
  const pageSize = 200;

  while (offset < maxRows) {
    const { data, error } = await supabase
      .from("qualitative_signals")
      .select("source_url, signal_type, content, firm_tier, industry")
      .or(
        "industry.eq.investment_banking,firm_tier.eq.bulge_bracket,firm_tier.eq.elite_boutique,firm_tier.eq.india_focused"
      )
      .order("scraped_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    const rows = (data ?? []) as Array<{
      source_url: string;
      signal_type: string | null;
      content: string | null;
      firm_tier?: string | null;
      industry?: string | null;
    }>;
    if (rows.length === 0) break;

    for (const row of rows) {
      const content = row.content ?? "";
      if (!content) continue;

      const signalType = (row.signal_type ??
        "hiring_criteria") as QueryConfig["signal_type"];
      const enriched = await enrichSignalWithLLM(signalType, content);

      const { error: updateError } = await supabase
        .from("qualitative_signals")
        .update({
          cleaned_summary: enriched.cleaned_summary,
          signal_strength: enriched.signal_strength,
          inferred_role: enriched.inferred_role,
          actionable_inference: enriched.actionable_inference,
          last_checked_at: new Date().toISOString(),
        })
        .eq("source_url", row.source_url);

      if (updateError) {
        if (updateError.code === "PGRST204" || updateError.code === "42703") {
          return updated;
        }
        throw updateError;
      }
      updated++;
    }

    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  return updated;
}

export { QUERIES };
