import { enrichSignal } from "@/lib/layer2/enrichment";

type AuditScope = {
  targetCompany?: string;
  targetRole?: string;
};

type QualitativeSignalRow = {
  firm: string | null;
  signal_type: string | null;
  source: string | null;
  source_url: string | null;
  content: string | null;
  scraped_at: string | null;
  cleaned_summary?: string | null;
  signal_strength?: "High" | "Medium" | "Low" | null;
  inferred_role?: string | null;
  actionable_inference?: string | null;
};

type ScopedSignalLine = {
  firm: string;
  signal_type: string;
  signal_strength: "High" | "Medium" | "Low";
  inferred_role: string;
  cleaned_summary: string;
  actionable_inference: string;
  source: string;
  source_url: string;
};

function parseSignalType(signalType: string | null):
  | "interview_experience"
  | "hiring_criteria"
  | "process_structure"
  | "profile_tip" {
  if (
    signalType === "interview_experience" ||
    signalType === "hiring_criteria" ||
    signalType === "process_structure" ||
    signalType === "profile_tip"
  ) {
    return signalType;
  }
  return "hiring_criteria";
}

function toLine(r: QualitativeSignalRow): ScopedSignalLine {
  const content = r.content ?? "";
  const signalType = parseSignalType(r.signal_type);
  const enriched = enrichSignal(signalType, content);
  return {
    firm: r.firm ?? "unknown",
    signal_type: signalType,
    signal_strength: r.signal_strength ?? enriched.signal_strength,
    inferred_role: r.inferred_role ?? enriched.inferred_role,
    cleaned_summary: r.cleaned_summary ?? enriched.cleaned_summary,
    actionable_inference: r.actionable_inference ?? enriched.actionable_inference,
    source: r.source ?? "",
    source_url: r.source_url ?? "",
  };
}

function formatLines(lines: ScopedSignalLine[]): string {
  if (lines.length === 0) return "No external hiring signals available.";
  return lines
    .map(
      (r, i) =>
        `${i + 1}. firm=${r.firm}; type=${r.signal_type}; strength=${r.signal_strength}; role=${r.inferred_role}; summary=${r.cleaned_summary}; inference=${r.actionable_inference}; source=${r.source}; url=${r.source_url}`
    )
    .join("\n");
}

export async function buildLayer2SignalIntelligence(
  supabase: any,
  audit: AuditScope,
  maxRows: number = 12
): Promise<{ context: string; lines: ScopedSignalLine[] }> {
  let rows: QualitativeSignalRow[] = [];
  const preferredCols =
    "firm, signal_type, source, source_url, content, scraped_at, cleaned_summary, signal_strength, inferred_role, actionable_inference";
  const fallbackCols = "firm, signal_type, source, source_url, content, scraped_at";

  const primary = await supabase
    .from("qualitative_signals")
    .select(preferredCols)
    .order("scraped_at", { ascending: false })
    .limit(150);

  if (primary.error) {
    const fallback = await supabase
      .from("qualitative_signals")
      .select(fallbackCols)
      .order("scraped_at", { ascending: false })
      .limit(150);
    if (fallback.error) {
      return { context: "No external hiring signals available.", lines: [] };
    }
    rows = (fallback.data ?? []) as QualitativeSignalRow[];
  } else {
    rows = (primary.data ?? []) as QualitativeSignalRow[];
  }

  const targetCompany = (audit.targetCompany ?? "").trim().toLowerCase();
  const targetRole = (audit.targetRole ?? "").trim().toLowerCase();

  const scoped = rows.filter((r) => {
    const companyBlob = `${r.firm ?? ""} ${r.content ?? ""}`.toLowerCase();
    if (targetCompany && !companyBlob.includes(targetCompany)) return false;
    const roleBlob = `${r.inferred_role ?? ""} ${r.content ?? ""}`.toLowerCase();
    if (targetRole && !roleBlob.includes(targetRole)) return false;
    return true;
  });

  const selected = (scoped.length ? scoped : rows).slice(0, maxRows).map(toLine);
  return {
    context: formatLines(selected),
    lines: selected,
  };
}
