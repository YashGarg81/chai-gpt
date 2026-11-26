"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface ExportDialogProps {
  conversationId: string;
  open: boolean;
  onClose: () => void;
}

export function ExportDialog({ conversationId, open, onClose }: ExportDialogProps) {
  const [format, setFormat] = useState<"md" | "pdf" | "json" | "txt">("md");
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleExport() {
    setIsExporting(true);
    const params = new URLSearchParams({
      format,
      includeTimestamps: String(includeTimestamps),
      includeAttachments: String(includeAttachments),
      includeMetadata: String(includeMetadata),
    });
    window.location.href = `/api/conversations/${encodeURIComponent(conversationId)}/export?${params.toString()}`;
    setTimeout(() => {
      setIsExporting(false);
      onClose();
    }, 400);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Export Conversation"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border bg-background p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Export Conversation</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close export dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm">
          <div>
            <label className="mb-1.5 block font-medium">Format</label>
            <div className="grid grid-cols-4 gap-2">
              {(["md", "pdf", "json", "txt"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium uppercase ${
                    format === f
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeTimestamps}
                onChange={(e) => setIncludeTimestamps(e.target.checked)}
              />
              <span>Include timestamps</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeAttachments}
                onChange={(e) => setIncludeAttachments(e.target.checked)}
              />
              <span>Include attachment references</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
              />
              <span>Include conversation metadata</span>
            </label>
          </div>
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
            type="button"
            disabled={isExporting}
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>{isExporting ? "Exporting..." : "Download"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
