/** TanStack Query key factory for conversations, folders, and messages caches. */
export const queryKeys = {
  conversations: {
    all: ["conversations"] as const,
    archived: ["conversations", "archived"] as const,
    trash: ["conversations", "trash"] as const,
    search: (q: string) => ["conversations", "search", q] as const,
    detail: (id: string) => ["conversations", id] as const,
  },
  folders: {
    all: ["folders"] as const,
  },
  messages: {
    byConversation: (conversationId: string) =>
      ["messages", conversationId] as const,
  },
};
