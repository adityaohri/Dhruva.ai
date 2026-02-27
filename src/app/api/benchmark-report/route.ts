import type { NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import path from "path";
import fs from "fs/promises";

type GapAnalysis = {
  overallSummary?: string;
  trajectoryFit?: string;
  careerAnchors?: string[] | unknown;
  skillGaps?: {
    missingTechnical?: { name: string; resourceUrl?: string }[] | unknown;
    missingSoft?: string[] | unknown;
  };
  concreteActions?: string[] | unknown;
};

/** Returns human-readable text only. Never returns raw JSON (avoids wall of text in PDF). */
function safeSectionText(value: unknown): string {
  const s = typeof value === "string" ? value.trim() : value != null ? String(value) : "";
  if (!s) return "";
  if (s.startsWith("{") && (s.includes("overallSummary") || s.includes("trajectoryFit"))) {
    try {
      const parsed = JSON.parse(s) as Record<string, unknown>;
      const summary = parsed.overallSummary ?? parsed.trajectoryFit;
      return typeof summary === "string" ? summary.trim() : "";
    } catch {
      return "";
    }
  }
  return s;
}

/** Returns an array of strings; never raw JSON or mixed content. */
function safeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((x) => (typeof x === "string" ? x : x != null ? String(x) : "")).filter(Boolean);
  if (typeof value === "string") {
    const t = value.trim();
    if (t.startsWith("[")) try { return (JSON.parse(t) as unknown[]).map((x) => String(x)).filter(Boolean); } catch { return []; }
    return t ? [t] : [];
  }
  return [];
}

/** Returns skillGaps shape with safe arrays. */
function safeSkillGaps(value: unknown): { missingTechnical: { name: string; resourceUrl?: string }[]; missingSoft: string[] } {
  if (!value || typeof value !== "object") return { missingTechnical: [], missingSoft: [] };
  const o = value as Record<string, unknown>;
  const tech = Array.isArray(o.missingTechnical)
    ? o.missingTechnical.map((t) => {
        if (typeof t === "object" && t && "name" in t) return { name: String((t as any).name || ""), resourceUrl: typeof (t as any).resourceUrl === "string" ? (t as any).resourceUrl : undefined };
        return { name: String(t), resourceUrl: undefined };
      }).filter((t) => t.name)
    : [];
  const soft = safeStringArray(o.missingSoft);
  return { missingTechnical: tech, missingSoft: soft };
}

function wrapText({
  text,
  font,
  size,
  maxWidth,
}: {
  text: string;
  font: any;
  size: number;
  maxWidth: number;
}): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const tentative = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(tentative, size);
    if (width <= maxWidth) {
      current = tentative;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function POST(req: NextRequest) {
  const { gapAnalysis, targetRole, targetCompany, targetIndustry } =
    (await req.json()) as {
      gapAnalysis?: GapAnalysis | string;
      targetRole?: string;
      targetCompany?: string;
      targetIndustry?: string;
    };

  if (!gapAnalysis) {
    return Response.json(
      { error: "gapAnalysis is required" },
      { status: 400 }
    );
  }

  // Normalise any JSON-like string or nested "overallSummary" JSON so
  // the PDF sections (overall summary, trajectory, anchors, skills)
  // always render clean, human-readable text instead of raw blobs.
  let normalized: GapAnalysis;
  if (typeof gapAnalysis === "string") {
    let cleaned = gapAnalysis.trim();
    try {
      normalized = JSON.parse(cleaned);
    } catch {
      if (cleaned.startsWith("{") && cleaned.includes("overallSummary")) {
        try {
          const firstBrace = cleaned.indexOf("{");
          const lastBrace = cleaned.lastIndexOf("}");
          const inner = cleaned.slice(firstBrace, lastBrace + 1);
          normalized = JSON.parse(inner);
        } catch {
          normalized = { overallSummary: cleaned };
        }
      } else {
        normalized = { overallSummary: cleaned };
      }
    }
  } else {
    normalized = { ...gapAnalysis };
    const raw = normalized.overallSummary?.trim();
    if (raw && raw.startsWith("{") && raw.includes("overallSummary")) {
      try {
        const inner = JSON.parse(raw);
        if (inner && typeof inner === "object") {
          normalized = inner;
        }
      } catch {
        // keep best-effort structure
      }
    }
  }

  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]);
  let { width, height } = page.getSize();

  // Cream background similar to site (#FDFBF1)
  const drawBackground = () => {
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(0xfd / 255, 0xfb / 255, 0xf1 / 255),
    });
  };

  drawBackground();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let cursorY = height - 60;

  try {
    const logoPath = path.join(process.cwd(), "public", "dhruva-logo.png");
    const logoBytes = await fs.readFile(logoPath);
    const logoImage = await pdfDoc.embedPng(logoBytes);
    const scale = 60 / logoImage.height;
    const logoWidth = logoImage.width * scale;
    const logoHeight = logoImage.height * scale;
    // place logo top-right with padding
    page.drawImage(logoImage, {
      x: width - logoWidth - 40,
      y: height - logoHeight - 40,
      width: logoWidth,
      height: logoHeight,
    });
  } catch {
    // If logo load fails, continue without crashing
  }

  // Title top-left
  page.drawText("Profile Benchmarking Report", {
    x: 40,
    y: height - 80,
    size: 18,
    font: bold,
    color: rgb(0.235, 0.165, 0.415),
  });
  cursorY = height - 110;

  const marginX = 40;
  const maxWidth = width - marginX * 2;

  const ensureSpace = (needed: number) => {
    if (cursorY - needed < 60) {
      // create a new page and reset background + cursor
      page = pdfDoc.addPage([595.28, 841.89]);
      ({ width, height } = page.getSize());
      drawBackground();
      cursorY = height - 60;
    }
    return page;
  };

  const drawSectionTitle = (title: string) => {
    const p = ensureSpace(30);
    p.drawText(title, {
      x: marginX,
      y: cursorY,
      size: 12,
      font: bold,
      color: rgb(0.2, 0.2, 0.25),
    });
    cursorY -= 18;
  };

  const drawParagraph = (text?: string) => {
    if (!text) return;
    const lines = wrapText({ text, font, size: 10, maxWidth });
    for (const line of lines) {
      const p = ensureSpace(14);
      p.drawText(line, {
        x: marginX,
        y: cursorY,
        size: 10,
        font,
        color: rgb(0.15, 0.15, 0.18),
      });
      cursorY -= 12;
    }
    cursorY -= 4;
  };

  const drawBullets = (items?: string[]) => {
    if (!items || !items.length) return;
    for (const item of items) {
      const lines = wrapText({
        text: item,
        font,
        size: 10,
        maxWidth: maxWidth - 12,
      });
      for (let i = 0; i < lines.length; i++) {
        const prefix = i === 0 ? "• " : "  ";
        const p = ensureSpace(14);
        p.drawText(prefix + lines[i], {
          x: marginX,
          y: cursorY,
          size: 10,
          font,
          color: rgb(0.15, 0.15, 0.18),
        });
        cursorY -= 12;
      }
      cursorY -= 2;
    }
    cursorY -= 4;
  };

  const metaParts = [];
  if (targetRole) metaParts.push(`Target role: ${targetRole}`);
  if (targetCompany) metaParts.push(`Target company: ${targetCompany}`);
  if (targetIndustry) metaParts.push(`Industry: ${targetIndustry}`);
  if (metaParts.length) {
    const meta = metaParts.join(" | ");
    const lines = wrapText({ text: meta, font, size: 10, maxWidth });
    for (const line of lines) {
      const p = ensureSpace(14);
      p.drawText(line, {
        x: marginX,
        y: cursorY,
        size: 10,
        font,
        color: rgb(0.3, 0.3, 0.35),
      });
      cursorY -= 12;
    }
    cursorY -= 8;
  }

  drawSectionTitle("Overall summary");
  drawParagraph(safeSectionText(normalized.overallSummary));

  drawSectionTitle("Trajectory fit");
  drawParagraph(safeSectionText(normalized.trajectoryFit));

  const careerAnchorsList = safeStringArray(normalized.careerAnchors);
  if (careerAnchorsList.length) {
    drawSectionTitle("Career anchors");
    drawBullets(careerAnchorsList);
  }

  const skillGapsSafe = safeSkillGaps(normalized.skillGaps);
  if (skillGapsSafe.missingTechnical.length || skillGapsSafe.missingSoft.length) {
    drawSectionTitle("Skill gaps");
    const tech = skillGapsSafe.missingTechnical;
    const soft = skillGapsSafe.missingSoft;
    if (tech.length) {
      drawParagraph("Technical skills (with suggested resources):");
      drawBullets(tech.map((s) => (s.resourceUrl ? `${s.name} — ${s.resourceUrl}` : s.name)));
    }
    if (soft.length) {
      drawParagraph("Soft skills:");
      drawBullets(soft);
    }
  }

  const concreteActionsList = safeStringArray(normalized.concreteActions);
  if (concreteActionsList.length) {
    drawSectionTitle("Concrete actions");
    drawBullets(concreteActionsList);
  }

  const pdfBytes = await pdfDoc.save();

  // Cast to any to satisfy BodyInit typing in this environment; at runtime
  // Response happily accepts a Uint8Array as the body.
  return new Response(pdfBytes as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        'attachment; filename="profile-benchmarking-report.pdf"',
    },
  });
}

