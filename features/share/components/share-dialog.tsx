"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Link2, Trash2, X } from "lucide-react";

interface ShareItem {
  id: string;
  title: string;
  branchId: string;
  hasPassword: boolean;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface ShareDialogProps {
  conversationId: string;
  open: boolean;
  onClose: () => void;
}

export function ShareDialog({ conversationId, open, onClose }: ShareDialogProps) {
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState("");
  const [expiresInHours, setExpiresInHours] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
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
      const res = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/shares`);
      if (!res.ok || cancelled) return;
      const data = await res.json();
      if (!cancelled) setShares(data.shares ?? []);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [conversationId, open]);

  if (!open) return null;

  async function handleCreate() {
    setIsCreating(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/conversations/${encodeURIComponent(conversationId)}/shares`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: password.trim() || null,
            expiresInHours: expiresInHours ? Number(expiresInHours) : null,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create share link");
        return;
      }
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setCreatedUrl(fullUrl);
      setPassword("");
      setExpiresInHours("");
      const listRes = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/shares`);
      if (listRes.ok) {
        const listData = await listRes.json();
        setShares(listData.shares ?? []);
      }
    } catch {
      setError("Network error while creating share link");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRevoke(shareId: string) {
    const res = await fetch(`/api/shares/${encodeURIComponent(shareId)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setShares((prev) =>
        prev.map((s) =>
          s.id === shareId ? { ...s, revokedAt: new Date().toISOString() } : s
        )
      );
    }
  }

  async function handleCopy() {
    if (!createdUrl) return;
    await navigator.clipboard.writeText(createdUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Share Conversation"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border bg-background p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Share Conversation</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close share dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Optional password"
              className="rounded-md border bg-background px-3 py-1.5 text-xs"
            />
            <select
              value={expiresInHours}
              onChange={(e) => setExpiresInHours(e.target.value)}
              className="rounded-md border bg-background px-3 py-1.5 text-xs"
            >
              <option value="">No expiration</option>
              <option value="24">Expires in 24h</option>
              <option value="168">Expires in 7 days</option>
            </select>
          </div>

          <button
            type="button"
            disabled={isCreating}
            onClick={() => void handleCreate()}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <Link2 className="h-4 w-4" />
            <span>{isCreating ? "Creating link..." : "Create Share Link"}</span>
          </button>

          {error && <p className="text-xs text-destructive">{error}</p>}

          {createdUrl && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-2">
              <input
                type="text"
                readOnly
                value={createdUrl}
                className="w-full bg-transparent text-xs outline-none"
              />
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="rounded p-1 hover:bg-muted"
                aria-label="Copy share link"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          )}

          {shares.length > 0 && (
            <div className="max-h-40 space-y-1.5 overflow-y-auto pt-2">
              <p className="text-xs font-medium text-muted-foreground">Existing Shares</p>
              {shares.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-md border px-2.5 py-1.5 text-xs"
                >
                  <div className="truncate">
                    <span className="font-medium">{s.branchId}</span>
                    {s.hasPassword && " · 🔒"}
                    {s.revokedAt ? " · Revoked" : " · Active"}
                  </div>
                  {!s.revokedAt && (
                    <button
                      type="button"
                      onClick={() => void handleRevoke(s.id)}
                      className="rounded p-1 text-destructive hover:bg-muted"
                      aria-label="Revoke share"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
