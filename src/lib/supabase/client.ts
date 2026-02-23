import { createBrowserClient } from "@supabase/ssr";

function readEnv(value: string | undefined): string {
  if (!value) return "";
  return value.trim().split(/\r?\n/)[0].trim();
}

export function createClient() {
  const url = readEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = readEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return createBrowserClient(url, key);
}
