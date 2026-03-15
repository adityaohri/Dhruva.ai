import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";

/**
 * POST /api/onboard-extract-cv
 * Body: multipart/form-data with field "pdf" (file)
 * Returns: { text: string } or { error: string }
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("pdf") as File | Blob | null;
    if (!file || typeof (file as File).arrayBuffer !== "function") {
      return NextResponse.json(
        { error: "Please upload a valid PDF file." },
        { status: 400 }
      );
    }

    const arrayBuffer = await (file as Blob).arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return NextResponse.json(
        { error: "The uploaded file is empty." },
        { status: 400 }
      );
    }

    const data = new Uint8Array(arrayBuffer);
    const { text: extracted } = await extractText(data, { mergePages: true });
    const text = extracted?.trim() ?? "";

    if (!text) {
      return NextResponse.json(
        { error: "No text could be extracted from the PDF. Try a text-based PDF or paste your details." },
        { status: 400 }
      );
    }

    return NextResponse.json({ text });
  } catch (e) {
    console.error("[onboard-extract-cv]", e);
    return NextResponse.json(
      { error: "PDF could not be read. The file may be corrupted or not a valid PDF." },
      { status: 500 }
    );
  }
}
