import { createClient } from "@/lib/supabase/client";

const REBUILD_FREQUENCY_HOURS = 6;

const hoursToMs = (h: number) => h * 60 * 60 * 1000;

function toStringArray(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string") return v.split(/[,|\n]/).map((s) => s.trim()).filter(Boolean);
  if (typeof v === "object") {
    // If it’s an object, best-effort: take keys or string values.
    const obj = v as Record<string, unknown>;
    const vals = Object.values(obj)
      .flatMap((x) => (Array.isArray(x) ? x : [x]))
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean);
    if (vals.length) return vals;
    return Object.keys(obj).map((s) => s.trim()).filter(Boolean);
  }
  return [String(v)].map((s) => s.trim()).filter(Boolean);
}

function uniq(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const a of arr) {
    const k = a.trim();
    if (!k) continue;
    if (seen.has(k.toLowerCase())) continue;
    seen.add(k.toLowerCase());
    out.push(k);
  }
  return out;
}

function clampPercent(n: unknown): number | null {
  const x = typeof n === "number" ? n : typeof n === "string" ? Number(n) : NaN;
  if (!Number.isFinite(x)) return null;
  return Math.max(0, Math.min(100, x));
}

export async function rebuildUserContext(userId: string): Promise<void> {
  const supabase = createClient();

  // STEP 1 — Fetch profile audit data
  const [{ data: lastGap }, { data: planRows }, { data: chatRows }] = await Promise.all([
    supabase
      .from("profile_audit_activity")
      .select(
        "target_role, target_company, gaps_found, strengths_found, benchmark_data_source, created_at"
      )
      .eq("user_id", userId)
      .eq("activity_type", "gap_analysis")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profile_audit_activity")
      .select("plan_sections, completion_percentage, timeframe_weeks, created_at")
      .eq("user_id", userId)
      .in("activity_type", ["plan_created", "plan_updated"])
      .order("created_at", { ascending: false }),
    supabase
      .from("profile_audit_activity")
      .select("chat_summary, created_at")
      .eq("user_id", userId)
      .eq("activity_type", "chat_message")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const last_gap_analysis_role = (lastGap as any)?.target_role ?? null;
  const last_gap_analysis_company = (lastGap as any)?.target_company ?? null;

  const top_gaps = toStringArray((lastGap as any)?.gaps_found).slice(0, 8);
  const top_strengths = toStringArray((lastGap as any)?.strengths_found).slice(0, 8);

  const latestPlan = Array.isArray(planRows) && planRows.length > 0 ? planRows[0] : null;
  const active_plan_sections = uniq(
    toStringArray((latestPlan as any)?.plan_sections).slice(0, 10)
  );
  const plan_completion_percent =
    clampPercent((latestPlan as any)?.completion_percentage) ?? null;

  const profile_chat_summary = uniq(
    (Array.isArray(chatRows) ? chatRows : [])
      .map((r: any) => (typeof r?.chat_summary === "string" ? r.chat_summary.trim() : ""))
      .filter(Boolean)
  ).join(" | ");

  const profile_audit_summary = `User is targeting ${
    last_gap_analysis_role ? last_gap_analysis_role : "a role"
  }${last_gap_analysis_company ? ` at ${last_gap_analysis_company}` : ""}. Top gaps: ${
    top_gaps.length ? top_gaps.join(", ") : "not set"
  }. Top strengths: ${
    top_strengths.length ? top_strengths.join(", ") : "not set"
  }. Plan is ${
    plan_completion_percent != null ? `${plan_completion_percent}%` : "not set"
  } complete across ${
    active_plan_sections.length ? active_plan_sections.join(", ") : "not set"
  }.`;

  // STEP 2 — Fetch opportunity data
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: oppRows } = await supabase
    .from("opportunity_activity")
    .select("user_action, job_company, job_title, signal_type, created_at")
    .eq("user_id", userId)
    .gte("created_at", since30d)
    .limit(2000);

  const allOpp = (oppRows as any[]) ?? [];
  const total_jobs_viewed = allOpp.filter((r) => r.user_action === "viewed").length;
  const total_jobs_liked = allOpp.filter((r) => r.user_action === "liked").length;
  const total_jobs_wishlisted = allOpp.filter((r) => r.user_action === "wishlisted").length;
  const hidden_posts_clicked = allOpp.filter((r) => r.user_action === "clicked_post").length;

  const wishlisted_companies = uniq(
    allOpp
      .filter((r) => r.user_action === "wishlisted")
      .map((r) => (r.job_company ? String(r.job_company) : ""))
      .filter(Boolean)
  ).slice(0, 20);

  const wishlisted_roles = uniq(
    allOpp
      .filter((r) => r.user_action === "wishlisted")
      .map((r) => (r.job_title ? String(r.job_title) : ""))
      .filter(Boolean)
  ).slice(0, 20);

  const top_signal_types = uniq(
    allOpp
      .map((r) => (r.signal_type ? String(r.signal_type) : ""))
      .filter(Boolean)
  ).slice(0, 10);

  const opportunity_summary = `Has viewed ${total_jobs_viewed} jobs, liked ${total_jobs_liked}, wishlisted ${total_jobs_wishlisted}. Interested in companies: ${
    wishlisted_companies.length ? wishlisted_companies.join(", ") : "not set"
  }. Target roles: ${
    wishlisted_roles.length ? wishlisted_roles.join(", ") : "not set"
  }. Active signals: ${top_signal_types.length ? top_signal_types.join(", ") : "not set"}.`;

  // STEP 3 — Fetch outreach data
  const { data: outreachRows } = await supabase
    .from("outreach_activity")
    .select(
      "status, reply_received, target_company, chat_summary, outreach_sent_at, created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(2000);

  const allOut = (outreachRows as any[]) ?? [];
  const total_outreaches_sent = allOut.filter((r) =>
    ["sent", "replied", "followed_up", "closed"].includes(String(r.status ?? ""))
  ).length;
  const total_replies_received = allOut.filter((r) => r.reply_received === true).length;
  const reply_rate_percentage =
    total_outreaches_sent > 0
      ? Math.round((total_replies_received / total_outreaches_sent) * 1000) / 10
      : null;

  const companies_contacted = uniq(
    allOut
      .map((r) => (r.target_company ? String(r.target_company) : ""))
      .filter(Boolean)
  ).slice(0, 20);

  const outreach_chat_summary =
    (allOut.find((r) => typeof r.chat_summary === "string")?.chat_summary as string) ??
    null;

  const last_outreach_at =
    (allOut.find((r) => r.outreach_sent_at)?.outreach_sent_at as string | null) ??
    null;

  const outreach_summary = `Has sent ${total_outreaches_sent} outreach messages, received ${total_replies_received} replies${
    reply_rate_percentage != null ? ` (${reply_rate_percentage}% reply rate)` : ""
  }. Companies contacted: ${
    companies_contacted.length ? companies_contacted.join(", ") : "not set"
  }. Last outreach: ${last_outreach_at ? last_outreach_at : "not set"}.`;

  // STEP 4 — Build master_context
  const master_context = `
PROFILE INTELLIGENCE: ${profile_audit_summary}

OPPORTUNITY INTELLIGENCE: ${opportunity_summary}

OUTREACH COPILOT: ${outreach_summary}
`.trim();

  // STEP 5 — Upsert into user_context_summary
  const nowIso = new Date().toISOString();
  await supabase.from("user_context_summary").upsert(
    {
      user_id: userId,

      profile_audit_summary,
      last_gap_role: last_gap_analysis_role,
      last_gap_company: last_gap_analysis_company,
      top_gaps,
      top_strengths,
      active_plan_sections,
      plan_completion_percentage: plan_completion_percent,
      profile_chat_summary,

      total_jobs_viewed,
      total_jobs_liked,
      total_jobs_wishlisted,
      wishlisted_companies,
      wishlisted_roles,
      top_signal_types,
      hidden_posts_clicked,
      opportunity_summary,

      total_outreach_sent: total_outreaches_sent,
      total_replies_received,
      reply_rate_percentage,
      companies_contacted,
      outreach_chat_summary,
      last_outreach_at,

      master_context,

      last_rebuilt_at: nowIso,
      rebuild_frequency_hours: REBUILD_FREQUENCY_HOURS,
      updated_at: nowIso,
    },
    { onConflict: "user_id" }
  );
}

export async function getUserContext(userId: string): Promise<string> {
  const supabase = createClient();

  const { data: row } = await supabase
    .from("user_context_summary")
    .select("master_context, last_rebuilt_at, user_id")
    .eq("user_id", userId)
    .maybeSingle();

  const lastRebuilt = (row as any)?.last_rebuilt_at as string | null | undefined;
  const isStale =
    !lastRebuilt ||
    Date.now() - new Date(lastRebuilt).getTime() > hoursToMs(REBUILD_FREQUENCY_HOURS);

  // Always fetch recent activity fresh (do not cache)
  const [profile, recent] = await Promise.all([
    getUserProfile(userId),
    getRecentActivity(userId, 5),
  ]);

  if (!row || isStale) {
    await rebuildUserContext(userId);
    const { data: refreshed } = await supabase
      .from("user_context_summary")
      .select("master_context")
      .eq("user_id", userId)
      .maybeSingle();
    const ctx = (refreshed as any)?.master_context;
    const master_context =
      typeof ctx === "string" && ctx.trim()
        ? ctx.trim()
        : "No activity context available yet for this user.";
    return `
=== USER ACTIVITY CONTEXT ===
${master_context}

=== USER PROFILE ===
${profile}

=== RECENT ACTIVITY (last 5 actions) ===
${recent}
    `.trim();
  }

  const ctx = (row as any)?.master_context;
  const master_context =
    typeof ctx === "string" && ctx.trim()
      ? ctx.trim()
      : "No activity context available yet for this user.";
  return `
=== USER ACTIVITY CONTEXT ===
${master_context}

=== USER PROFILE ===
${profile}

=== RECENT ACTIVITY (last 5 actions) ===
${recent}
  `.trim();
}

export async function getUserProfile(userId: string): Promise<string> {
  const supabase = createClient();
  const { data: row } = await supabase
    .from("user_profiles")
    .select(
      "full_name, university, current_university, gpa, skills, internships, leadership_positions, projects, entrepreneurship, personal_impact, target_functions, target_industries, experience_level, commitment_type, work_mode, preferred_locations, writing_style, preferred_signals"
    )
    .eq("id", userId)
    .maybeSingle();

  if (!row) return "No profile data available yet.";

  const v = (x: unknown) =>
    x == null || String(x).trim() === "" ? "not specified" : String(x);
  const arr = (x: unknown) => {
    if (x == null) return "not specified";
    if (Array.isArray(x)) return x.length ? x.join(", ") : "not specified";
    const s = String(x).trim();
    return s ? s : "not specified";
  };

  const university =
    (row as any).university ??
    (row as any).current_university ??
    null;

  return `NAME: ${v((row as any).full_name)}
EDUCATION: ${v(university)}, GPA ${v((row as any).gpa)}
SKILLS: ${arr((row as any).skills)}
INTERNSHIPS: ${arr((row as any).internships)}
LEADERSHIP: ${arr((row as any).leadership_positions)}
PROJECTS: ${arr((row as any).projects)}
ENTREPRENEURSHIP: ${v((row as any).entrepreneurship)}
PERSONAL IMPACT: ${v((row as any).personal_impact)}
TARGET FUNCTIONS: ${arr((row as any).target_functions)}
TARGET INDUSTRIES: ${arr((row as any).target_industries)}
EXPERIENCE LEVEL: ${v((row as any).experience_level)}
COMMITMENT: ${v((row as any).commitment_type)}
WORK MODE: ${arr((row as any).work_mode)}
PREFERRED LOCATIONS: ${arr((row as any).preferred_locations)}
WRITING STYLE: ${v((row as any).writing_style)}
PREFERRED SIGNALS: ${arr((row as any).preferred_signals)}`.trim();
}

export async function getRecentActivity(
  userId: string,
  limit: number = 5
): Promise<string> {
  const supabase = createClient();

  const [pa, opp, out] = await Promise.all([
    supabase
      .from("profile_audit_activity")
      .select("activity_type, created_at, target_role, target_company, chat_summary")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("opportunity_activity")
      .select(
        "activity_type, user_action, created_at, job_title, job_company, signal_type, signal_company, linkedin_role, linkedin_company"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("outreach_activity")
      .select(
        "activity_type, status, created_at, target_name, target_company, outreach_type, reply_received, chat_summary"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const rows: { created_at: string; source: string; desc: string }[] = [];

  for (const r of ((pa.data as any[]) ?? [])) {
    const ts = r.created_at as string;
    const at = ts ? ts.slice(0, 16).replace("T", " ") : "";
    const type = String(r.activity_type ?? "");
    let desc = type;
    if (type === "gap_analysis") {
      const role = r.target_role ? String(r.target_role) : "a role";
      const company = r.target_company ? String(r.target_company) : "a company";
      desc = `ran gap analysis for ${role} at ${company}`;
    } else if (type === "chat_message" && r.chat_summary) {
      desc = `chat: ${String(r.chat_summary)}`;
    }
    rows.push({ created_at: ts, source: "profile_audit", desc: `${at} profile_audit: ${desc}` });
  }

  for (const r of ((opp.data as any[]) ?? [])) {
    const ts = r.created_at as string;
    const at = ts ? ts.slice(0, 16).replace("T", " ") : "";
    const action = String(r.user_action ?? "");
    const jobTitle = r.job_title ? String(r.job_title) : "";
    const jobCompany = r.job_company ? String(r.job_company) : "";
    const sigType = r.signal_type ? String(r.signal_type) : "";
    const sigCompany = r.signal_company ? String(r.signal_company) : "";
    const liRole = r.linkedin_role ? String(r.linkedin_role) : "";
    const liCompany = r.linkedin_company ? String(r.linkedin_company) : "";

    let desc = action || String(r.activity_type ?? "activity");
    if (action === "wishlisted" && (jobTitle || jobCompany)) {
      desc = `wishlisted job ${jobTitle || "role"}${jobCompany ? ` at ${jobCompany}` : ""}`;
    } else if (action === "viewed" && (jobTitle || jobCompany)) {
      desc = `viewed job ${jobTitle || "role"}${jobCompany ? ` at ${jobCompany}` : ""}`;
    } else if (action === "clicked_post" && (liRole || liCompany)) {
      desc = `clicked hidden post about ${liRole || "a role"}${liCompany ? ` at ${liCompany}` : ""}`;
    } else if (sigType || sigCompany) {
      desc = `signal ${sigType || "update"}${sigCompany ? ` for ${sigCompany}` : ""}`;
    }
    rows.push({ created_at: ts, source: "opportunity", desc: `${at} opportunity: ${desc}` });
  }

  for (const r of ((out.data as any[]) ?? [])) {
    const ts = r.created_at as string;
    const at = ts ? ts.slice(0, 16).replace("T", " ") : "";
    const status = String(r.status ?? "");
    const name = r.target_name ? String(r.target_name) : "";
    const company = r.target_company ? String(r.target_company) : "";
    const outreachType = r.outreach_type ? String(r.outreach_type) : "outreach";
    const replyReceived = r.reply_received === true;

    let desc = status || String(r.activity_type ?? "activity");
    if (status === "sent") {
      desc = `sent ${outreachType} to ${name || "a contact"}${company ? ` at ${company}` : ""}`;
    } else if (replyReceived) {
      desc = `received reply from ${name || "a contact"}${company ? ` at ${company}` : ""}`;
    } else if (r.chat_summary) {
      desc = `chat: ${String(r.chat_summary)}`;
    }
    rows.push({ created_at: ts, source: "outreach", desc: `${at} outreach: ${desc}` });
  }

  rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const top = rows.slice(0, limit).map((r) => r.desc);

  return top.length ? top.join("\n") : "No recent activity recorded.";
}

