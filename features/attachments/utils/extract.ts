import mammoth from "mammoth";

const MAX_EXTRACTED_CHARS = 40_000;
const MAX_CSV_ROWS = 500;

/** Extracts bounded UTF-8 text from TXT, CSV, DOCX, or PDF buffers. */
export async function extractDocumentText(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === "text/plain") {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer).trim();
    return text.slice(0, MAX_EXTRACTED_CHARS);
  }

  if (mimeType === "text/csv") {
    const raw = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const bounded = lines.slice(0, MAX_CSV_ROWS).join("\n");
    return bounded.slice(0, MAX_EXTRACTED_CHARS);
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim().slice(0, MAX_EXTRACTED_CHARS);
  }

  if (mimeType === "application/pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const parsed = await parser.getText();
      const rawText = (parsed.text ?? "").trim();
      const withoutPageMarkers = rawText
        .replace(/--\s*\d+\s+of\s+\d+\s*--/g, "")
        .trim();
      if (withoutPageMarkers.length < 20) {
        // Scanned/image-only PDF: return empty so /api/chat sends the PDF natively to Gemini
        return "";
      }
      return rawText.slice(0, MAX_EXTRACTED_CHARS);
    } finally {
      await parser.destroy().catch(() => {});
    }
  }

  return "";
}
