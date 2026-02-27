import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import path from "path";
import fs from "fs/promises";

type GapAnalysis = {
  overallSummary?: string;
  trajectoryFit?: string;
  careerAnchors?: string[];
  skillGaps?: {
    missingTechnical?: { name: string; resourceUrl?: string }[];
    missingSoft?: string[];
  };
  concreteActions?: string[];
};

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
      gapAnalysis?: GapAnalysis;
      targetRole?: string;
      targetCompany?: string;
      targetIndustry?: string;
    };

  if (!gapAnalysis) {
    return NextResponse.json(
      { error: "gapAnalysis is required" },
      { status: 400 }
    );
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let cursorY = height - 60;

  try {
    const logoPath = path.join(process.cwd(), "public", "dhruva-logo.png");
    const logoBytes = await fs.readFile(logoPath);
    const logoImage = await pdfDoc.embedPng(logoBytes);
    const scale = 80 / logoImage.height;
    const logoWidth = logoImage.width * scale;
    const logoHeight = logoImage.height * scale;
    page.drawImage(logoImage, {
      x: 40,
      y: cursorY - logoHeight,
      width: logoWidth,
      height: logoHeight,
    });
  } catch {
    // If logo load fails, continue without crashing
  }

  page.drawText("Profile Benchmarking Report", {
    x: 40,
    y: cursorY - 40,
    size: 18,
    font: bold,
    color: rgb(0.235, 0.165, 0.415),
  });
  cursorY -= 80;

  const marginX = 40;
  const maxWidth = width - marginX * 2;

  const ensureSpace = (needed: number) => {
    if (cursorY - needed < 60) {
      const newPage = pdfDoc.addPage([595.28, 841.89]);
      cursorY = newPage.getSize().height - 60;
      return newPage;
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
  drawParagraph(gapAnalysis.overallSummary);

  drawSectionTitle("Trajectory fit");
  drawParagraph(gapAnalysis.trajectoryFit);

  if (gapAnalysis.careerAnchors && gapAnalysis.careerAnchors.length) {
    drawSectionTitle("Career anchors");
    drawBullets(gapAnalysis.careerAnchors);
  }

  if (gapAnalysis.skillGaps) {
    const tech = gapAnalysis.skillGaps.missingTechnical || [];
    const soft = gapAnalysis.skillGaps.missingSoft || [];
    if (tech.length || soft.length) {
      drawSectionTitle("Skill gaps");

      if (tech.length) {
        drawParagraph("Technical skills (with suggested resources):");
        const techLines = tech.map((s) =>
          s.resourceUrl ? `${s.name} — ${s.resourceUrl}` : s.name
        );
        drawBullets(techLines);
      }

      if (soft.length) {
        drawParagraph("Soft skills:");
        drawBullets(soft);
      }
    }
  }

  if (gapAnalysis.concreteActions && gapAnalysis.concreteActions.length) {
    drawSectionTitle("Concrete actions");
    drawBullets(gapAnalysis.concreteActions);
  }

  const pdfBytes = await pdfDoc.save();
  const pdfArrayBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength
  );

  return new NextResponse(pdfArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        'attachment; filename="profile-benchmarking-report.pdf"',
    },
  });
}

