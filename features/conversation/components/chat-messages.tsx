"use client";

import * as React from "react";
import { isTextUIPart, type ChatStatus, type UIMessage } from "ai";
import {
  CheckIcon,
  CopyIcon,
  FileTextIcon,
  HistoryIcon,
  PencilIcon,
  RefreshCwIcon,
  AlertCircleIcon,
} from "lucide-react";
import type { SentAttachmentMeta } from "./chat-composer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MessageVersionItem } from "../actions/branch-actions";
import { Textarea } from "@/components/ui/textarea";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { Loader } from "@/components/ai-elements/loader";
import { Button } from "@/components/ui/button";

/** Extracts plain text from a `UIMessage` by joining all text parts. */
function getMessageText(message: UIMessage) {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("");
}

type ChatMessagesProps = {
  messages: UIMessage[];
  status: ChatStatus;
  error?: Error | null;
  onRegenerate?: () => void;
  onEditMessage?: (messageId: string, newContent: string) => Promise<void> | void;
  onLoadVersions?: (messageId: string) => Promise<MessageVersionItem[]>;
  onRestoreVersion?: (versionMessageId: string) => Promise<void> | void;
};

/**
 * Renders the conversation message list with markdown responses, inline user
 * message editing, version history inspection/restoration, copy/regenerate actions,
 * error retry banner, and scroll-to-bottom.
 */
export function ChatMessages({
  messages,
  status,
  error,
  onRegenerate,
  onEditMessage,
  onLoadVersions,
  onRestoreVersion,
}: ChatMessagesProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editText, setEditText] = React.useState("");
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);
  const [versionsOpen, setVersionsOpen] = React.useState(false);
  const [versions, setVersions] = React.useState<MessageVersionItem[]>([]);
  const [loadingVersions, setLoadingVersions] = React.useState(false);
  const [restoringVersionId, setRestoringVersionId] = React.useState<string | null>(null);
  const isWaiting =
    status === "submitted" && messages.at(-1)?.role === "user";
  const isStreaming = status === "streaming" || status === "submitted";

  async function handleCopy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 1800);
    } catch {
      // Clipboard unavailable
    }
  }

  async function handleSaveEdit(messageId: string) {
    const trimmed = editText.trim();
    if (!trimmed || !onEditMessage || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      await onEditMessage(messageId, trimmed);
      setEditingId(null);
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleOpenVersions(messageId: string) {
    if (!onLoadVersions) return;
    setVersionsOpen(true);
    setLoadingVersions(true);
    try {
      const list = await onLoadVersions(messageId);
      setVersions(list);
    } finally {
      setLoadingVersions(false);
    }
  }

  async function handleRestore(versionId: string) {
    if (!onRestoreVersion || restoringVersionId) return;
    setRestoringVersionId(versionId);
    try {
      await onRestoreVersion(versionId);
      setVersionsOpen(false);
    } finally {
      setRestoringVersionId(null);
    }
  }

  const lastAssistantIndex = messages.findLastIndex(
    (m) => m.role === "assistant"
  );

  return (
    <Conversation>
      <ConversationContent className="mx-auto w-full max-w-[880px] px-5 py-6 md:px-8 md:py-8">
        {messages.map((message, index) => {
          const text = getMessageText(message);
          const isLastAssistant = index === lastAssistantIndex;
          const isEditing = editingId === message.id;

          return (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {isEditing ? (
                  <div className="w-full min-w-60 space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void handleSaveEdit(message.id);
                        } else if (e.key === "Escape") {
                          setEditingId(null);
                        }
                      }}
                      rows={3}
                      aria-label="Edit message"
                      className="min-h-20 resize-y text-sm"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(null)}
                        disabled={isSavingEdit}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={!editText.trim() || isSavingEdit}
                        onClick={() => void handleSaveEdit(message.id)}
                      >
                        {isSavingEdit ? "Saving…" : "Save & Resend"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const msgAttachments = (
                        message.metadata as
                          | { attachments?: SentAttachmentMeta[] }
                          | undefined
                      )?.attachments;
                      if (!msgAttachments?.length) return null;
                      return (
                        <div className="mb-2 flex flex-wrap gap-2">
                          {msgAttachments.map((att) => {
                            const isImg = att.mimeType.startsWith("image/");
                            return (
                              <a
                                key={att.id}
                                href={`/api/attachments/${att.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex max-w-60 items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-2.5 py-1.5 text-xs hover:bg-accent/50"
                              >
                                {isImg ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={`/api/attachments/${att.id}`}
                                    alt={att.originalName}
                                    className="size-8 rounded object-cover"
                                  />
                                ) : (
                                  <FileTextIcon className="size-4 shrink-0 text-primary" />
                                )}
                                <span className="truncate font-medium">
                                  {att.originalName}
                                </span>
                              </a>
                            );
                          })}
                        </div>
                      );
                    })()}
                    <MessageResponse>{text}</MessageResponse>
                  </>
                )}
              </MessageContent>

              {!isEditing &&
              text.trim().length > 0 &&
              !(isLastAssistant && isStreaming) ? (
                <MessageActions
                  className={
                    message.role === "user" ? "justify-end" : "justify-start"
                  }
                >
                  {message.role === "user" && onEditMessage && !isStreaming ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Edit message"
                      aria-label="Edit message"
                      onClick={() => {
                        setEditingId(message.id);
                        setEditText(text);
                      }}
                      className="size-7 text-muted-foreground hover:text-foreground"
                    >
                      <PencilIcon className="size-3.5" />
                    </Button>
                  ) : null}

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title={copiedId === message.id ? "Copied" : "Copy message"}
                    aria-label="Copy message"
                    onClick={() => void handleCopy(message.id, text)}
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    {copiedId === message.id ? (
                      <CheckIcon className="size-3.5 text-emerald-500" />
                    ) : (
                      <CopyIcon className="size-3.5" />
                    )}
                  </Button>

                  {onLoadVersions ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="View versions"
                      aria-label="View versions"
                      onClick={() => void handleOpenVersions(message.id)}
                      className="size-7 text-muted-foreground hover:text-foreground"
                    >
                      <HistoryIcon className="size-3.5" />
                    </Button>
                  ) : null}

                  {isLastAssistant && onRegenerate ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Regenerate response"
                      aria-label="Regenerate response"
                      onClick={onRegenerate}
                      className="size-7 text-muted-foreground hover:text-foreground"
                    >
                      <RefreshCwIcon className="size-3.5" />
                    </Button>
                  ) : null}
                </MessageActions>
              ) : null}
            </Message>
          );
        })}

        {isWaiting ? (
          <Message from="assistant">
            <MessageContent>
              <Loader />
            </MessageContent>
          </Message>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <div className="flex items-center gap-2">
              <AlertCircleIcon className="size-4 shrink-0" />
              <span>{error.message || "Failed to generate response."}</span>
            </div>
            {onRegenerate ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRegenerate}
                className="shrink-0"
              >
                Retry
              </Button>
            ) : null}
          </div>
        ) : null}
      </ConversationContent>
      <ConversationScrollButton aria-label="Scroll to bottom" />

      <Dialog open={versionsOpen} onOpenChange={setVersionsOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              Inspect previous versions or restore an earlier version non-destructively.
            </DialogDescription>
          </DialogHeader>
          {loadingVersions ? (
            <p className="py-4 text-sm text-muted-foreground">Loading versions…</p>
          ) : versions.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No historical versions found.</p>
          ) : (
            <div className="space-y-3">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="rounded-lg border border-border/70 bg-card/50 p-3 text-sm"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">v{v.versionNumber}</span>
                      {v.isCurrent ? (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                          Current
                        </span>
                      ) : null}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(v.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="line-clamp-4 whitespace-pre-wrap text-muted-foreground">
                    {v.content}
                  </p>
                  {!v.isCurrent && onRestoreVersion ? (
                    <div className="mt-2 flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={restoringVersionId === v.id}
                        onClick={() => void handleRestore(v.id)}
                      >
                        {restoringVersionId === v.id ? "Restoring…" : "Restore"}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Conversation>
  );
}
