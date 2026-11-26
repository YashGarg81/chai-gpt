"use server";

import { isTextUIPart, type UIMessage } from "ai";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/features/auth/action/require-user";

/** Extracts plain text from an AI SDK `UIMessage` by joining all text parts. */
function getMessageText(message: UIMessage) {
  return message.parts.filter(isTextUIPart).map((part) => part.text).join("");
}

/**
 * Normalizes stored message parts from the database into AI SDK `UIMessage` parts.
 * Falls back to a single text part when no structured parts are stored.
 */
function toUIMessageParts(
  parts: Prisma.JsonValue | null,
  content: string
): UIMessage["parts"] {
  const stored = parts as UIMessage["parts"] | null;
  if (Array.isArray(stored) && stored.length > 0) {
    return stored;
  }

  return [{ type: "text", text: content }];
}

/**
 * Loads all messages for a conversation from the database as AI SDK `UIMessage`s.
 *
 * @param conversationId - The conversation whose messages to load.
 * @returns Messages ordered oldest to newest, ready for `useChat`.
 */
export async function loadChatMessages(
  conversationId: string
): Promise<UIMessage[]> {
  const user = await requireUser();
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId: user.id, deletedAt: null },
    select: { id: true, activeBranchId: true },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const rows = await prisma.message.findMany({
    where: {
      conversationId,
      branchId: conversation.activeBranchId,
      supersededAt: null,
    },
    orderBy: { createdAt: "asc" },
  });

  const attachments = await prisma.attachment.findMany({
    where: {
      conversationId,
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
  });

  const byMessageId = new Map<string, typeof attachments>();
  for (const att of attachments) {
    if (!att.messageId) continue;
    const list = byMessageId.get(att.messageId) ?? [];
    list.push(att);
    byMessageId.set(att.messageId, list);
  }

  return rows.map((row) => {
    const msgAttachments = byMessageId.get(row.id);
    return {
      id: row.id,
      role: row.role === "ASSISTANT" ? "assistant" : "user",
      parts: toUIMessageParts(row.parts, row.content),
      ...(msgAttachments && msgAttachments.length > 0
        ? {
            metadata: {
              attachments: msgAttachments.map((a) => ({
                id: a.id,
                originalName: a.originalName,
                mimeType: a.mimeType,
                sizeBytes: a.sizeBytes,
                fileExtension: a.fileExtension,
              })),
            },
          }
        : {}),
    };
  });
}

type SaveChatMessagesOptions = {
  updateTitle?: boolean;
};

/**
 * Upserts AI SDK `UIMessage`s into the database for a conversation.
 *
 * @param conversationId - Target conversation ID.
 * @param messages - Messages to persist (system messages are skipped).
 * @param options.updateTitle - When true, auto-titles "New Chat" from the first user message.
 */
export async function saveChatMessages(
  conversationId: string,
  messages: UIMessage[],
  options: SaveChatMessagesOptions = {}
) {
  const { updateTitle = true } = options;
  const user = await requireUser();

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId: user.id, deletedAt: null },
    select: { title: true, activeBranchId: true },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const firstUser = messages.find((message) => message.role === "user");
  const firstUserText = firstUser ? getMessageText(firstUser).trim() : "";

  await prisma.$transaction(async (tx) => {
    for (const message of messages) {
      if (message.role === "system") continue;

      const content = getMessageText(message);
      const role = message.role === "assistant" ? "ASSISTANT" : "USER";

      await tx.message.upsert({
        where: { id: message.id },
        create: {
          id: message.id,
          conversationId,
          branchId: conversation.activeBranchId,
          role,
          status: "COMPLETE",
          content,
          parts: message.parts as Prisma.InputJsonValue,
        },
        update: {
          content,
          parts: message.parts as Prisma.InputJsonValue,
          status: "COMPLETE",
        },
      });
    }

    await tx.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        title:
          updateTitle && conversation.title === "New Chat" && firstUserText
            ? firstUserText.slice(0, 48)
            : conversation.title,
      },
    });
  });
}
