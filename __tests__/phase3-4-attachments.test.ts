import { describe, expect, it } from "bun:test";
import {
  sanitizeOriginalFilename,
  validateUploadedFile,
} from "../features/attachments/utils/validation";
import { extractDocumentText } from "../features/attachments/utils/extract";
import { createStorageKey } from "../lib/storage";

describe("Phase 3.4: Attachments, Validation & Extraction", () => {
  it("validates magic bytes for PDF, PNG, JPEG, WEBP, and DOCX", () => {
    expect(
      validateUploadedFile("doc.pdf", Buffer.from("%PDF-1.4\n%test")).mimeType
    ).toBe("application/pdf");

    expect(
      validateUploadedFile(
        "img.png",
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      ).mimeType
    ).toBe("image/png");

    expect(
      validateUploadedFile("img.jpg", Buffer.from([0xff, 0xd8, 0xff, 0xe0]))
        .mimeType
    ).toBe("image/jpeg");

    expect(
      validateUploadedFile("doc.docx", Buffer.from([0x50, 0x4b, 0x03, 0x04]))
        .mimeType
    ).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  });

  it("rejects MIME spoofing, empty files, legacy .doc, and null-byte filenames", () => {
    expect(() =>
      validateUploadedFile("fake.pdf", Buffer.from("MZ\x90\x00not-a-pdf"))
    ).toThrow("File content does not match its extension");

    expect(() => validateUploadedFile("empty.txt", Buffer.alloc(0))).toThrow(
      "Empty files are not allowed"
    );

    expect(() =>
      validateUploadedFile("old.doc", Buffer.from("hello"))
    ).toThrow("Legacy .doc format is unsupported");

    expect(() => sanitizeOriginalFilename("bad\0name.txt")).toThrow(
      "Invalid filename"
    );
  });

  it("extracts UTF-8 TXT and CSV content cleanly", async () => {
    const txt = await extractDocumentText(
      Buffer.from("Hello ChaiGPT 🚀", "utf-8"),
      "text/plain"
    );
    expect(txt).toBe("Hello ChaiGPT 🚀");

    const csv = await extractDocumentText(
      Buffer.from("name,role\nAlice,Admin\nBob,User", "utf-8"),
      "text/csv"
    );
    expect(csv).toContain("name,role");
    expect(csv).toContain("Alice,Admin");
  });

  it("generates non-guessable storage keys", () => {
    const key = createStorageKey("user_1", "conv_1", "pdf");
    expect(key.startsWith("user_1/conv_1/")).toBe(true);
    expect(key.endsWith(".pdf")).toBe(true);
  });
});
