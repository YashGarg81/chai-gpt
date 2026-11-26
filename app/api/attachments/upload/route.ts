import crypto from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { requireUser } from "@/features/auth/action/require-user";
import { extractDocumentText } from "@/features/attachments/utils/extract";
import {
  isImageMime,
  validateUploadedFile,
} from "@/features/attachments/utils/validation";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { createStorageKey, storage } from "@/lib/storage";

export async function POST(req: Request) {
  await auth.protect();
  const user = await requireUser();

  const rate = await checkRateLimit(`upload:${user.id}`, 30, 60_000);
  if (rate.unavailable) {
    return Response.json(
      { error: "Rate limit service unavailable" },
      { status: 503 }
    );
  }
  if (!rate.allowed) {
    return Response.json(
      { error: "Too many uploads. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const conversationId = formData.get("conversationId");
  const file = formData.get("file");

  if (typeof conversationId !== "string" || !conversationId.trim()) {
    return Response.json({ error: "Missing conversationId" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId: user.id, deletedAt: null },
    select: { id: true },
  });
  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let validated: { safeName: string; ext: string; mimeType: string };
  try {
    validated = validateUploadedFile(file.name, buffer);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Invalid file" },
      { status: 400 }
    );
  }

  const storageKey = createStorageKey(user.id, conversation.id, validated.ext);
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

  try {
    await storage.putObject(storageKey, buffer);
  } catch {
    return Response.json(
      { error: "Failed to store file" },
      { status: 500 }
    );
  }

  let extractedText: string | null = null;
  let processingStatus: "READY" | "FAILED" = "READY";
  let extractionError: string | undefined;

  if (!isImageMime(validated.mimeType)) {
    try {
      extractedText = await extractDocumentText(buffer, validated.mimeType);
    } catch (err) {
      processingStatus = "FAILED";
      extractionError =
        err instanceof Error ? err.message : "Document extraction failed";
    }
  }

  const attachment = await prisma.attachment.create({
    data: {
      ownerId: user.id,
      conversationId: conversation.id,
      originalName: validated.safeName,
      storageKey,
      mimeType: validated.mimeType,
      sizeBytes: buffer.length,
      fileExtension: validated.ext,
      checksum,
      processingStatus,
      extractedText,
      ...(extractionError ? { metadata: { extractionError } } : {}),
    },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      fileExtension: true,
      processingStatus: true,
    },
  });

  if (processingStatus === "FAILED") {
    return Response.json(
      { ...attachment, error: extractionError },
      { status: 422 }
    );
  }

  return Response.json(attachment, { status: 201 });
}
