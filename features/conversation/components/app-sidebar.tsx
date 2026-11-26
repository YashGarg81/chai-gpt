"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  FolderIcon,
  FolderPlusIcon,
  LayoutDashboardIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PinIcon,
  PinOffIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useTheme } from "@/components/providers/theme-provider";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useArchivedConversations,
  useConversations,
  useCreateFolder,
  useDeleteConversation,
  useDeleteFolder,
  useFolders,
  usePermanentlyDeleteConversation,
  useRenameFolder,
  useRestoreConversation,
  useSearchConversations,
  useTrashConversations,
  useUpdateConversation,
} from "@/features/conversation/hooks/use-conversation";
import { cn } from "@/lib/utils";

type Conversation = NonNullable<
  ReturnType<typeof useConversations>["data"]
>[number];

type SidebarView = "active" | "archived" | "trash";

function groupConversationsByDate(items: Conversation[]) {
  const pinned: Conversation[] = [];
  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const prev7: Conversation[] = [];
  const prev30: Conversation[] = [];
  const older: Conversation[] = [];

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const dayMs = 86_400_000;

  for (const item of items) {
    if (item.isPinned) {
      pinned.push(item);
      continue;
    }
    const ts = new Date(item.lastMessageAt).getTime();
    if (ts >= startOfToday) {
      today.push(item);
    } else if (ts >= startOfToday - dayMs) {
      yesterday.push(item);
    } else if (ts >= startOfToday - 7 * dayMs) {
      prev7.push(item);
    } else if (ts >= startOfToday - 30 * dayMs) {
      prev30.push(item);
    } else {
      older.push(item);
    }
  }

  return [
    { label: "Pinned", items: pinned },
    { label: "Today", items: today },
    { label: "Yesterday", items: yesterday },
    { label: "Previous 7 Days", items: prev7 },
    { label: "Previous 30 Days", items: prev30 },
    { label: "Older", items: older },
  ].filter((g) => g.items.length > 0);
}

/**
 * Main application sidebar — logo, new chat, search, folders, date-grouped
 * conversation list, archive/trash views, theme toggle, and account.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const [view, setView] = React.useState<SidebarView>("active");
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(
    null
  );
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [newFolderOpen, setNewFolderOpen] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: conversations, isLoading } = useConversations();
  const { data: archived, isLoading: isArchivedLoading } =
    useArchivedConversations(view === "archived");
  const { data: trash, isLoading: isTrashLoading } = useTrashConversations(
    view === "trash"
  );
  const { data: folders } = useFolders();
  const createFolder = useCreateFolder();
  const renameFolder = useRenameFolder();
  const deleteFolder = useDeleteFolder();

  const {
    data: searchResults,
    isLoading: isSearching,
    isError: isSearchError,
  } = useSearchConversations(debouncedQuery, view === "archived");

  const activeId = pathname.startsWith("/c/")
    ? pathname.split("/")[2]
    : undefined;

  const filteredActive = React.useMemo(() => {
    if (!conversations) return undefined;
    if (!selectedFolderId) return conversations;
    return conversations.filter((c) => c.folderId === selectedFolderId);
  }, [conversations, selectedFolderId]);

  function handleCreateFolderSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    createFolder.mutate(trimmed, {
      onSuccess: () => {
        setNewFolderName("");
        setNewFolderOpen(false);
      },
    });
  }

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="gap-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="font-semibold tracking-tight"
              render={<Link href="/" onClick={() => setOpenMobile(false)} />}
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
                C
              </span>
              <span>ChaiGPT</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="New chat"
              render={<Link href="/" onClick={() => setOpenMobile(false)} />}
            >
              <PlusIcon />
              <span>New chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="relative px-1 group-data-[collapsible=icon]:hidden">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search chats…"
            aria-label="Search conversations"
            className="h-8 pr-7 pl-8 text-xs"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setDebouncedQuery("");
              }}
              aria-label="Clear search"
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div
          className="flex gap-1 px-1 group-data-[collapsible=icon]:hidden"
          role="tablist"
          aria-label="Conversation views"
        >
          {(
            [
              { id: "active", label: "Chats" },
              { id: "archived", label: "Archived" },
              { id: "trash", label: "Trash" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={view === tab.id}
              onClick={() => {
                setView(tab.id);
                if (tab.id !== "active") setSelectedFolderId(null);
              }}
              className={cn(
                "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                view === tab.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {view === "active" && !debouncedQuery ? (
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <div className="flex items-center justify-between px-2">
              <SidebarGroupLabel className="px-0">Folders</SidebarGroupLabel>
              <button
                type="button"
                onClick={() => setNewFolderOpen(true)}
                aria-label="New folder"
                title="New folder"
                className="rounded p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              >
                <FolderPlusIcon className="size-3.5" />
              </button>
            </div>
            <SidebarGroupContent>
              <div className="flex flex-wrap gap-1 px-2 pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedFolderId(null)}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-xs transition-colors",
                    selectedFolderId === null
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  )}
                >
                  All
                </button>
                {folders?.map((folder) => (
                  <div
                    key={folder.id}
                    className="group/folder inline-flex items-center"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFolderId(
                          selectedFolderId === folder.id ? null : folder.id
                        )
                      }
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs transition-colors",
                        selectedFolderId === folder.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <FolderIcon className="size-3" />
                      <span className="max-w-20 truncate">{folder.name}</span>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={`Folder ${folder.name} actions`}
                        className="ml-0.5 rounded p-0.5 text-muted-foreground opacity-0 hover:text-foreground group-hover/folder:opacity-100 focus:opacity-100"
                      >
                        <MoreHorizontalIcon className="size-3" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem
                          onClick={() => {
                            const next = window.prompt(
                              "Rename folder",
                              folder.name
                            );
                            if (next && next.trim() !== folder.name) {
                              renameFolder.mutate({
                                id: folder.id,
                                name: next,
                              });
                            }
                          }}
                        >
                          <PencilIcon />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => {
                            if (selectedFolderId === folder.id) {
                              setSelectedFolderId(null);
                            }
                            deleteFolder.mutate(folder.id);
                          }}
                        >
                          <Trash2Icon />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {debouncedQuery ? (
          <SidebarGroup>
            <SidebarGroupLabel>Search Results</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {isSearchError ? (
                  <p className="px-2 py-1.5 text-xs text-destructive">
                    Search failed. Please try again.
                  </p>
                ) : (
                  <ChatList
                    conversations={searchResults}
                    isLoading={isSearching}
                    activeId={activeId}
                    emptyText="No matching chats"
                    view={view}
                    folders={folders ?? []}
                  />
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : view === "active" ? (
          isLoading ? (
            <SidebarGroup>
              <SidebarGroupLabel>Chats</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <ChatList
                    conversations={undefined}
                    isLoading
                    activeId={activeId}
                    view="active"
                    folders={folders ?? []}
                  />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : !filteredActive?.length ? (
            <SidebarGroup>
              <SidebarGroupLabel>Chats</SidebarGroupLabel>
              <SidebarGroupContent>
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  {selectedFolderId ? "No chats in this folder" : "No chats yet"}
                </p>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : (
            groupConversationsByDate(filteredActive).map((group) => (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((conversation) => (
                      <ChatItem
                        key={conversation.id}
                        conversation={conversation}
                        isActive={activeId === conversation.id}
                        view="active"
                        folders={folders ?? []}
                      />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))
          )
        ) : view === "archived" ? (
          <SidebarGroup>
            <SidebarGroupLabel>Archived</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <ChatList
                  conversations={archived}
                  isLoading={isArchivedLoading}
                  activeId={activeId}
                  emptyText="No archived chats"
                  view="archived"
                  folders={folders ?? []}
                />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel>Recently Deleted</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <ChatList
                  conversations={trash}
                  isLoading={isTrashLoading}
                  activeId={activeId}
                  emptyText="Trash is empty"
                  view="trash"
                  folders={folders ?? []}
                />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarFooterMenu />
      </SidebarFooter>
      <SidebarRail />

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
            <DialogDescription>
              Organize conversations into custom folders.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateFolderSubmit} className="space-y-4">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. Work, Personal, Learning"
              maxLength={50}
              autoFocus
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewFolderOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!newFolderName.trim() || createFolder.isPending}
              >
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}

/** Renders a list of conversations with loading skeletons or empty state. */
function ChatList({
  conversations,
  isLoading,
  activeId,
  emptyText = "No chats yet",
  view,
  folders,
}: {
  conversations: Conversation[] | undefined;
  isLoading: boolean;
  activeId: string | undefined;
  emptyText?: string;
  view: SidebarView;
  folders: Array<{ id: string; name: string }>;
}) {
  if (isLoading) {
    return (
      <>
        {Array.from({ length: 5 }).map((_, index) => (
          <SidebarMenuItem key={index}>
            <Skeleton className="h-8 w-full" />
          </SidebarMenuItem>
        ))}
      </>
    );
  }

  if (!conversations?.length) {
    return (
      <p className="px-2 py-1.5 text-xs text-muted-foreground">{emptyText}</p>
    );
  }

  return (
    <>
      {conversations.map((conversation) => (
        <ChatItem
          key={conversation.id}
          conversation={conversation}
          isActive={activeId === conversation.id}
          view={view}
          folders={folders}
        />
      ))}
    </>
  );
}

/** Single sidebar row for a conversation with rename, pin, archive, folder, and delete actions. */
function ChatItem({
  conversation,
  isActive,
  view,
  folders,
}: {
  conversation: Conversation;
  isActive: boolean;
  view: SidebarView;
  folders: Array<{ id: string; name: string }>;
}) {
  const { setOpenMobile } = useSidebar();
  const updateConversation = useUpdateConversation();
  const deleteConversation = useDeleteConversation(
    isActive ? conversation.id : undefined
  );
  const restoreConversation = useRestoreConversation();
  const permanentlyDelete = usePermanentlyDeleteConversation();

  const [renameOpen, setRenameOpen] = React.useState(false);
  const [titleInput, setTitleInput] = React.useState(conversation.title);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  function handleRenameSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = titleInput.trim();
    if (!trimmed || trimmed === conversation.title) {
      setRenameOpen(false);
      return;
    }
    updateConversation.mutate(
      { id: conversation.id, title: trimmed },
      { onSuccess: () => setRenameOpen(false) }
    );
  }

  return (
    <>
      <SidebarMenuItem>
        {view === "trash" ? (
          <SidebarMenuButton
            tooltip={conversation.title}
            className="text-muted-foreground"
          >
            <span className="truncate">{conversation.title}</span>
          </SidebarMenuButton>
        ) : (
          <SidebarMenuButton
            isActive={isActive}
            tooltip={conversation.title}
            render={
              <Link
                href={`/c/${conversation.id}`}
                onClick={() => setOpenMobile(false)}
              />
            }
            className={cn(isActive && "font-medium")}
          >
            {conversation.isPinned ? (
              <PinIcon className="size-3 shrink-0 text-primary" />
            ) : null}
            <span className="truncate">{conversation.title}</span>
          </SidebarMenuButton>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuAction
                showOnHover
                className="data-popup-open:bg-sidebar-accent"
              />
            }
          >
            <MoreHorizontalIcon />
            <span className="sr-only">Chat actions</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start">
            {view === "trash" ? (
              <>
                <DropdownMenuItem
                  onClick={() => restoreConversation.mutate(conversation.id)}
                >
                  <RotateCcwIcon />
                  Restore
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2Icon />
                  Delete permanently
                </DropdownMenuItem>
              </>
            ) : view === "archived" ? (
              <>
                <DropdownMenuItem
                  onClick={() => restoreConversation.mutate(conversation.id)}
                >
                  <ArchiveRestoreIcon />
                  Unarchive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2Icon />
                  Delete
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem
                  onClick={() => {
                    setTitleInput(conversation.title);
                    setRenameOpen(true);
                  }}
                >
                  <PencilIcon />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    updateConversation.mutate({
                      id: conversation.id,
                      isPinned: !conversation.isPinned,
                    })
                  }
                >
                  {conversation.isPinned ? <PinOffIcon /> : <PinIcon />}
                  {conversation.isPinned ? "Unpin" : "Pin"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    updateConversation.mutate({
                      id: conversation.id,
                      isArchived: true,
                    })
                  }
                >
                  <ArchiveIcon />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FolderIcon />
                    Move to folder
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      onClick={() =>
                        updateConversation.mutate({
                          id: conversation.id,
                          folderId: null,
                        })
                      }
                    >
                      None
                    </DropdownMenuItem>
                    {folders.map((folder) => (
                      <DropdownMenuItem
                        key={folder.id}
                        onClick={() =>
                          updateConversation.mutate({
                            id: conversation.id,
                            folderId: folder.id,
                          })
                        }
                      >
                        <FolderIcon />
                        {folder.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2Icon />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
            <DialogDescription>
              Enter a new title for this conversation (max 100 characters).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenameSubmit} className="space-y-4">
            <Input
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              maxLength={100}
              autoFocus
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!titleInput.trim() || updateConversation.isPending}
              >
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {view === "trash" ? "Delete Permanently?" : "Move to Trash?"}
            </DialogTitle>
            <DialogDescription>
              {view === "trash"
                ? "This will permanently delete this conversation and all of its messages. This action cannot be undone."
                : "This conversation and its messages will be moved to Trash. You can restore it later from Trash."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                deleteConversation.isPending || permanentlyDelete.isPending
              }
              onClick={() => {
                if (view === "trash") {
                  permanentlyDelete.mutate(conversation.id, {
                    onSuccess: () => setDeleteOpen(false),
                  });
                } else {
                  deleteConversation.mutate(conversation.id, {
                    onSuccess: () => setDeleteOpen(false),
                  });
                }
              }}
            >
              {view === "trash" ? "Delete permanently" : "Move to Trash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Footer menu with theme toggle and Clerk user account button. */
function SidebarFooterMenu() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Link
          href="/dashboard"
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-muted"
        >
          <LayoutDashboardIcon className="h-4 w-4" />
          <span>Dashboard</span>
        </Link>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          Toggle theme
        </Button>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <div className="flex items-center gap-2 px-1 py-1.5">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "size-8",
              },
            }}
          />
          <span className="truncate text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">
            Account
          </span>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
