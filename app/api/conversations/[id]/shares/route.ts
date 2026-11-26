import { auth } from "@clerk/nextjs/server";
import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  generateShareToken,
  hashSharePassword,
  hashShareToken,
} from "@/features/share/utils/tokens";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  await auth.protect();
  const user = await requireUser();
  const { id } = await context.params;

  const shares = await prisma.conversationShare.findMany({
    where: { conversationId: id, userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      branchId: true,
      includeTimestamps: true,
      includeAttachments: true,
      showTitle: true,
      passwordHash: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });

  return Response.json({
    shares: shares.map((s) => ({
      id: s.id,
      title: s.title,
      branchId: s.branchId,
      includeTimestamps: s.includeTimestamps,
      includeAttachments: s.includeAttachments,
      showTitle: s.showTitle,
      hasPassword: Boolean(s.passwordHash),
      expiresAt: s.expiresAt?.toISOString() ?? null,
      revokedAt: s.revokedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request, context: RouteContext) {
  await auth.protect();
  const user = await requireUser();
  const { id } = await context.params;

  const rate = await checkRateLimit(`share:create:${user.id}`, 20, 60_000);
  if (!rate.allowed) {
    return Response.json(
      { error: "Too many share requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    branchId,
    includeTimestamps = true,
    includeAttachments = true,
    showTitle = true,
    expiresInHours,
    password,
  } = (body ?? {}) as {
    branchId?: string | null;
    includeTimestamps?: boolean;
    includeAttachments?: boolean;
    showTitle?: boolean;
    expiresInHours?: number | null;
    password?: string | null;
  };

  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: user.id, deletedAt: null },
  });

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  const targetBranchId =
    branchId !== undefined ? branchId : conversation.activeBranchId;

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

  const snapshotJson = {
    title: showTitle ? conversation.title : "Shared Conversation",
    branchId: targetBranchId || "main",
    messages: rows.map((r) => ({
      id: r.id,
      role: r.role === "ASSISTANT" ? "assistant" : "user",
      content: r.content,
      ...(includeTimestamps ? { createdAt: r.createdAt.toISOString() } : {}),
      ...(includeAttachments && attByMsg.has(r.id)
        ? {
            attachments: attByMsg.get(r.id)!.map((a) => ({
              originalName: a.originalName,
              mimeType: a.mimeType,
              sizeBytes: a.sizeBytes,
            })),
          }
        : {}),
    })),
  };

  const rawToken = generateShareToken();
  const tokenHash = hashShareToken(rawToken);
  const expiresAt =
    typeof expiresInHours === "number" && expiresInHours > 0
      ? new Date(Date.now() + expiresInHours * 3600_000)
      : null;
  const passwordHash =
    typeof password === "string" && password.trim().length > 0
      ? hashSharePassword(password.trim())
      : null;

  const created = await prisma.conversationShare.create({
    data: {
      conversationId: id,
      userId: user.id,
      branchId: targetBranchId || "main",
      tokenHash,
      title: conversation.title,
      snapshotJson,
      includeTimestamps: Boolean(includeTimestamps),
      includeAttachments: Boolean(includeAttachments),
      showTitle: Boolean(showTitle),
      passwordHash,
      expiresAt,
    },
  });

  return Response.json(
    {
      id: created.id,
      token: rawToken,
      shareUrl: `/share/${rawToken}`,
      expiresAt: created.expiresAt?.toISOString() ?? null,
      hasPassword: Boolean(created.passwordHash),
    },
    { status: 201 }
  );
}
