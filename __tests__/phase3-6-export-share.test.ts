import { describe, expect, it } from "bun:test";
import {
  formatExportJson,
  formatExportMarkdown,
  formatExportPdf,
  formatExportText,
  sanitizeExportFilename,
  type ExportConversationPayload,
} from "@/features/export/utils/formatters";
import {
  generateShareToken,
  hashSharePassword,
  hashShareToken,
  verifySharePassword,
} from "@/features/share/utils/tokens";

const SAMPLE_PAYLOAD: ExportConversationPayload = {
  schemaVersion: "1.0",
  exportedAt: "2026-11-26T14:00:00.000Z",
  conversation: {
    id: "conv_123",
    title: "Phase 3.6 Export & Share Test",
    model: "openrouter/free",
    createdAt: "2026-11-26T13:00:00.000Z",
    branchId: "main",
  },
  messages: [
    {
      id: "m1",
      role: "user",
      content: "Show me a TypeScript snippet and Hindi: नमस्ते",
      createdAt: "2026-11-26T13:01:00.000Z",
      attachments: [
        {
          id: "att_1",
          originalName: "spec.txt",
          mimeType: "text/plain",
          sizeBytes: 42,
          fileExtension: "txt",
        },
      ],
    },
    {
      id: "m2",
      role: "assistant",
      content: "```ts\nconst x: number = 42;\n```",
      createdAt: "2026-11-26T13:01:05.000Z",
    },
  ],
};

describe("Phase 3.6: Conversation Export & Secure Sharing", () => {
  it("formats Markdown, Text, JSON, and PDF exports cleanly", async () => {
    const opts = { includeTimestamps: true, includeAttachments: true, includeMetadata: true };

    const md = formatExportMarkdown(SAMPLE_PAYLOAD, opts);
    expect(md).toContain("# Phase 3.6 Export & Share Test");
    expect(md).toContain("```ts");
    expect(md).toContain("spec.txt");

    const txt = formatExportText(SAMPLE_PAYLOAD, opts);
    expect(txt).toContain("USER [2026-11-26T13:01:00.000Z]:");
    expect(txt).toContain("ASSISTANT");

    const json = JSON.parse(formatExportJson(SAMPLE_PAYLOAD, opts));
    expect(json.schemaVersion).toBe("1.0");
    expect(json.messages.length).toBe(2);
    expect(json.messages[0].attachments[0].originalName).toBe("spec.txt");

    const pdf = await formatExportPdf(SAMPLE_PAYLOAD, opts);
    const pdfHeader = Buffer.from(pdf).toString("utf8", 0, 7);
    expect(pdfHeader).toBe("%PDF-1.");

    expect(sanitizeExportFilename("Hello World! / Test", "md")).toBe("hello-world-test.md");
  });

  it("generates cryptographic share tokens and verifies scrypt passwords", () => {
    const t1 = generateShareToken();
    const t2 = generateShareToken();
    expect(t1.length).toBeGreaterThanOrEqual(32);
    expect(t1).not.toBe(t2);
    expect(hashShareToken(t1)).toBe(hashShareToken(t1));
    expect(hashShareToken(t1)).not.toBe(t1);

    const pwHash = hashSharePassword("secret-pass-36");
    expect(verifySharePassword("secret-pass-36", pwHash)).toBe(true);
    expect(verifySharePassword("wrong-pass", pwHash)).toBe(false);
  });

  it("handles multi-page PDF pagination and large conversations without leaking storageKey", async () => {
    const largeMessages = Array.from({ length: 60 }, (_, i) => ({
      id: `msg_${i}`,
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `Turn ${i}: Testing multi-page PDF pagination and large export handling.`,
      createdAt: "2026-11-26T13:01:00.000Z",
    }));

    const pdf = await formatExportPdf(
      { ...SAMPLE_PAYLOAD, messages: largeMessages },
      { includeTimestamps: true, includeAttachments: true, includeMetadata: true }
    );
    const pdfText = Buffer.from(pdf).toString("utf8");
    expect(pdfText.startsWith("%PDF-1.")).toBe(true);

    const jsonStr = formatExportJson(SAMPLE_PAYLOAD, {
      includeTimestamps: true,
      includeAttachments: true,
      includeMetadata: true,
    });
    expect(jsonStr).not.toContain("storageKey");
    expect(jsonStr).not.toContain("tokenHash");
    expect(jsonStr).not.toContain("passwordHash");
  });
});
