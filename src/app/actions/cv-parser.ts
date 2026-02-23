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
  entrepreneurial_leadership: boolean | string;
  personal_impact: boolean | string;
}

const MCKINSEY_PROMPT = `You are an elite McKinsey recruiter. Analyze this CV text. Extract the Name, University, GPA, and a list of Skills. Also, identify if they demonstrate "Entrepreneurial Leadership" or "Personal Impact." Format everything as a clean JSON object with these exact keys: name (string), university (string), gpa (string), skills (array of strings), entrepreneurial_leadership (boolean or short string describing evidence), personal_impact (boolean or short string describing evidence). Return only valid JSON, no markdown or extra text.`;

export async function parsePdfWithAI(formData: FormData): Promise<{
  success: true;
  data: ParsedCV;
} | { success: false; error: string }> {
  const hasOpenAIKey = Boolean(
    process.env.OPENAI_API_KEY?.trim?.() ?? process.env.OPENAI_API_KEY
  );
  console.log("[parsePdfWithAI] START – FormData received, OPENAI_API_KEY set:", hasOpenAIKey);

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

  const apiKey = process.env.OPENAI_API_KEY?.trim?.() || process.env.OPENAI_API_KEY;
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

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      console.log("[parsePdfWithAI] END – empty AI response");
      return { success: false, error: "No response from AI." };
    }

    const data = JSON.parse(raw) as ParsedCV;
    const parsed: ParsedCV = {
      name: typeof data.name === "string" ? data.name : "",
      university: typeof data.university === "string" ? data.university : "",
      gpa: typeof data.gpa === "string" ? data.gpa : String(data.gpa ?? ""),
      skills: Array.isArray(data.skills) ? data.skills.map(String) : [],
      entrepreneurial_leadership: data.entrepreneurial_leadership ?? false,
      personal_impact: data.personal_impact ?? false,
    };
    console.log("[parsePdfWithAI] END – success", { name: parsed.name });
    return { success: true, data: parsed };
  } catch (e) {
    console.error("[parsePdfWithAI] OpenAI error:", e);
    const message = e instanceof Error ? e.message : "AI analysis failed.";
    if (message.includes("401") || message.toLowerCase().includes("invalid") || message.toLowerCase().includes("incorrect api key")) {
      return { success: false, error: "Invalid API key. Check OPENAI_API_KEY in .env.local." };
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
