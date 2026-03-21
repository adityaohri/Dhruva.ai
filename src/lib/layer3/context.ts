import { createClient } from "@/lib/supabase/server";

export type Layer3Tier =
  | "mbb"
  | "strategy_boutique"
  | "big4"
  | "social_governance"
  | "indian_boutique";

export function inferConsultingTierFromCompany(
  company?: string | null
): Layer3Tier | null {
  if (!company) return null;
  const c = company.toLowerCase();
  if (/(mckinsey|bcg|bain)/.test(c)) return "mbb";
  if (
    /(kearney|ey parthenon|parthenon|accenture strategy|roland berger|oliver wyman)/.test(
      c
    )
  ) {
    return "strategy_boutique";
  }
  if (/(deloitte|pwc|strategy&|kpmg)/.test(c)) return "big4";
  if (/(samagra|dalberg|idinsight|sattva)/.test(c)) return "social_governance";
  if (/(redseer|praxis|zs|kepler cannon)/.test(c)) return "indian_boutique";
  return null;
}

export async function buildLayer3ConsultingContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  targetCompany?: string | null,
  targetIndustry?: string | null
): Promise<string> {
  const isConsulting =
    (targetIndustry ?? "").toLowerCase().includes("consult") ||
    Boolean(inferConsultingTierFromCompany(targetCompany));
  if (!isConsulting) {
    return "Layer3 skill matrix context not used (non-consulting target).";
  }

  const preferredTier = inferConsultingTierFromCompany(targetCompany) ?? "mbb";
  const tiers: Layer3Tier[] = [
    preferredTier,
    "mbb",
    "strategy_boutique",
    "big4",
    "social_governance",
    "indian_boutique",
  ].filter((v, i, arr): v is Layer3Tier => arr.indexOf(v) === i);

  for (const tier of tiers) {
    const { data, error } = await supabase
      .from("skill_frequency_matrix")
      .select("skill, frequency, occurrence_count, jd_count")
      .eq("firm_tier", tier)
      .order("frequency", { ascending: false })
      .limit(20);
    if (error || !data || data.length === 0) continue;

    const lines = data.map(
      (r, idx) =>
        `${idx + 1}. ${String(r.skill)} | freq=${Math.round(
          Number(r.frequency || 0) * 100
        )}% | occurrence=${Number(r.occurrence_count || 0)}/${Number(
          r.jd_count || 0
        )}`
    );
    return `Layer3 consulting skill matrix tier=${tier}\n${lines.join("\n")}`;
  }

  return "Layer3 consulting skill matrix not available yet.";
}
