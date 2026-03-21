import { FIRM_TIERS } from "./queries";
import { getServiceSupabase } from "../clients";

export async function computeSkillMatrix(): Promise<void> {
  const supabase = getServiceSupabase();
  for (const tier of FIRM_TIERS) {
    const { data: jds, error } = await supabase
      .from("raw_jds")
      .select("extracted_skills")
      .eq("firm_tier", tier)
      .eq("extraction_status", "completed")
      .not("extracted_skills", "is", null);

    if (error || !jds || jds.length === 0) {
      console.log(`No completed JDs for tier: ${tier}`);
      continue;
    }

    const totalJDs = jds.length;
    const skillCounts: Record<string, number> = {};

    for (const jd of jds) {
      const skills = jd.extracted_skills as string[];
      if (!Array.isArray(skills)) continue;

      const uniqueSkills = new Set(skills.map((s) => s.toLowerCase().trim()));
      for (const skill of uniqueSkills) {
        if (!skill) continue;
        skillCounts[skill] = (skillCounts[skill] ?? 0) + 1;
      }
    }

    const matrixRows = Object.entries(skillCounts).map(([skill, count]) => ({
      firm_tier: tier,
      skill,
      frequency: Math.round((count / totalJDs) * 100) / 100,
      jd_count: totalJDs,
      occurrence_count: count,
      last_computed_at: new Date().toISOString(),
    }));

    const batchSize = 50;
    for (let i = 0; i < matrixRows.length; i += batchSize) {
      const batch = matrixRows.slice(i, i + batchSize);
      const { error: upsertError } = await supabase
        .from("skill_frequency_matrix")
        .upsert(batch, { onConflict: "firm_tier,skill" });

      if (upsertError) {
        console.error(`Matrix upsert error for ${tier}:`, upsertError);
      }
    }

    console.log(`✓ ${tier} | ${totalJDs} JDs | ${matrixRows.length} skills computed`);
  }
}
