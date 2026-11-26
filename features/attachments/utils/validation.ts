import path from "node:path";

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_FILES_PER_MESSAGE = 5;
export const MAX_COMBINED_BYTES_PER_MESSAGE = 50 * 1024 * 1024; // 50 MB

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export const EXTENSION_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  csv: "text/csv",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export function isImageMime(mimeType: string): boolean {
  return mimeType === "image/png" || mimeType === "image/jpeg" || mimeType === "image/webp";
}

/** Sanitizes an uploaded filename, rejecting null bytes and path traversal. */
export function sanitizeOriginalFilename(rawName: string): string {
  if (!rawName || rawName.includes("\0")) {
    throw new Error("Invalid filename");
  }
  const base = path.basename(rawName).trim();
  const cleaned = base.replace(/[\x00-\x1F<>:"/\\|?*]/g, "_");
  if (!cleaned || cleaned === "." || cleaned === "..") {
    throw new Error("Invalid filename");
  }
  return cleaned.slice(0, 180);
}

/** Validates file magic bytes against the expected MIME type. */
export function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length === 0) return false;

  switch (mimeType) {
    case "application/pdf":
      return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
    case "image/png":
      return (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    case "image/jpeg":
      return (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      );
    case "image/webp":
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP"
      );
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
    case "text/plain":
    case "text/csv": {
      // Reject binary / null-byte payloads masquerading as text
      const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
      return !sample.includes(0x00);
    }
    default:
      return false;
  }
}

/** Validates extension, size, and magic-byte signature for an uploaded file. */
export function validateUploadedFile(
  rawName: string,
  buffer: Buffer
): { safeName: string; ext: string; mimeType: string } {
  const safeName = sanitizeOriginalFilename(rawName);
  const ext = path.extname(safeName).slice(1).toLowerCase();

  if (ext === "doc") {
    throw new Error("Legacy .doc format is unsupported. Please convert to .docx or .pdf.");
  }

  const mimeType = EXTENSION_TO_MIME[ext];
  if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`Unsupported file type: .${ext || "unknown"}`);
  }

  if (buffer.length === 0) {
    throw new Error("Empty files are not allowed");
  }
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error("File exceeds 20 MB limit");
  }

  if (!validateMagicBytes(buffer, mimeType)) {
    throw new Error("File content does not match its extension");
  }

  return { safeName, ext, mimeType };
}
