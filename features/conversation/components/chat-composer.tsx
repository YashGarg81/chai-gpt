"use client";

import * as React from "react";
import {
  ArrowUpIcon,
  FileTextIcon,
  ImageIcon,
  PaperclipIcon,
  SquareIcon,
  XIcon,
} from "lucide-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type PendingAttachment = {
  localId: string;
  id?: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  status: "uploading" | "ready" | "error";
  error?: string;
  previewUrl?: string;
};

export type SentAttachmentMeta = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  fileExtension: string;
};

type ChatComposerProps = {
  conversationId?: string;
  onSend: (
    content: string,
    attachmentIds: string[],
    attachmentsMeta: SentAttachmentMeta[]
  ) => Promise<void> | void;
  onStop?: () => void;
  isSending?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Message input form with attachment upload, drag-and-drop, send & stop controls.
 * Enter sends; Shift+Enter inserts a newline.
 */
export function ChatComposer({
  conversationId,
  onSend,
  onStop,
  isSending = false,
  placeholder = "Message ChaiGPT…",
  className,
  autoFocus = false,
}: ChatComposerProps) {
  const [value, setValue] = React.useState("");
  const [attachments, setAttachments] = React.useState<PendingAttachment[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (autoFocus) {
      textareaRef.current?.focus();
    }
  }, [autoFocus]);

  async function uploadFiles(files: FileList | File[]) {
    if (!conversationId) return;
    const list = Array.from(files).slice(0, 5 - attachments.length);

    for (const file of list) {
      const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const isImg = file.type.startsWith("image/");
      const previewUrl = isImg ? URL.createObjectURL(file) : undefined;

      setAttachments((prev) => [
        ...prev,
        {
          localId,
          name: file.name,
          sizeBytes: file.size,
          mimeType: file.type,
          status: "uploading",
          previewUrl,
        },
      ]);

      try {
        const form = new FormData();
        form.append("conversationId", conversationId);
        form.append("file", file);

        const res = await fetch("/api/attachments/upload", {
          method: "POST",
          body: form,
        });
        const data = (await res.json()) as {
          id?: string;
          mimeType?: string;
          error?: string;
        };

        if (!res.ok || !data.id) {
          throw new Error(data.error || "Upload failed");
        }

        setAttachments((prev) =>
          prev.map((a) =>
            a.localId === localId
              ? {
                  ...a,
                  id: data.id,
                  mimeType: data.mimeType || a.mimeType,
                  status: "ready",
                }
              : a
          )
        );
      } catch (err) {
        setAttachments((prev) =>
          prev.map((a) =>
            a.localId === localId
              ? {
                  ...a,
                  status: "error",
                  error: err instanceof Error ? err.message : "Upload failed",
                }
              : a
          )
        );
      }
    }
  }

  function removeAttachment(item: PendingAttachment) {
    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
    setAttachments((prev) => prev.filter((a) => a.localId !== item.localId));
    if (item.id) {
      void fetch(`/api/attachments/${item.id}`, { method: "DELETE" });
    }
  }

  const isUploading = attachments.some((a) => a.status === "uploading");
  const readyAttachments = attachments.filter(
    (a) => a.status === "ready" && a.id
  );
  const readyIds = readyAttachments.map((a) => a.id as string);
  const readyMeta: SentAttachmentMeta[] = readyAttachments.map((a) => ({
    id: a.id as string,
    originalName: a.name,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    fileExtension: a.name.split(".").pop()?.toLowerCase() || "bin",
  }));

  /** Submits the current message when the form is submitted or Enter is pressed. */
  async function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    const content = value.trim();
    if (!content || isSending || isUploading) return;

    const idsToSend = [...readyIds];
    const metaToSend = [...readyMeta];
    setValue("");
    setAttachments([]);
    await onSend(content, idsToSend, metaToSend);
    textareaRef.current?.focus();
  }

  /** Handles keyboard shortcuts — Enter to send, Shift+Enter for a new line. */
  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  }

  const canSend = value.trim().length > 0 && !isSending && !isUploading;

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.length) {
          void uploadFiles(e.dataTransfer.files);
        }
      }}
      className={cn(
        "mx-auto w-full max-w-[880px] px-5 pb-4 md:px-8",
        className
      )}
    >
      {attachments.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((att) => (
            <div
              key={att.localId}
              className={cn(
                "flex max-w-60 items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs",
                att.status === "error"
                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                  : "border-border/70 bg-card/80 text-foreground"
              )}
            >
              {att.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={att.previewUrl}
                  alt={att.name}
                  className="size-7 rounded object-cover"
                />
              ) : att.mimeType.startsWith("image/") ? (
                <ImageIcon className="size-4 shrink-0" />
              ) : (
                <FileTextIcon className="size-4 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{att.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {att.status === "uploading"
                    ? "Uploading…"
                    : att.status === "error"
                      ? att.error
                      : formatBytes(att.sizeBytes)}
                </p>
              </div>
              {att.status === "uploading" ? (
                <Spinner className="size-3.5" />
              ) : (
                <button
                  type="button"
                  onClick={() => removeAttachment(att)}
                  aria-label={`Remove ${att.name}`}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.txt,.csv,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            void uploadFiles(e.target.files);
            e.target.value = "";
          }
        }}
      />

      <InputGroup
        className={cn(
          "h-auto min-h-14 rounded-3xl border-border/80 bg-background shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-ring/40 dark:bg-input/40",
          isDragging && "ring-2 ring-primary"
        )}
      >
        {conversationId ? (
          <InputGroupAddon align="inline-start" className="self-end pb-2 pl-2">
            <InputGroupButton
              type="button"
              size="icon-sm"
              variant="ghost"
              disabled={isSending || attachments.length >= 5}
              onClick={() => fileInputRef.current?.click()}
              className="size-9 rounded-full"
              aria-label="Attach files"
              title="Attach files (PDF, DOCX, TXT, CSV, PNG, JPG, WEBP)"
            >
              <PaperclipIcon className="size-4" />
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}

        <InputGroupTextarea
          id="chat-message-input"
          name="message"
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Message input"
          rows={1}
          className="max-h-48 min-h-12 py-3.5 pl-3 text-[15px] leading-relaxed"
        />
        <InputGroupAddon align="inline-end" className="self-end pr-2 pb-2">
          {isSending && onStop ? (
            <InputGroupButton
              type="button"
              size="icon-sm"
              variant="secondary"
              onClick={onStop}
              className="size-9 rounded-full"
              aria-label="Stop generating"
              title="Stop generating"
            >
              <SquareIcon className="size-3.5 fill-current" />
            </InputGroupButton>
          ) : (
            <InputGroupButton
              type="submit"
              size="icon-sm"
              variant="default"
              disabled={!canSend}
              className="size-9 rounded-full"
              aria-label="Send message"
            >
              <ArrowUpIcon />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        ChaiGPT can make mistakes. Check important info.
      </p>
    </form>
  );
}
