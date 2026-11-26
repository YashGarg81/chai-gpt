"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createConversation,
  createFolder,
  deleteConversation,
  deleteFolder,
  listArchivedConversations,
  listConversations,
  listFolders,
  listTrashConversations,
  permanentlyDeleteConversation,
  renameFolder,
  restoreConversation,
  searchConversations,
  updateConversation,
} from "@/features/conversation/actions/conversation-actions";
import { queryKeys } from "../utils/query-keys";

/** Fetches all active conversations for the sidebar via React Query. */
export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversations.all,
    queryFn: () => listConversations(),
  });
}

/** Fetches archived conversations. */
export function useArchivedConversations(enabled = true) {
  return useQuery({
    queryKey: queryKeys.conversations.archived,
    queryFn: () => listArchivedConversations(),
    enabled,
  });
}

/** Fetches soft-deleted conversations in Trash. */
export function useTrashConversations(enabled = true) {
  return useQuery({
    queryKey: queryKeys.conversations.trash,
    queryFn: () => listTrashConversations(),
    enabled,
  });
}

/** Searches conversations on the server when query is non-empty. */
export function useSearchConversations(query: string, includeArchived = false) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: queryKeys.conversations.search(`${trimmed}:${includeArchived}`),
    queryFn: () => searchConversations(trimmed, includeArchived),
    enabled: trimmed.length > 0,
  });
}

/** Mutation hook to create a new conversation and navigate to it. */
export function useCreateConversation() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (title?: string) => createConversation(title),
    onSuccess: (conversation) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });
      router.push(`/c/${conversation.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not create chat");
    },
  });
}

/** Rename, pin, archive, or move a conversation to a folder. */
export function useUpdateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      title?: string;
      isPinned?: boolean;
      isArchived?: boolean;
      folderId?: string | null;
    }) => updateConversation(id, data),
    onSuccess: (conversation) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.archived,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.detail(conversation.id),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not update chat");
    },
  });
}

/** Soft-delete a conversation (move to Trash) and leave the page if viewing it. */
export function useDeleteConversation(activeId?: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (id: string) => deleteConversation(id),
    onSuccess: ({ id }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.archived,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.trash,
      });

      if (activeId === id) {
        router.push("/");
      }

      toast.success("Moved to Trash");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not delete chat");
    },
  });
}

/** Restore a conversation from Trash or Archive. */
export function useRestoreConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => restoreConversation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.archived,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.trash,
      });
      toast.success("Chat restored");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not restore chat");
    },
  });
}

/** Permanently delete a conversation from Trash. */
export function usePermanentlyDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => permanentlyDeleteConversation(id),
    onSuccess: ({ id }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.trash,
      });
      queryClient.removeQueries({
        queryKey: queryKeys.messages.byConversation(id),
      });
      toast.success("Chat permanently deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not permanently delete chat");
    },
  });
}

/** Fetches all conversation folders. */
export function useFolders() {
  return useQuery({
    queryKey: queryKeys.folders.all,
    queryFn: () => listFolders(),
  });
}

/** Creates a new folder. */
export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createFolder(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.folders.all });
      toast.success("Folder created");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not create folder");
    },
  });
}

/** Renames a folder. */
export function useRenameFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      renameFolder(id, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.folders.all });
      toast.success("Folder renamed");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not rename folder");
    },
  });
}

/** Deletes a folder while preserving conversations. */
export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteFolder(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.folders.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });
      toast.success("Folder deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not delete folder");
    },
  });
}
