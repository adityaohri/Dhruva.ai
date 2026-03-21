import { fetchJDs } from "./fetcher";
import { extractSkillsFromPendingJDs } from "./extractor";
import { computeSkillMatrix } from "./matrix";
import { getServiceSupabase } from "./clients";

export async function runLayer3Job(): Promise<void> {
  const supabase = getServiceSupabase();
  console.log("\n🗓 Layer 3 monthly job starting...\n");

  const logEntry = await supabase
    .from("scrape_run_log")
    .insert({ run_type: "layer3", status: "running" })
    .select("id")
    .single();

  const logId = logEntry.data?.id;

  try {
    console.log("📄 Step 1: Fetching JDs...");
    const fetched = await fetchJDs();
    console.log(`✓ ${fetched} new JDs fetched\n`);

    console.log("🧠 Step 2: Extracting skills with Claude Haiku...");
    let totalExtracted = 0;
    let passCount = 0;
    let extracted = 0;

    do {
      extracted = await extractSkillsFromPendingJDs();
      totalExtracted += extracted;
      passCount++;
    } while (extracted > 0 && passCount < 10);

    console.log(`✓ ${totalExtracted} JDs processed across ${passCount} passes\n`);

    console.log("📊 Step 3: Computing skill frequency matrix...");
    await computeSkillMatrix();
    console.log("✓ Matrix computed\n");

    await supabase
      .from("scrape_run_log")
      .update({
        status: "completed",
        results_saved: fetched + totalExtracted,
        completed_at: new Date().toISOString(),
      })
      .eq("id", logId);

    console.log("✅ Layer 3 job complete.");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Layer 3 job failed:", err);

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
}
