"use server";

import { extractText } from "unpdf";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

/** Call this to verify OPENAI_API_KEY is visible on the server (e.g. after adding to .env.local). */
export async function checkOpenAIKey(): Promise<{ configured: boolean }> {
  const key = process.env.OPENAI_API_KEY?.trim?.() || process.env.OPENAI_API_KEY;
  return { configured: Boolean(key && key.length > 10) };
}

export interface ParsedCV {
  name: string;
  university: string;
  gpa: string;
  skills: string[];
  internships: string[];
  leadership_positions: string | null;
  projects: string | null;
  others: string | null;
  entrepreneurial_leadership: boolean | string;
  personal_impact: boolean | string;
}

const MCKINSEY_PROMPT = `You are an elite McKinsey recruiter. Analyze this CV text and extract structured data according to the rules below.

**Synonym mapping for experience / internships**
Any section whose heading contains "Internship", "Internships", "Work Experience", "Professional Experience", "Employment", "Experience", or combinations like "Internships & Work Experience" MUST be treated as the source for the internships field. Do not skip these sections. Extract every role (internship or job) listed under such headings into the internships array.

**Skills extraction**
Treat any section whose heading contains "Skills", "Technical Skills", "Skills & Tools", "Technical Proficiencies", "Core Competencies", or similar as the source for the skills field. Split comma-separated or bullet-listed items into individual skills and return them as an array of short strings (e.g. ["Python", "SQL", "Excel", "Power BI"]). Use only skills, tools, and technologies that are explicitly listed in the CV.

**Internship data format**
Format each entry as a single string: "Company Name - Role Title" (e.g. "McKinsey & Co. - Business Analyst Intern"). Use only company names and role titles that appear explicitly in the CV—you may combine them into "Company - Role" when they are clearly stated in the same bullet or block; do not invent company or role names. The internships field must be an array of such strings.

**Catch-all for other sections**
If you encounter any section that does not clearly fit into Education, Internships, Leadership, or Projects (e.g. Certifications, Languages, Volunteer Work, Awards, Hobbies, Publications), summarize its content into the others field. Do not discard any information from the CV—anything that does not belong in the other fields goes into others.

**Safety**
If a section is genuinely missing from the CV, return null for that field (or an empty array [] for skills and internships). Do not invent company names, role titles, or other facts. You may combine information that is explicitly stated (e.g. company and role from the same bullet) into the required format; only omit a field when the CV contains no relevant content for it.

**Required JSON structure**
Return a single JSON object with exactly these keys (no extra keys):
- full_name (string)
- university (string)
- gpa (string)
- skills (array of strings)
- internships (array of strings, each entry "Company Name - Role Title")
- leadership_positions (string, or null if missing)
- projects (string, or null if missing)
- others (string, or null if missing)
- entrepreneurial_leadership (boolean or short string describing evidence)
- personal_impact (boolean or short string describing evidence)

Return only valid JSON, no markdown, no code fences, no extra text.`;

export async function parsePdfWithAI(formData: FormData): Promise<{
  success: true;
  data: ParsedCV;
} | { success: false; error: string }> {
  try {
    const hasOpenAIKey = Boolean(
      process.env.OPENAI_API_KEY?.trim?.() ?? process.env.OPENAI_API_KEY
    );
    console.log(
      "[parsePdfWithAI] START – FormData received, OPENAI_API_KEY set:",
      hasOpenAIKey
    );

    const file = formData.get("pdf") as File | Blob | null;
    if (!file || typeof (file as Blob).arrayBuffer !== "function") {
      console.log("[parsePdfWithAI] END – invalid or missing PDF file");
      return { success: false, error: "Please upload a valid PDF file." };
    }

    let text: string;
    try {
      console.log("[parsePdfWithAI] Extracting text from PDF…");
      const arrayBuffer = await (file as Blob).arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        console.log("[parsePdfWithAI] END – file is empty");
        return { success: false, error: "The uploaded file is empty." };
      }
      const data = new Uint8Array(arrayBuffer);
      const { text: extracted } = await extractText(data, { mergePages: true });
      text = extracted ?? "";
      console.log("[parsePdfWithAI] PDF text length:", text?.length ?? 0);
    } catch (e) {
      console.error("[parsePdfWithAI] PDF parse error:", e);
      return {
        success: false,
        error:
          "PDF could not be read. The file may be corrupted or not a valid PDF. Try a different file or ensure it is a text-based PDF.",
      };
    }

    if (!text?.trim()) {
      console.log("[parsePdfWithAI] END – no text in PDF");
      return { success: false, error: "No text could be extracted from the PDF." };
    }

    const rawKey = process.env.OPENAI_API_KEY ?? "";
    const apiKey = rawKey.trim().split(/\r?\n/)[0].trim();
    if (!apiKey) {
      console.log("[parsePdfWithAI] END – OPENAI_API_KEY missing or empty");
      return {
        success: false,
        error:
          "OpenAI API key is not configured. Add OPENAI_API_KEY to .env.local and restart the dev server (npm run dev).",
      };
    }

    const openai = new OpenAI({ apiKey });
    const callOpenAI = async () =>
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: MCKINSEY_PROMPT },
          { role: "user", content: `CV text:\n\n${text.slice(0, 12000)}` },
        ],
        response_format: { type: "json_object" },
      });

    const isRateLimit = (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      return msg.includes("429") || msg.toLowerCase().includes("rate limit");
    };

    try {
      console.log("[parsePdfWithAI] Calling OpenAI gpt-4o…");
      let completion: Awaited<ReturnType<typeof callOpenAI>>;
      try {
        completion = await callOpenAI();
      } catch (firstErr) {
        if (isRateLimit(firstErr)) {
          console.log("[parsePdfWithAI] Rate limited, retrying after 3s…");
          await new Promise((r) => setTimeout(r, 3000));
          completion = await callOpenAI();
        } else {
          throw firstErr;
        }
      }

      if (!completion.choices || completion.choices.length === 0) {
        console.log("[parsePdfWithAI] END – AI returned no choices");
        return { success: false, error: "AI returned no choices." };
      }

      const raw = completion.choices[0].message?.content;
      if (typeof raw !== "string" || !raw.trim()) {
        console.log("[parsePdfWithAI] END – empty AI response content");
        return { success: false, error: "AI returned an empty response." };
      }

      type AIMessage = {
        full_name?: string | null;
        name?: string | null;
        university?: string | null;
        gpa?: string | null;
        skills?: unknown;
        internships?: unknown;
        leadership_positions?: string | null;
        projects?: string | null;
        others?: string | null;
        entrepreneurial_leadership?: boolean | string | null;
        personal_impact?: boolean | string | null;
      };

      let data: AIMessage;
      try {
        data = JSON.parse(raw) as AIMessage;
      } catch (err) {
        console.error("[parsePdfWithAI] JSON parse error:", err, raw);
        return {
          success: false,
          error: "AI returned invalid JSON. Please try again with a different CV.",
        };
      }

      const normalizedSkills = (() => {
        if (Array.isArray(data.skills)) {
          return data.skills.map(String).map((s) => s.trim()).filter(Boolean);
        }
        if (typeof data.skills === "string" && data.skills.trim()) {
          return data.skills
            .split(/[,;\n]/)
            .map((s) => s.trim())
            .filter(Boolean);
        }
        return [] as string[];
      })();

      const normalizedInternships = (() => {
        const result: string[] = [];
        if (Array.isArray(data.internships)) {
          for (const entry of data.internships) {
            if (!entry) continue;
            if (typeof entry === "string") {
              const trimmed = entry.trim();
              if (trimmed) result.push(trimmed);
            } else if (typeof entry === "object") {
              const anyEntry = entry as Record<string, unknown>;
              const company = typeof anyEntry.company === "string" ? anyEntry.company.trim() : "";
              const role = typeof anyEntry.role === "string" ? anyEntry.role.trim() : "";
              if (company && role) {
                result.push(`${company} - ${role}`);
              }
            }
          }
        } else if (typeof data.internships === "string" && data.internships.trim()) {
          for (const line of data.internships.split(/\n|;/)) {
            const trimmed = line.trim();
            if (trimmed) result.push(trimmed);
          }
        }
        return result;
      })();

      const parsed: ParsedCV = {
        name:
          typeof data.full_name === "string"
            ? data.full_name
            : typeof data.name === "string"
              ? data.name
              : "",
        university: typeof data.university === "string" ? data.university : "",
        gpa: typeof data.gpa === "string" ? data.gpa : String(data.gpa ?? ""),
        skills: normalizedSkills,
        internships: normalizedInternships,
        leadership_positions:
          data.leadership_positions != null && typeof data.leadership_positions === "string"
            ? data.leadership_positions
            : null,
        projects:
          data.projects != null && typeof data.projects === "string"
            ? data.projects
            : null,
        others:
          data.others != null && typeof data.others === "string"
            ? data.others
            : null,
        entrepreneurial_leadership: data.entrepreneurial_leadership ?? false,
        personal_impact: data.personal_impact ?? false,
      };
      console.log("[parsePdfWithAI] END – success", { name: parsed.name });
      return { success: true, data: parsed };
    } catch (e) {
      console.error("[parsePdfWithAI] OpenAI error:", e);
      const message = e instanceof Error ? e.message : "AI analysis failed.";
      if (
        message.includes("401") ||
        message.toLowerCase().includes("invalid") ||
        message.toLowerCase().includes("incorrect api key")
      ) {
        return {
          success: false,
          error: "Invalid API key. Check OPENAI_API_KEY in .env.local.",
        };
      }
      if (isRateLimit(e)) {
        return {
          success: false,
          error:
            "OpenAI rate limit reached. Wait 1–2 minutes and try again, or check usage at platform.openai.com.",
        };
      }
      return { success: false, error: message };
    }
  } catch (e) {
    console.error("[parsePdfWithAI] UNHANDLED error:", e);
    const message = e instanceof Error ? e.message : "Unexpected server error.";
    return { success: false, error: message };
  }
}

export async function saveProfileToSupabase(profile: ParsedCV): Promise<{
  success: true;
} | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be logged in to save." };
  }

  const row = {
    user_id: user.id,
    full_name: profile.name,
    university: profile.university,
    gpa: profile.gpa,
    skills: profile.skills,
    internships: profile.internships,
    leadership_positions: profile.leadership_positions,
    projects: profile.projects,
    others: profile.others,
    entrepreneurial_leadership:
      typeof profile.entrepreneurial_leadership === "string"
        ? profile.entrepreneurial_leadership
        : profile.entrepreneurial_leadership
          ? "Yes"
          : "No",
    personal_impact:
      typeof profile.personal_impact === "string"
        ? profile.personal_impact
        : profile.personal_impact
          ? "Yes"
          : "No",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("user_profiles").upsert(row, {
    onConflict: "user_id",
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
