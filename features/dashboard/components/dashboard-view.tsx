"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { SignOutButton } from "@clerk/nextjs";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  MessageSquare,
  Paperclip,
  Save,
  Settings,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { SUPPORTED_CHAT_MODELS } from "@/features/conversation/utils/chat-controls";
import type { DashboardSummary } from "../actions/dashboard-actions";

type TabId = "overview" | "profile" | "usage" | "account";

export function DashboardView({ initialData }: { initialData: DashboardSummary }) {
  const { setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [firstName, setFirstName] = useState(initialData.profile.firstName ?? "");
  const [lastName, setLastName] = useState(initialData.profile.lastName ?? "");
  const [bio, setBio] = useState(initialData.profile.bio ?? "");
  const [defaultModel, setDefaultModel] = useState(
    initialData.profile.defaultModel ?? "openrouter/free"
  );
  const [themePreference, setThemePreference] = useState(
    initialData.profile.themePreference || "system"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          bio,
          defaultModel,
          themePreference,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save profile");
        return;
      }
      setTheme(themePreference);
      toast.success("Profile & preferences saved");
    } catch {
      setError("Network error while saving profile");
    } finally {
      setIsSaving(false);
    }
  }

  const displayName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    initialData.profile.email ||
    "ChaiGPT User";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card/50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Chat</span>
            </Link>
            <h1 className="text-lg font-semibold">Dashboard</h1>
          </div>
          <span className="text-xs text-muted-foreground">{displayName}</span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-6 md:px-8">
        <nav aria-label="Dashboard sections" className="mb-6 flex flex-wrap gap-2 border-b pb-3">
          {(
            [
              { id: "overview", label: "Overview", icon: Activity },
              { id: "profile", label: "Profile & Preferences", icon: UserIcon },
              { id: "usage", label: "Usage & Activity", icon: BarChart3 },
              { id: "account", label: "Account", icon: Settings },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                activeTab === id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-5">
              <h2 className="text-base font-semibold">Welcome back, {displayName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {bio || "Manage your conversations, AI preferences, and account insights."}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  <span>Total Conversations</span>
                </div>
                <p className="mt-2 text-2xl font-bold">{initialData.stats.totalConversations}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <span>Total Messages</span>
                </div>
                <p className="mt-2 text-2xl font-bold">{initialData.stats.totalMessages}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Paperclip className="h-4 w-4" />
                  <span>Attachments</span>
                </div>
                <p className="mt-2 text-2xl font-bold">{initialData.stats.totalAttachments}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  <span>Active (7 Days)</span>
                </div>
                <p className="mt-2 text-2xl font-bold">{initialData.stats.activeLast7Days}</p>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold">Recent Conversations</h3>
              {initialData.recentConversations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No conversations yet. Start a new chat to see your activity here.
                </p>
              ) : (
                <ul className="divide-y">
                  {initialData.recentConversations.map((c) => (
                    <li key={c.id} className="flex items-center justify-between py-2.5 text-sm">
                      <Link href={`/c/${c.id}`} className="truncate font-medium hover:underline">
                        {c.title}
                      </Link>
                      <span className="ml-4 shrink-0 text-xs text-muted-foreground">
                        {new Date(c.lastMessageAt).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <form
            onSubmit={(e) => void handleSaveProfile(e)}
            className="max-w-xl space-y-4 rounded-xl border bg-card p-5 text-sm"
          >
            <h2 className="text-base font-semibold">Profile & Preferences</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="dash-first-name" className="mb-1 block font-medium">
                  First Name
                </label>
                <input
                  id="dash-first-name"
                  type="text"
                  maxLength={60}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="dash-last-name" className="mb-1 block font-medium">
                  Last Name
                </label>
                <input
                  id="dash-last-name"
                  type="text"
                  maxLength={60}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label htmlFor="dash-bio" className="mb-1 block font-medium">
                Bio
              </label>
              <textarea
                id="dash-bio"
                rows={3}
                maxLength={500}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell ChaiGPT a bit about yourself..."
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="dash-default-model" className="mb-1 block font-medium">
                  Default AI Model
                </label>
                <select
                  id="dash-default-model"
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2"
                >
                  {SUPPORTED_CHAT_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="dash-theme" className="mb-1 block font-medium">
                  Theme
                </label>
                <select
                  id="dash-theme"
                  value={themePreference}
                  onChange={(e) => setThemePreference(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2"
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? "Saving..." : "Save Changes"}</span>
            </button>
          </form>
        )}

        {activeTab === "usage" && (
          <div className="space-y-4 rounded-xl border bg-card p-5 text-sm">
            <h2 className="text-base font-semibold">Model Usage Distribution</h2>
            {initialData.modelDistribution.length === 0 ? (
              <p className="text-muted-foreground">No conversation data yet.</p>
            ) : (
              <ul className="space-y-2">
                {initialData.modelDistribution.map((item) => (
                  <li
                    key={item.model}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <span className="font-mono text-xs">{item.model}</span>
                    <span className="font-semibold">{item.count} conversations</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">
              Note: Token counts and billing costs are not stored in the database and are therefore not displayed.
            </p>
          </div>
        )}

        {activeTab === "account" && (
          <div className="max-w-xl space-y-4 rounded-xl border bg-card p-5 text-sm">
            <h2 className="text-base font-semibold">Account Information</h2>
            <div className="space-y-2">
              <p>
                <span className="text-muted-foreground">Email: </span>
                <span className="font-medium">{initialData.profile.email || "Not set"}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Member since: </span>
                <span className="font-medium">
                  {new Date(initialData.profile.createdAt).toLocaleDateString()}
                </span>
              </p>
            </div>
            <SignOutButton>
              <button
                type="button"
                className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
              >
                Sign out
              </button>
            </SignOutButton>
          </div>
        )}
      </div>
    </div>
  );
}
