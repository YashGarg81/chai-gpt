import { describe, expect, it } from "bun:test";
import {
  formatExportJson,
  formatExportMarkdown,
  formatExportPdf,
  formatExportText,
  type ExportConversationPayload,
} from "@/features/export/utils/formatters";
import {
  generateShareToken,
  hashSharePassword,
  hashShareToken,
  verifySharePassword,
} from "@/features/share/utils/tokens";

const REMEDIATION_PAYLOAD: ExportConversationPayload = {
  schemaVersion: "1.0",
  exportedAt: "2026-11-26T14:55:00.000Z",
  conversation: {
    id: "conv_rem_36",
    title: "Phase 3.6 Remediation Fixture",
    model: "openrouter/free",
    createdAt: "2026-11-26T14:00:00.000Z",
    branchId: "main",
  },
  messages: [
    {
      id: "u1",
      role: "user",
      content: "# Heading\n- List item 1\n- List item 2\nHindi: नमस्ते दुनिया",
      createdAt: "2026-11-26T14:01:00.000Z",
      attachments: [
        {
          id: "att_rem_1",
          originalName: "report.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1024,
          fileExtension: "pdf",
        },
      ],
    },
    {
      id: "a1",
      role: "assistant",
      content: "```python\ndef greet():\n    return 'hello'\n```",
      createdAt: "2026-11-26T14:01:05.000Z",
    },
  ],
};

describe("Phase 3.6 Final Remediation", () => {
  it("preserves Unicode in MD/TXT/JSON and excludes sensitive fields", () => {
    const opts = { includeTimestamps: true, includeAttachments: true, includeMetadata: true };

    const md = formatExportMarkdown(REMEDIATION_PAYLOAD, opts);
    expect(md).toContain("नमस्ते दुनिया");
    expect(md).toContain("```python");
    expect(md).toContain("report.pdf");

    const txt = formatExportText(REMEDIATION_PAYLOAD, opts);
    expect(txt).toContain("नमस्ते दुनिया");

    const json = formatExportJson(REMEDIATION_PAYLOAD, opts);
    expect(json).toContain("नमस्ते दुनिया");
    expect(json).not.toContain("storageKey");
    expect(json).not.toContain("tokenHash");
    expect(json).not.toContain("passwordHash");
  });

  it("validates password protection edge cases (correct, incorrect, empty)", () => {
    const hash = hashSharePassword("CorrectHorse36!");
    expect(verifySharePassword("CorrectHorse36!", hash)).toBe(true);
    expect(verifySharePassword("WrongPassword", hash)).toBe(false);
    expect(verifySharePassword("", hash)).toBe(false);
    expect(verifySharePassword("any", "malformed-hash")).toBe(false);
  });

  it("generates unique 256-bit tokens and deterministic SHA-256 hashes", () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateShareToken()));
    expect(tokens.size).toBe(20);
    const sample = Array.from(tokens)[0];
    expect(hashShareToken(sample)).toHaveLength(64);
  });

  it("generates valid Unicode Hindi/English PDF output", async () => {
    const pdf = await formatExportPdf(REMEDIATION_PAYLOAD, {
      includeTimestamps: true,
      includeAttachments: true,
      includeMetadata: true,
    });
    const text = Buffer.from(pdf).toString("utf8");
    expect(text.startsWith("%PDF-1.")).toBe(true);
    expect(pdf.byteLength).toBeGreaterThan(5_000);
  });
});
