import { JD_QUERIES } from "./queries";
import { getExaClient, getServiceSupabase } from "./clients";

export async function fetchJDs(): Promise<number> {
  const exa = getExaClient();
  const supabase = getServiceSupabase();
  let totalFetched = 0;

  for (const config of JD_QUERIES) {
    try {
      const result = await exa.searchAndContents(config.query, {
        numResults: 8,
        text: true,
      });

      const validResults = result.results.filter((r) => r.text && r.text.length > 300);

      for (const r of validResults) {
        const { error } = await supabase.from("raw_jds").upsert(
          {
            firm: config.firm,
            firm_tier: config.firm_tier,
            source_url: r.url,
            title: r.title ?? null,
            content: r.text!.slice(0, 5000),
            extraction_status: "pending",
            fetched_at: new Date().toISOString(),
          },
          {
            onConflict: "source_url",
            ignoreDuplicates: true,
          }
        );

        if (!error) totalFetched++;
      }

      console.log(`✓ ${config.firm} | ${validResults.length} JDs fetched`);
    } catch (err) {
      console.error(`✗ JD fetch failed: ${config.firm}`, err);
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  return totalFetched;
}
