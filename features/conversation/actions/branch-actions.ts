"use server";

import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

const MAX_EDIT_CHARS = 16_000;

export type BranchItem = {
  id: string;
  name: string;
  parentBranchId: string | null;
  forkMessageId: string | null;
  createdAt: Date;
};

/** Lists all branches for a conversation owned by the current user. */
export async function listConversationBranches(conversationId: string): Promise<{
  activeBranchId: string | null;
  branches: BranchItem[];
}> {
  const user = await requireUser();
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId: user.id, deletedAt: null },
    select: { id: true, activeBranchId: true },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const branches = await prisma.conversationBranch.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      parentBranchId: true,
      forkMessageId: true,
      createdAt: true,
    },
  });

  return { activeBranchId: conversation.activeBranchId, branches };
}

/**
 * Edits a user message by creating a new conversation branch, preserving the
 * original branch and all historical messages.
 */
export async function editMessageAndBranch(
  conversationId: string,
  messageId: string,
  newContent: string
) {
  const user = await requireUser();
  const trimmed = newContent.trim();

  if (!trimmed) {
    throw new Error("Message cannot be empty");
  }
  if (trimmed.length > MAX_EDIT_CHARS) {
    throw new Error(`Message exceeds ${MAX_EDIT_CHARS} character limit`);
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId: user.id, deletedAt: null },
    select: { id: true, activeBranchId: true },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const activeMessages = await prisma.message.findMany({
    where: {
      conversationId,
      branchId: conversation.activeBranchId,
      supersededAt: null,
    },
    orderBy: { createdAt: "asc" },
  });

  const targetIndex = activeMessages.findIndex((m) => m.id === messageId);
  if (targetIndex === -1) {
    throw new Error("Message not found");
  }

  const target = activeMessages[targetIndex];
  if (target.role !== "USER") {
    throw new Error("Only user messages can be edited");
  }

  const ancestors = activeMessages.slice(0, targetIndex);
  const existingBranchCount = await prisma.conversationBranch.count({
    where: { conversationId },
  });

  const result = await prisma.$transaction(async (tx) => {
    const branch = await tx.conversationBranch.create({
      data: {
        conversationId,
        name: `Branch ${existingBranchCount + 1}`,
        parentBranchId: conversation.activeBranchId,
        forkMessageId: messageId,
      },
    });

    for (const ancestor of ancestors) {
      await tx.message.create({
        data: {
          conversationId,
          branchId: branch.id,
          parentMessageId: ancestor.id,
          versionNumber: ancestor.versionNumber,
          role: ancestor.role,
          status: ancestor.status,
          content: ancestor.content,
          parts: ancestor.parts ?? undefined,
          createdAt: ancestor.createdAt,
        },
      });
    }

    const editedMessage = await tx.message.create({
      data: {
        conversationId,
        branchId: branch.id,
        parentMessageId: target.id,
        versionNumber: target.versionNumber + 1,
        role: "USER",
        status: "COMPLETE",
        content: trimmed,
        parts: [{ type: "text", text: trimmed }],
      },
    });

    await tx.conversation.update({
      where: { id: conversationId },
      data: {
        activeBranchId: branch.id,
        lastMessageAt: new Date(),
      },
    });

    return { branchId: branch.id, editedMessage };
  });

  revalidatePath(`/c/${conversationId}`);
  return result;
}

/** Switches the active branch for a conversation owned by the current user. */
export async function switchConversationBranch(
  conversationId: string,
  branchId: string | null
) {
  const user = await requireUser();
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId: user.id, deletedAt: null },
    select: { id: true },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  if (branchId !== null) {
    const branch = await prisma.conversationBranch.findFirst({
      where: { id: branchId, conversationId },
      select: { id: true },
    });
    if (!branch) {
      throw new Error("Branch not found");
    }
  }

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { activeBranchId: branchId },
  });

  revalidatePath(`/c/${conversationId}`);
  return { branchId };
}

export type MessageVersionItem = {
  id: string;
  content: string;
  versionNumber: number;
  role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL";
  branchId: string | null;
  supersededAt: Date | null;
  createdAt: Date;
  isCurrent: boolean;
};

/**
 * Lists all historical versions related to a message (same parentMessageId chain
 * or superseded assistant responses in the same branch), scoped to the owning user.
 */
export async function listMessageVersions(
  conversationId: string,
  messageId: string
): Promise<MessageVersionItem[]> {
  const user = await requireUser();
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId: user.id, deletedAt: null },
    select: { id: true, activeBranchId: true },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const target = await prisma.message.findFirst({
    where: { id: messageId, conversationId },
  });

  if (!target) {
    throw new Error("Message not found");
  }

  const rootId = target.parentMessageId ?? target.id;
  const versions = await prisma.message.findMany({
    where: {
      conversationId,
      OR: [
        { id: rootId },
        { parentMessageId: rootId },
        ...(target.role === "ASSISTANT"
          ? [{ branchId: target.branchId, role: "ASSISTANT" as const }]
          : []),
      ],
    },
    orderBy: [{ versionNumber: "asc" }, { createdAt: "asc" }],
  });

  return versions.map((v) => ({
    id: v.id,
    content: v.content,
    versionNumber: v.versionNumber,
    role: v.role,
    branchId: v.branchId,
    supersededAt: v.supersededAt,
    createdAt: v.createdAt,
    isCurrent:
      v.supersededAt === null && v.branchId === conversation.activeBranchId,
  }));
}

/**
 * Non-destructively restores an earlier message version.
 * - For USER messages: creates a new branch with the restored content.
 * - For ASSISTANT messages: marks current active assistant message superseded
 *   and restores the selected version on the active branch.
 */
export async function restoreMessageVersion(
  conversationId: string,
  versionMessageId: string
) {
  const user = await requireUser();
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId: user.id, deletedAt: null },
    select: { id: true, activeBranchId: true },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const versionMsg = await prisma.message.findFirst({
    where: { id: versionMessageId, conversationId },
  });

  if (!versionMsg) {
    throw new Error("Version not found");
  }

  if (versionMsg.role === "USER") {
    const activeUserMsg = await prisma.message.findFirst({
      where: {
        conversationId,
        branchId: conversation.activeBranchId,
        role: "USER",
        supersededAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
    const targetId = activeUserMsg?.id ?? versionMsg.id;
    return editMessageAndBranch(conversationId, targetId, versionMsg.content);
  }

  await prisma.$transaction(async (tx) => {
    await tx.message.updateMany({
      where: {
        conversationId,
        branchId: conversation.activeBranchId,
        role: "ASSISTANT",
        supersededAt: null,
      },
      data: { supersededAt: new Date() },
    });

    await tx.message.create({
      data: {
        conversationId,
        branchId: conversation.activeBranchId,
        parentMessageId: versionMsg.parentMessageId ?? versionMsg.id,
        versionNumber: versionMsg.versionNumber + 1,
        role: "ASSISTANT",
        status: "COMPLETE",
        content: versionMsg.content,
        parts: versionMsg.parts ?? [{ type: "text", text: versionMsg.content }],
      },
    });
  });

  revalidatePath(`/c/${conversationId}`);
  return { restored: true };
}
