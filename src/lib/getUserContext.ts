import { createClient } from "@/lib/supabase/server";

/**
 * Fetches the user's profile from Supabase and returns a formatted string summary.
 * Used as system context for the general chatbot only: every general chat session
 * injects this so the bot has complete user context. Onboarding does not use this
 * (the user has no stored data yet; profile is built from the conversation).
 */
export async function getUserContext(userId: string): Promise<string> {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    return "No user profile available yet.";
  }

  const p = profile as Record<string, unknown>;

  const toArr = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.map(String);
    if (v == null || v === "") return [];
    return [String(v)];
  };
  const toStr = (v: unknown): string =>
    Array.isArray(v) ? v.join(", ") : v != null && v !== "" ? String(v) : "";

  const sections: string[] = [];

  const name = (p.full_name as string) ?? (p.name as string) ?? null;
  const university =
    (p.current_university as string) ?? (p.university as string) ?? null;

  if (name || university) {
    const identity = [
      name && `Name: ${name}`,
      university && `University: ${university}`,
      p.gpa && `GPA: ${p.gpa}`,
    ]
      .filter(Boolean)
      .join(" | ");
    sections.push(`USER IDENTITY\n${identity}`);
  }

  if (
    toStr(p.skills) ||
    p.internships ||
    p.leadership_positions ||
    p.projects ||
    p.entrepreneurship ||
    p.personal_impact
  ) {
    const exp = [
      toStr(p.skills) && `Skills: ${toStr(p.skills)}`,
      p.internships && `Internships: ${JSON.stringify(p.internships)}`,
      p.leadership_positions &&
        `Leadership: ${JSON.stringify(p.leadership_positions)}`,
      p.projects && `Projects: ${JSON.stringify(p.projects)}`,
      p.entrepreneurship &&
        `Entrepreneurship: ${JSON.stringify(p.entrepreneurship)}`,
      p.personal_impact && `Personal Impact: ${p.personal_impact}`,
    ]
      .filter(Boolean)
      .join("\n");
    sections.push(`PROFILE\n${exp}`);
  }

  if (toArr(p.target_functions).length || toArr(p.target_industries).length) {
    const asp = [
      toArr(p.target_functions).length &&
        `Target Functions: ${toArr(p.target_functions).join(", ")}`,
      toArr(p.target_industries).length &&
        `Target Industries: ${toArr(p.target_industries).join(", ")}`,
      p.experience_level &&
        `Experience Level: ${p.experience_level}`,
      p.commitment_type && `Commitment: ${p.commitment_type}`,
      toArr(p.work_mode).length &&
        `Work Mode: ${toArr(p.work_mode).join(", ")}`,
      toArr(p.preferred_locations).length &&
        `Preferred Locations: ${toArr(p.preferred_locations).join(", ")}`,
      p.aspirations_notes && `Notes: ${p.aspirations_notes}`,
    ]
      .filter(Boolean)
      .join("\n");
    sections.push(`ASPIRATIONS\n${asp}`);
  }

  if (
    toArr(p.focus_sections).length ||
    toArr(p.action_preferences).length ||
    p.profile_timeframe_weeks
  ) {
    const bench = [
      toArr(p.focus_sections).length &&
        `Focus Areas: ${toArr(p.focus_sections).join(", ")}`,
      p.profile_timeframe_weeks &&
        `Timeframe: ${p.profile_timeframe_weeks} weeks`,
      toArr(p.action_preferences).length &&
        `Action Preferences: ${toArr(p.action_preferences).join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n");
    sections.push(`BENCHMARKING PREFERENCES\n${bench}`);
  }

  if (toArr(p.preferred_signals).length) {
    const opp = [
      `Signals to show: ${toArr(p.preferred_signals).join(", ")}`,
      `Notify via: ${[p.notification_whatsapp && "WhatsApp", p.notification_email && "Email", p.notification_message && "Message"].filter(Boolean).join(", ") || "not set"}`,
    ]
      .filter(Boolean)
      .join("\n");
    sections.push(`OPPORTUNITY PREFERENCES\n${opp}`);
  }

  if (p.writing_style) {
    const out = [
      `Writing Style: ${p.writing_style}`,
      p.custom_writing_sample &&
        `Custom Style Sample: ${p.custom_writing_sample}`,
    ]
      .filter(Boolean)
      .join("\n");
    sections.push(`OUTREACH PREFERENCES\n${out}`);
  }

  if (
    p.additional_context &&
    typeof p.additional_context === "object" &&
    Object.keys(p.additional_context as object).length > 0
  ) {
    sections.push(
      `ADDITIONAL CONTEXT\n${JSON.stringify(p.additional_context, null, 2)}`
    );
  }

  if (sections.length === 0) {
    return "User has started onboarding but no profile data collected yet.";
  }

  return `USER PROFILE CONTEXT — inject this as background knowledge for every response. Do not repeat this back to the user unless asked. Use it silently to personalise all responses.

${sections.join("\n\n")}

Onboarding complete: ${p.onboarding_complete ? "Yes" : "No"}`;
}
