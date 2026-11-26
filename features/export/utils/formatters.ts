import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";

export interface ExportAttachmentMeta {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  fileExtension: string;
}

export interface ExportMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  branchId?: string | null;
  versionNumber?: number;
  attachments?: ExportAttachmentMeta[];
}

export interface ExportConversationPayload {
  schemaVersion: "1.0";
  exportedAt: string;
  conversation: {
    id: string;
    title: string;
    model?: string | null;
    createdAt: string;
    branchId: string;
  };
  messages: ExportMessageItem[];
}

export interface ExportOptions {
  includeTimestamps: boolean;
  includeAttachments: boolean;
  includeMetadata: boolean;
}

export function sanitizeExportFilename(title: string, ext: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${base || "chaigpt-conversation"}.${ext}`;
}

export function formatExportMarkdown(
  payload: ExportConversationPayload,
  options: ExportOptions
): string {
  const lines: string[] = [`# ${payload.conversation.title}`, ""];
  if (options.includeMetadata) {
    lines.push(`- **Exported:** ${payload.exportedAt}`);
    lines.push(`- **Branch:** ${payload.conversation.branchId}`);
    if (payload.conversation.model) {
      lines.push(`- **Model:** ${payload.conversation.model}`);
    }
    lines.push("");
  }
  lines.push("---", "");

  for (const msg of payload.messages) {
    const speaker = msg.role === "user" ? "User" : "Assistant";
    const ts = options.includeTimestamps ? ` *(${msg.createdAt})*` : "";
    lines.push(`### ${speaker}${ts}`, "", msg.content, "");
    if (options.includeAttachments && msg.attachments && msg.attachments.length > 0) {
      lines.push(
        `**Attachments:** ${msg.attachments.map((a) => `\`${a.originalName}\` (${a.mimeType}, ${a.sizeBytes} B)`).join(", ")}`,
        ""
      );
    }
    lines.push("---", "");
  }

  return lines.join("\n");
}

export function formatExportText(
  payload: ExportConversationPayload,
  options: ExportOptions
): string {
  const lines: string[] = [payload.conversation.title, "=".repeat(Math.min(60, payload.conversation.title.length || 10)), ""];
  if (options.includeMetadata) {
    lines.push(`Exported: ${payload.exportedAt}`);
    lines.push(`Branch: ${payload.conversation.branchId}`);
    lines.push("");
  }

  for (const msg of payload.messages) {
    const speaker = msg.role === "user" ? "USER" : "ASSISTANT";
    const ts = options.includeTimestamps ? ` [${msg.createdAt}]` : "";
    lines.push(`${speaker}${ts}:`, msg.content, "");
    if (options.includeAttachments && msg.attachments && msg.attachments.length > 0) {
      lines.push(`Attachments: ${msg.attachments.map((a) => a.originalName).join(", ")}`, "");
    }
    lines.push("-".repeat(40), "");
  }

  return lines.join("\n");
}

export function formatExportJson(
  payload: ExportConversationPayload,
  options: ExportOptions
): string {
  const sanitized: ExportConversationPayload = {
    schemaVersion: payload.schemaVersion,
    exportedAt: payload.exportedAt,
    conversation: options.includeMetadata
      ? payload.conversation
      : {
          id: payload.conversation.id,
          title: payload.conversation.title,
          createdAt: payload.conversation.createdAt,
          branchId: payload.conversation.branchId,
        },
    messages: payload.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: options.includeTimestamps ? m.createdAt : "",
      ...(options.includeMetadata && m.versionNumber ? { versionNumber: m.versionNumber } : {}),
      ...(options.includeAttachments && m.attachments ? { attachments: m.attachments } : {}),
    })),
  };

  return JSON.stringify(sanitized, null, 2);
}

/**
 * Generates a multi-page Unicode-capable PDF using PDFKit with embedded
 * NotoSansDevanagari-Regular.ttf for English, Hindi (Devanagari), and Unicode punctuation.
 */
export async function formatExportPdf(
  payload: ExportConversationPayload,
  options: ExportOptions
): Promise<Uint8Array> {
  const fontPath = path.join(
    process.cwd(),
    "features",
    "export",
    "fonts",
    "NotoSansDevanagari-Regular.ttf"
  );

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 50, bottom: 55, left: 50, right: 50 },
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    doc.on("error", reject);

    const hasDevanagariFont = fs.existsSync(fontPath);
    const renderMixedText = (
      text: string,
      opts: { fontSize: number; color: string; lineGap?: number }
    ) => {
      doc.fontSize(opts.fontSize).fillColor(opts.color);
      if (!hasDevanagariFont || !/[\u0900-\u097F]/.test(text)) {
        doc.font("Helvetica").text(text, { lineGap: opts.lineGap });
        return;
      }
      const segments = text.split(/([\u0900-\u097F\u200C\u200D]+)/g).filter(Boolean);
      segments.forEach((seg, idx) => {
        const isDev = /[\u0900-\u097F]/.test(seg);
        doc.font(isDev ? fontPath : "Helvetica").text(seg, {
          continued: idx < segments.length - 1,
          lineGap: opts.lineGap,
        });
      });
    };

    renderMixedText(payload.conversation.title, { fontSize: 16, color: "#111111" });
    if (options.includeMetadata) {
      renderMixedText(
        `Exported: ${payload.exportedAt} | Branch: ${payload.conversation.branchId}`,
        { fontSize: 9, color: "#555555" }
      );
    }
    doc.moveDown(1);

    for (const msg of payload.messages) {
      const speaker = msg.role === "user" ? "User" : "Assistant";
      const ts = options.includeTimestamps ? ` (${msg.createdAt})` : "";

      renderMixedText(`${speaker}${ts}:`, { fontSize: 10, color: "#111111" });
      renderMixedText(msg.content, { fontSize: 10, color: "#222222", lineGap: 2 });

      if (options.includeAttachments && msg.attachments && msg.attachments.length > 0) {
        renderMixedText(
          `Attachments: ${msg.attachments.map((a) => a.originalName).join(", ")}`,
          { fontSize: 9, color: "#444444" }
        );
      }
      doc.moveDown(0.75);
    }

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#666666")
        .text(
          `ChaiGPT Export - Page ${i + 1} of ${range.count}`,
          50,
          doc.page.height - 35,
          { align: "left", lineBreak: false }
        );
    }

    doc.end();
  });
}
