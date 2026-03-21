import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, getServiceSupabase } from "../clients";
import { JDQueryConfig } from "./queries";

const EXTRACTION_SYSTEM_PROMPT = `You are a skill extractor for investment banking job descriptions.

Read the job description and extract ALL skills, qualifications, and competencies mentioned.

Rules:
- Be specific: "Excel" not "Microsoft Office", "DCF modelling" not "financial modelling"
- Include hard skills, soft skills, tools, certifications, and qualifications
- Include IB-specific skills: "dcf valuation", "lbo modelling", "m&a", "pitchbook preparation", "financial modelling", "valuation", "bloomberg", "capital markets", "equity research"
- Include certifications if mentioned: "cfa", "ca", "frm", "cma"
- Include academic requirements if mentioned
- Normalise all skills to lowercase
- Output ONLY a valid JSON array of strings — no explanation, no preamble, no markdown

Example output:
["financial modelling", "dcf valuation", "excel", "powerpoint", "lbo modelling", "pitchbook preparation", "bloomberg terminal", "client communication", "ca or cfa preferred", "top tier university degree", "capital markets", "m&a advisory"]`;

export async function extractSkillsFromPendingJDs(batchSize: number = 5): Promise<number> {
  const _unused: JDQueryConfig[] = [];
  void _unused;
  const safeBatchSize = Math.max(1, Math.min(20, batchSize));
  const anthropic = getAnthropicClient();
  const supabase = getServiceSupabase();

  const { data: pendingJDs, error } = await supabase
    .from("raw_jds")
    .select("id, content, firm")
    .eq("extraction_status", "pending")
    .limit(safeBatchSize);

  if (error || !pendingJDs || pendingJDs.length === 0) {
    console.log("No pending JDs to process");
    return 0;
  }

  let successCount = 0;

  for (const jd of pendingJDs) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        system: EXTRACTION_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: jd.content ?? "",
          },
        ],
      });

      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === "text"
      );
      const rawText = textBlocks.map((b) => b.text).join("\n").trim();

      if (!rawText) throw new Error("Empty response from Haiku");

      const cleaned = rawText.replace(/```json|```/g, "").trim();
      const skills = JSON.parse(cleaned) as string[];
      if (!Array.isArray(skills)) throw new Error("Response is not an array");

      await supabase
        .from("raw_jds")
        .update({
          extracted_skills: skills,
          extraction_status: "completed",
          extracted_at: new Date().toISOString(),
        })
        .eq("id", jd.id);

      console.log(`✓ ${jd.firm} | ${skills.length} skills extracted`);
      successCount++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`✗ Extraction failed for JD ${jd.id}`, err);

      await supabase
        .from("raw_jds")
        .update({
          extraction_status: "failed",
          extraction_error: message,
        })
        .eq("id", jd.id);
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  return successCount;
}
