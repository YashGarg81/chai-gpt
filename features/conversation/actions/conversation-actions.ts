"use server";

import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

const MAX_TITLE_LENGTH = 100;
const MAX_PINNED_CONVERSATIONS = 20;
const MAX_FOLDER_NAME_LENGTH = 50;

/** Shape of a conversation row returned in the sidebar list. */
export type ConversationListItem = {
  id: string;
  title: string;
  isPinned: boolean;
  pinnedAt: Date | null;
  isArchived: boolean;
  archivedAt: Date | null;
  deletedAt: Date | null;
  folderId: string | null;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type FolderItem = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

const conversationSelect = {
  id: true,
  title: true,
  isPinned: true,
  pinnedAt: true,
  isArchived: true,
  archivedAt: true,
  deletedAt: true,
  folderId: true,
  lastMessageAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Verifies that a conversation exists and belongs to the given user.
 *
 * @throws {Error} When the conversation is not found or not owned by the user.
 */
async function assertOwnsConversation(
  conversationId: string,
  userId: string,
  options: { includeDeleted?: boolean } = {}
) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId,
      ...(options.includeDeleted ? {} : { deletedAt: null }),
    },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  return conversation;
}

/** Fetches a single active (non-deleted) conversation owned by the current user. */
export async function getConversation(conversationId: string) {
  const user = await requireUser();
  return assertOwnsConversation(conversationId, user.id);
}

/** Lists active (non-archived, non-deleted) conversations for the current user. */
export async function listConversations(): Promise<ConversationListItem[]> {
  const user = await requireUser();

  return prisma.conversation.findMany({
    where: { userId: user.id, isArchived: false, deletedAt: null },
    orderBy: [{ isPinned: "desc" }, { lastMessageAt: "desc" }],
    select: conversationSelect,
  });
}

/** Lists archived (non-deleted) conversations for the current user. */
export async function listArchivedConversations(): Promise<
  ConversationListItem[]
> {
  const user = await requireUser();

  return prisma.conversation.findMany({
    where: { userId: user.id, isArchived: true, deletedAt: null },
    orderBy: [{ archivedAt: "desc" }, { lastMessageAt: "desc" }],
    select: conversationSelect,
  });
}

/** Lists soft-deleted conversations in Trash for the current user. */
export async function listTrashConversations(): Promise<
  ConversationListItem[]
> {
  const user = await requireUser();

  return prisma.conversation.findMany({
    where: { userId: user.id, deletedAt: { not: null } },
    orderBy: [{ deletedAt: "desc" }],
    select: conversationSelect,
  });
}

/** Searches conversations by title or message content (database-side, user-scoped). */
export async function searchConversations(
  query: string,
  includeArchived = false
): Promise<ConversationListItem[]> {
  const user = await requireUser();
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  return prisma.conversation.findMany({
    where: {
      userId: user.id,
      deletedAt: null,
      ...(includeArchived ? {} : { isArchived: false }),
      OR: [
        { title: { contains: trimmed, mode: "insensitive" } },
        {
          messages: {
            some: {
              content: { contains: trimmed, mode: "insensitive" },
            },
          },
        },
      ],
    },
    orderBy: [{ isPinned: "desc" }, { lastMessageAt: "desc" }],
    take: 50,
    select: conversationSelect,
  });
}

/** Creates a new conversation for the current user. */
export async function createConversation(title = "New Chat") {
  const user = await requireUser();
  const normalized = title.trim().slice(0, MAX_TITLE_LENGTH) || "New Chat";

  return prisma.conversation.create({
    data: {
      userId: user.id,
      title: normalized,
    },
  });
}

/** Updates conversation metadata (title, pin, archive, or folder). */
export async function updateConversation(
  conversationId: string,
  data: {
    title?: string;
    isPinned?: boolean;
    isArchived?: boolean;
    folderId?: string | null;
  }
) {
  const user = await requireUser();
  await assertOwnsConversation(conversationId, user.id);

  let nextTitle: string | undefined;
  if (data.title !== undefined) {
    const trimmed = data.title.trim();
    if (!trimmed) {
      throw new Error("Title cannot be empty");
    }
    if (trimmed.length > MAX_TITLE_LENGTH) {
      throw new Error(`Title cannot exceed ${MAX_TITLE_LENGTH} characters`);
    }
    nextTitle = trimmed;
  }

  if (data.isPinned === true) {
    const pinnedCount = await prisma.conversation.count({
      where: {
        userId: user.id,
        isPinned: true,
        deletedAt: null,
        id: { not: conversationId },
      },
    });
    if (pinnedCount >= MAX_PINNED_CONVERSATIONS) {
      throw new Error(
        `You can pin up to ${MAX_PINNED_CONVERSATIONS} conversations`
      );
    }
  }

  if (data.folderId !== undefined && data.folderId !== null) {
    const folder = await prisma.conversationFolder.findFirst({
      where: { id: data.folderId, userId: user.id },
      select: { id: true },
    });
    if (!folder) {
      throw new Error("Folder not found");
    }
  }

  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      ...(nextTitle !== undefined ? { title: nextTitle } : {}),
      ...(data.isPinned !== undefined
        ? {
            isPinned: data.isPinned,
            pinnedAt: data.isPinned ? new Date() : null,
          }
        : {}),
      ...(data.isArchived !== undefined
        ? {
            isArchived: data.isArchived,
            archivedAt: data.isArchived ? new Date() : null,
            ...(data.isArchived ? { isPinned: false, pinnedAt: null } : {}),
          }
        : {}),
      ...(data.folderId !== undefined ? { folderId: data.folderId } : {}),
    },
  });

  revalidatePath("/");
  revalidatePath(`/c/${conversationId}`);
  return conversation;
}

/** Soft-deletes a conversation (moves it to Trash). */
export async function deleteConversation(conversationId: string) {
  const user = await requireUser();
  await assertOwnsConversation(conversationId, user.id);

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      deletedAt: new Date(),
      isPinned: false,
      pinnedAt: null,
    },
  });

  revalidatePath("/");
  return { id: conversationId };
}

/** Restores a conversation from Trash or Archive back to active chats. */
export async function restoreConversation(conversationId: string) {
  const user = await requireUser();
  await assertOwnsConversation(conversationId, user.id, {
    includeDeleted: true,
  });

  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      deletedAt: null,
      isArchived: false,
      archivedAt: null,
    },
  });

  revalidatePath("/");
  revalidatePath(`/c/${conversationId}`);
  return conversation;
}

/** Permanently deletes a conversation and its messages. */
export async function permanentlyDeleteConversation(conversationId: string) {
  const user = await requireUser();
  await assertOwnsConversation(conversationId, user.id, {
    includeDeleted: true,
  });

  await prisma.conversation.delete({
    where: { id: conversationId },
  });

  revalidatePath("/");
  return { id: conversationId };
}

/** Lists all conversation folders owned by the current user. */
export async function listFolders(): Promise<FolderItem[]> {
  const user = await requireUser();

  return prisma.conversationFolder.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/** Creates a new conversation folder for the current user. */
export async function createFolder(name: string): Promise<FolderItem> {
  const user = await requireUser();
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Folder name cannot be empty");
  }
  if (trimmed.length > MAX_FOLDER_NAME_LENGTH) {
    throw new Error(
      `Folder name cannot exceed ${MAX_FOLDER_NAME_LENGTH} characters`
    );
  }

  const existing = await prisma.conversationFolder.findFirst({
    where: {
      userId: user.id,
      name: { equals: trimmed, mode: "insensitive" },
    },
  });
  if (existing) {
    throw new Error("A folder with this name already exists");
  }

  return prisma.conversationFolder.create({
    data: { userId: user.id, name: trimmed },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });
}

/** Renames a folder owned by the current user. */
export async function renameFolder(
  folderId: string,
  name: string
): Promise<FolderItem> {
  const user = await requireUser();
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Folder name cannot be empty");
  }
  if (trimmed.length > MAX_FOLDER_NAME_LENGTH) {
    throw new Error(
      `Folder name cannot exceed ${MAX_FOLDER_NAME_LENGTH} characters`
    );
  }

  const folder = await prisma.conversationFolder.findFirst({
    where: { id: folderId, userId: user.id },
  });
  if (!folder) {
    throw new Error("Folder not found");
  }

  const duplicate = await prisma.conversationFolder.findFirst({
    where: {
      userId: user.id,
      id: { not: folderId },
      name: { equals: trimmed, mode: "insensitive" },
    },
  });
  if (duplicate) {
    throw new Error("A folder with this name already exists");
  }

  return prisma.conversationFolder.update({
    where: { id: folderId },
    data: { name: trimmed },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });
}

/** Deletes a folder owned by the current user while preserving its conversations. */
export async function deleteFolder(folderId: string) {
  const user = await requireUser();

  const folder = await prisma.conversationFolder.findFirst({
    where: { id: folderId, userId: user.id },
  });
  if (!folder) {
    throw new Error("Folder not found");
  }

  await prisma.conversationFolder.delete({
    where: { id: folderId },
  });

  revalidatePath("/");
  return { id: folderId };
}
