"use client";

import { useEffect, useState } from "react";
import { Lock, Share2, AlertCircle } from "lucide-react";
import { Streamdown } from "streamdown";

interface SharedMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  attachments?: Array<{
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  }>;
}

interface SharedSnapshot {
  title: string;
  branchId: string;
  messages: SharedMessage[];
}

export function SharedConversationView({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<SharedSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/share/${encodeURIComponent(token)}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "This shared conversation is unavailable.");
          setLoading(false);
          return;
        }
        if (data.requiresPassword) {
          setRequiresPassword(true);
          setLoading(false);
          return;
        }
        setSnapshot(data.snapshot);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Failed to load shared conversation.");
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    const res = await fetch(`/api/share/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPasswordError(data.error || "Incorrect password");
      return;
    }
    setRequiresPassword(false);
    setSnapshot(data.snapshot);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading shared conversation...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h1 className="text-xl font-semibold">Unavailable</h1>
        <p className="max-w-md text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <form
          onSubmit={(e) => void handleUnlock(e)}
          className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-6 shadow-sm"
        >
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Lock className="h-5 w-5" />
            <span>Password Protected</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Enter the password to view this shared conversation.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
          {passwordError && (
            <p className="text-xs text-destructive">{passwordError}</p>
          )}
          <button
            type="submit"
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  if (!snapshot) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card/50">
        <div className="mx-auto flex max-w-[880px] items-center justify-between px-5 py-4 md:px-8">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Share2 className="h-3.5 w-3.5" />
              <span>Read-only shared snapshot</span>
            </div>
            <h1 className="mt-1 text-lg font-semibold">{snapshot.title}</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[880px] space-y-6 px-5 py-8 md:px-8">
        {snapshot.messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages in this snapshot.</p>
        ) : (
          snapshot.messages.map((msg) => (
            <div
              key={msg.id}
              className={
                msg.role === "user"
                  ? "ml-auto max-w-[85%] rounded-2xl bg-muted px-4 py-3 text-sm"
                  : "space-y-2 text-sm"
              }
            >
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                {msg.role === "user" ? "User" : "Assistant"}
                {msg.createdAt ? ` · ${new Date(msg.createdAt).toLocaleString()}` : ""}
              </div>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <Streamdown>{msg.content}</Streamdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {msg.attachments.map((att, idx) => (
                    <span
                      key={idx}
                      className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground"
                    >
                      {att.originalName} ({att.sizeBytes} B)
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
