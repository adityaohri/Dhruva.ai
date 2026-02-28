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
function safeSkillGaps(
  value: unknown
): { missingTechnical: { name: string; resourceUrl?: string }[]; missingSoft: string[] } {
  if (!value || typeof value !== "object") return { missingTechnical: [], missingSoft: [] };
  const o = value as Record<string, unknown>;
  const tech = Array.isArray(o.missingTechnical)
    ? o.missingTechnical
        .map((t) => {
          if (typeof t === "object" && t && "name" in t)
            return {
              name: String((t as any).name || ""),
              resourceUrl:
                typeof (t as any).resourceUrl === "string" ? (t as any).resourceUrl : undefined,
            };
          return { name: String(t), resourceUrl: undefined };
        })
        .filter((t) => t.name)
    : [];
  const soft = safeStringArray(o.missingSoft);
  return { missingTechnical: tech, missingSoft: soft };
}

type ParsedCareerAnchor = {
  name: string;
  value: number;
  raw: string;
};

/** Extracts percentage + label from careerAnchors strings for visualisation. */
function parseCareerAnchors(rawAnchors: string[]): ParsedCareerAnchor[] {
  return rawAnchors.map((anchor, idx) => {
    const match = anchor.match(/(\d+)\s*%/);
    const value = match ? Number(match[1]) : 50;
    const label = anchor.replace(match?.[0] ?? "", "").trim();
    const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 50;
    return {
      name: label || `Anchor ${idx + 1}`,
      value: safeValue,
      raw: anchor,
    };
  });
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
  const bottomMargin = 70; // enough clearance so content never overlaps

  const ensureSpace = (needed: number) => {
    if (cursorY - needed < bottomMargin) {
      page = pdfDoc.addPage([595.28, 841.89]);
      ({ width, height } = page.getSize());
      drawBackground();
      cursorY = height - 60;
    }
    return page;
  };

  /** Extra gap before a new section so it never overlaps the previous block. */
  const sectionGap = () => {
    cursorY -= 20;
  };

  const drawSectionTitle = (title: string) => {
    sectionGap();
    const p = ensureSpace(36);
    p.drawText(title, {
      x: marginX,
      y: cursorY,
      size: 12,
      font: bold,
      color: rgb(0.2, 0.2, 0.25),
    });
    cursorY -= 22;
  };

  const drawParagraph = (text?: string) => {
    if (!text) return;
    const lines = wrapText({ text, font, size: 10, maxWidth });
    for (const line of lines) {
      const p = ensureSpace(15);
      p.drawText(line, {
        x: marginX,
        y: cursorY,
        size: 10,
        font,
        color: rgb(0.15, 0.15, 0.18),
      });
      cursorY -= 14;
    }
    cursorY -= 8;
  };

  const drawBullets = (items?: string[]) => {
    if (!items || !items.length) return;
    for (const item of items) {
      const lines = wrapText({
        text: item,
        font,
        size: 10,
        maxWidth: maxWidth - 14,
      });
      for (let i = 0; i < lines.length; i++) {
        const prefix = i === 0 ? "• " : "  ";
        const p = ensureSpace(15);
        p.drawText(prefix + lines[i], {
          x: marginX,
          y: cursorY,
          size: 10,
          font,
          color: rgb(0.15, 0.15, 0.18),
        });
        cursorY -= 14;
      }
      cursorY -= 10;
    }
    cursorY -= 6;
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
  const trajectoryText = safeSectionText(normalized.trajectoryFit);
  if (trajectoryText) {
    // Derive a simple fit score from the text (mirrors the dashboard logic).
    const lower = trajectoryText.toLowerCase();
    let score = 60;
    if (lower.includes("high") || lower.includes("strong")) score = 85;
    else if (lower.includes("moderate")) score = 60;
    else if (lower.includes("low") || lower.includes("weak")) score = 30;

    const p = ensureSpace(30);
    const barX = marginX;
    const barY = cursorY - 8;
    const barWidth = maxWidth;
    const barHeight = 6;

    // Background track
    p.drawRectangle({
      x: barX,
      y: barY,
      width: barWidth,
      height: barHeight,
      color: rgb(0.93, 0.93, 0.96),
    });
    // Filled portion showing fit percentage
    p.drawRectangle({
      x: barX,
      y: barY,
      width: (barWidth * score) / 100,
      height: barHeight,
      color: rgb(0.235, 0.165, 0.415),
    });
    // Numeric label on the right
    p.drawText(`${score}% fit`, {
      x: barX + barWidth - 48,
      y: barY + 10,
      size: 9,
      font,
      color: rgb(0.3, 0.3, 0.35),
    });

    cursorY -= 28;
    drawParagraph(trajectoryText);
    cursorY -= 6;
  }

  const careerAnchorsList = safeStringArray(normalized.careerAnchors);
  if (careerAnchorsList.length) {
    drawSectionTitle("Career anchors");
    const anchors = parseCareerAnchors(careerAnchorsList);

    // Render as compact cards with percentage + mini progress bar,
    // visually echoing the dashboard radial cards.
    const columns = 3;
    const gapX = 10;
    const cardWidth = (maxWidth - gapX * (columns - 1)) / columns;
    const cardHeight = 120;

    let col = 0;
    let rowTopY = cursorY;

    for (const anchor of anchors) {
      // Move to next row if needed
      if (col === 0) {
        ensureSpace(cardHeight + 20);
        rowTopY = cursorY;
      }

      const x = marginX + col * (cardWidth + gapX);
      const topY = rowTopY;
      const bottomY = topY - cardHeight;

      page.drawRectangle({
        x,
        y: bottomY,
        width: cardWidth,
        height: cardHeight,
        color: rgb(1, 1, 1),
        borderColor: rgb(0.9, 0.9, 0.95),
        borderWidth: 1,
      });

      // Percentage label
      const pctText = `${anchor.value}%`;
      page.drawText(pctText, {
        x: x + 12,
        y: topY - 32,
        size: 14,
        font: bold,
        color: rgb(0.235, 0.165, 0.415),
      });

      // Mini progress bar
      const barX = x + 12;
      const barY = topY - 50;
      const barWidth = cardWidth - 24;
      const barHeight = 6;
      page.drawRectangle({
        x: barX,
        y: barY,
        width: barWidth,
        height: barHeight,
        color: rgb(0.93, 0.93, 0.96),
      });
      page.drawRectangle({
        x: barX,
        y: barY,
        width: (barWidth * anchor.value) / 100,
        height: barHeight,
        color: rgb(0.235, 0.165, 0.415),
      });

      // Anchor name (wrapped)
      const nameLines = wrapText({
        text: anchor.name,
        font,
        size: 9,
        maxWidth: cardWidth - 24,
      });
      let textY = topY - 66;
      for (const line of nameLines) {
        page.drawText(line, {
          x: x + 12,
          y: textY,
          size: 9,
          font,
          color: rgb(0.2, 0.2, 0.28),
        });
        textY -= 11;
      }

      col += 1;
      if (col >= columns) {
        col = 0;
        cursorY = bottomY - 24;
      }
    }
    if (col !== 0) {
      cursorY = rowTopY - cardHeight - 24;
    }
    cursorY -= 8;
  }

  const skillGapsSafe = safeSkillGaps(normalized.skillGaps);
  if (skillGapsSafe.missingTechnical.length || skillGapsSafe.missingSoft.length) {
    drawSectionTitle("Skill gaps");
    const tech = skillGapsSafe.missingTechnical;
    const soft = skillGapsSafe.missingSoft;
    if (tech.length) {
      drawParagraph("Technical skills (with suggested resources):");
      cursorY -= 4;
      // Simpler, stable layout: one bullet per technical skill,
      // with the resource URL shown as plain text beside the skill
      // (avoids overlapping pills and keeps links visible).
      const techItems = tech.map((s) =>
        s.resourceUrl ? `${s.name} — ${s.resourceUrl}` : s.name
      );
      drawBullets(techItems);
      cursorY -= 6;
    }
    if (soft.length) {
      drawParagraph("Soft skills:");
      cursorY -= 4;
      // Soft skills as a straightforward bullet list.
      drawBullets(soft);
    }
  }

  const concreteActionsList = safeStringArray(normalized.concreteActions);
  if (concreteActionsList.length) {
    drawSectionTitle("Concrete actions");
    // Render as checklist-style items with small square boxes, echoing the
    // structured action plan in the reference PDF.
    for (const item of concreteActionsList) {
      const lines = wrapText({
        text: item,
        font,
        size: 10,
        maxWidth: maxWidth - 16,
      });

      const requiredHeight = 16 * lines.length + 14;
      ensureSpace(requiredHeight);

      // Checkbox
      page.drawRectangle({
        x: marginX,
        y: cursorY - 10,
        width: 9,
        height: 9,
        borderColor: rgb(0.235, 0.165, 0.415),
        borderWidth: 0.8,
        color: rgb(1, 1, 1),
      });

      let textY = cursorY;
      for (const line of lines) {
        page.drawText(line, {
          x: marginX + 14,
          y: textY,
          size: 10,
          font,
          color: rgb(0.15, 0.15, 0.18),
        });
        textY -= 14;
      }

      cursorY = textY - 12;
    }
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

