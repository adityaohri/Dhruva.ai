import Exa from "exa-js";
import Anthropic from "@anthropic-ai/sdk";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function readEnv(value: string | undefined): string {
  if (!value) return "";
  return value.trim().split(/\r?\n/)[0].trim();
}

let _exa: Exa | null = null;
export function getExaClient(): Exa {
  if (_exa) return _exa;
  const key = readEnv(process.env.EXA_API_KEY);
  if (!key) throw new Error("Missing EXA_API_KEY");
  _exa = new Exa(key);
  return _exa;
}

let _anthropic: Anthropic | null = null;
export function getAnthropicClient(): Anthropic {
  if (_anthropic) return _anthropic;
  const key = readEnv(process.env.ANTHROPIC_API_KEY);
  if (!key) throw new Error("Missing ANTHROPIC_API_KEY");
  _anthropic = new Anthropic({ apiKey: key });
  return _anthropic;
}

let _supabase: SupabaseClient | null = null;
export function getServiceSupabase(): SupabaseClient {
  if (_supabase) return _supabase;
  const url = readEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = readEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) {
    throw new Error(
      "Missing Supabase service env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  _supabase = createClient(url, key);
  return _supabase;
}
