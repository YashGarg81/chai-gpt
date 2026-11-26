"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import {
  MAX_SYSTEM_PROMPT_CHARS,
  SUPPORTED_CHAT_MODELS,
} from "../utils/chat-controls";

interface ChatControlsDialogProps {
  conversationId: string;
  open: boolean;
  onClose: () => void;
  onSaved?: (model: string) => void;
}

export function ChatControlsDialog({
  conversationId,
  open,
  onClose,
  onSaved,
}: ChatControlsDialogProps) {
  const [model, setModel] = useState<string>("openrouter/free");
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/conversations/${encodeURIComponent(conversationId)}/settings`
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) {
          setModel(data.model || "openrouter/free");
          setSystemPrompt(data.systemPrompt || "");
        }
      } catch {
        if (!cancelled) setError("Failed to load conversation settings");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [conversationId, open]);

  if (!open) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/conversations/${encodeURIComponent(conversationId)}/settings`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, systemPrompt }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save settings");
        return;
      }
      toast.success("Chat controls updated");
      onSaved?.(data.model || "openrouter/free");
      onClose();
    } catch {
      setError("Network error while saving settings");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Chat Controls"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <form
        onSubmit={(e) => void handleSave(e)}
        className="w-full max-w-md rounded-xl border bg-background p-5 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            <h2 className="text-base font-semibold">Chat Controls</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close chat controls"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm">
          <div>
            <label htmlFor="chat-model-select" className="mb-1.5 block font-medium">
              Model
            </label>
            <select
              id="chat-model-select"
              value={model}
              disabled={isLoading || isSaving}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {SUPPORTED_CHAT_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="chat-system-prompt" className="font-medium">
                Custom System Instructions
              </label>
              <span className="text-xs text-muted-foreground">
                {systemPrompt.length} / {MAX_SYSTEM_PROMPT_CHARS}
              </span>
            </div>
            <textarea
              id="chat-system-prompt"
              rows={4}
              maxLength={MAX_SYSTEM_PROMPT_CHARS}
              disabled={isLoading || isSaving}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Optional instructions for how ChaiGPT should respond in this conversation..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || isSaving}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
