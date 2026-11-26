import { auth } from "@clerk/nextjs/server";
import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";
import {
  formatExportJson,
  formatExportMarkdown,
  formatExportPdf,
  formatExportText,
  sanitizeExportFilename,
  type ExportConversationPayload,
} from "@/features/export/utils/formatters";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  await auth.protect();
  const user = await requireUser();
  const { id } = await context.params;

  const url = new URL(req.url);
  const format = (url.searchParams.get("format") || "md").toLowerCase();
  const branchIdParam = url.searchParams.get("branchId");
  const includeTimestamps = url.searchParams.get("includeTimestamps") !== "false";
  const includeAttachments = url.searchParams.get("includeAttachments") !== "false";
  const includeMetadata = url.searchParams.get("includeMetadata") !== "false";

  if (!["md", "pdf", "json", "txt"].includes(format)) {
    return new Response("Unsupported export format", { status: 400 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: user.id, deletedAt: null },
  });

  if (!conversation) {
    return new Response("Conversation not found", { status: 404 });
  }

  const targetBranchId = branchIdParam !== null ? (branchIdParam || null) : conversation.activeBranchId;

  const rows = await prisma.message.findMany({
    where: {
      conversationId: id,
      branchId: targetBranchId,
      supersededAt: null,
    },
    orderBy: { createdAt: "asc" },
  });

  const attachments = includeAttachments
    ? await prisma.attachment.findMany({
        where: {
          conversationId: id,
          ownerId: user.id,
          deletedAt: null,
          messageId: { in: rows.map((r) => r.id) },
        },
        select: {
          id: true,
          messageId: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          fileExtension: true,
        },
      })
    : [];

  const attByMsg = new Map<string, typeof attachments>();
  for (const att of attachments) {
    if (!att.messageId) continue;
    const list = attByMsg.get(att.messageId) ?? [];
    list.push(att);
    attByMsg.set(att.messageId, list);
  }

  const payload: ExportConversationPayload = {
    schemaVersion: "1.0",
    exportedAt: new Date().toISOString(),
    conversation: {
      id: conversation.id,
      title: conversation.title,
      model: conversation.model,
      createdAt: conversation.createdAt.toISOString(),
      branchId: targetBranchId || "main",
    },
    messages: rows.map((r) => ({
      id: r.id,
      role: r.role === "ASSISTANT" ? "assistant" : "user",
      content: r.content,
      createdAt: r.createdAt.toISOString(),
      branchId: r.branchId,
      versionNumber: r.versionNumber,
      attachments: attByMsg.get(r.id)?.map((a) => ({
        id: a.id,
        originalName: a.originalName,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        fileExtension: a.fileExtension,
      })),
    })),
  };

  const options = { includeTimestamps, includeAttachments, includeMetadata };

  if (format === "pdf") {
    const pdfBytes = await formatExportPdf(payload, options);
    return new Response(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${sanitizeExportFilename(conversation.title, "pdf")}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  if (format === "json") {
    const jsonText = formatExportJson(payload, options);
    return new Response(jsonText, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${sanitizeExportFilename(conversation.title, "json")}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  if (format === "txt") {
    const txt = formatExportText(payload, options);
    return new Response(txt, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${sanitizeExportFilename(conversation.title, "txt")}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const md = formatExportMarkdown(payload, options);
  return new Response(md, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${sanitizeExportFilename(conversation.title, "md")}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
