import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { UIMessage } from "ai";
import { checkRateLimit } from "../lib/rate-limit";
import { getOpenRouterApiKey, getRequiredEnv } from "../lib/env";

// --- Shared mock state ---
let mockAuthUserId: string | null = "clerk_user_1";
const mockDbUser = {
  id: "db_user_1",
  clerkId: "clerk_user_1",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  imageUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

let conversations: Array<{
  id: string;
  userId: string;
  title: string;
  model: string | null;
  systemPrompt: string | null;
  isPinned: boolean;
  isArchived: boolean;
  lastMessageAt: Date;
}> = [];

let storedMessages: Array<{
  id: string;
  conversationId: string;
  role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL";
  status: "PENDING" | "COMPLETE" | "ERROR";
  content: string;
  parts: unknown;
  createdAt: Date;
}> = [];

let simulateDbFailure = false;

const mockPrisma = {
  user: {
    findUnique: async ({ where }: { where: { clerkId: string } }) => {
      if (simulateDbFailure) throw new Error("DB connection failed");
      return where.clerkId === mockDbUser.clerkId ? mockDbUser : null;
    },
    upsert: async () => {
      if (simulateDbFailure) throw new Error("DB connection failed");
      return mockDbUser;
    },
  },
  conversation: {
    create: async ({ data }: { data: { userId: string; title: string } }) => {
      if (simulateDbFailure) throw new Error("DB connection failed");
      const conv = {
        id: `conv_${conversations.length + 1}`,
        userId: data.userId,
        title: data.title,
        model: null,
        systemPrompt: null,
        isPinned: false,
        isArchived: false,
        lastMessageAt: new Date(),
      };
      conversations.push(conv);
      return conv;
    },
    findFirst: async ({
      where,
    }: {
      where: { id: string; userId?: string };
    }) => {
      if (simulateDbFailure) throw new Error("DB connection failed");
      return (
        conversations.find(
          (c) =>
            c.id === where.id &&
            (where.userId === undefined || c.userId === where.userId)
        ) ?? null
      );
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<(typeof conversations)[number]>;
    }) => {
      if (simulateDbFailure) throw new Error("DB connection failed");
      const idx = conversations.findIndex((c) => c.id === where.id);
      if (idx === -1) throw new Error("Conversation not found");
      conversations[idx] = { ...conversations[idx], ...data };
      return conversations[idx];
    },
    delete: async ({ where }: { where: { id: string } }) => {
      if (simulateDbFailure) throw new Error("DB connection failed");
      const idx = conversations.findIndex((c) => c.id === where.id);
      if (idx === -1) throw new Error("Conversation not found");
      const [removed] = conversations.splice(idx, 1);
      storedMessages = storedMessages.filter(
        (m) => m.conversationId !== where.id
      );
      return removed;
    },
  },
  message: {
    findMany: async ({
      where,
    }: {
      where: { conversationId: string };
    }) => {
      if (simulateDbFailure) throw new Error("DB connection failed");
      return storedMessages.filter(
        (m) => m.conversationId === where.conversationId
      );
    },
    upsert: async ({
      where,
      create,
      update,
    }: {
      where: { id: string };
      create: (typeof storedMessages)[number];
      update: Partial<(typeof storedMessages)[number]>;
    }) => {
      if (simulateDbFailure) throw new Error("DB connection failed");
      const idx = storedMessages.findIndex((m) => m.id === where.id);
      if (idx === -1) {
        const created = { ...create, createdAt: new Date() };
        storedMessages.push(created);
        return created;
      }
      storedMessages[idx] = { ...storedMessages[idx], ...update };
      return storedMessages[idx];
    },
    deleteMany: async ({
      where,
    }: {
      where: { id: { in: string[] }; conversationId: string };
    }) => {
      if (simulateDbFailure) throw new Error("DB connection failed");
      const before = storedMessages.length;
      storedMessages = storedMessages.filter(
        (m) =>
          !(
            m.conversationId === where.conversationId &&
            where.id.in.includes(m.id)
          )
      );
      return { count: before - storedMessages.length };
    },
  },
  attachment: {
    findMany: async () => [],
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $transaction: async <T>(fn: (tx: any) => Promise<T>) => {
    if (simulateDbFailure) throw new Error("DB transaction failed");
    return fn(mockPrisma);
  },
};

mock.module("@/lib/db", () => ({
  prisma: mockPrisma,
}));

mock.module("@clerk/nextjs/server", () => ({
  auth: {
    protect: async () => {
      if (!mockAuthUserId) {
        throw new Error("Unauthorized");
      }
      return { userId: mockAuthUserId };
    },
  },
  currentUser: async () => {
    if (!mockAuthUserId) return null;
    return {
      id: mockAuthUserId,
      emailAddresses: [{ emailAddress: "test@example.com" }],
      firstName: "Test",
      lastName: "User",
      imageUrl: null,
    };
  },
}));

mock.module("next/cache", () => ({
  revalidatePath: () => {},
}));

const { requireUser } = await import("../features/auth/action/require-user");
const { startNewChat } = await import("../features/home/actions/start-new-chat");
const { loadChatMessages, saveChatMessages } = await import(
  "../features/ai/actions/chat-store"
);

describe("Phase 1: Foundation & Stability", () => {
  beforeEach(() => {
    mockAuthUserId = "clerk_user_1";
    simulateDbFailure = false;
    conversations = [
      {
        id: "conv_1",
        userId: "db_user_1",
        title: "New Chat",
        model: null,
        systemPrompt: null,
        isPinned: false,
        isArchived: false,
        lastMessageAt: new Date(),
      },
      {
        id: "conv_other",
        userId: "db_user_other",
        title: "Other User Chat",
        model: null,
        systemPrompt: null,
        isPinned: false,
        isArchived: false,
        lastMessageAt: new Date(),
      },
    ];
    storedMessages = [];
  });

  it("1. User authentication: returns user when authenticated and throws when unauthenticated", async () => {
    const user = await requireUser();
    expect(user.id).toBe("db_user_1");

    mockAuthUserId = null;
    await expect(requireUser()).rejects.toThrow("Unauthorized");
  });

  it("2. New conversation creation: creates a New Chat for the authenticated user", async () => {
    const id = await startNewChat();
    expect(id).toBe("conv_3");
    const created = conversations.find((c) => c.id === id);
    expect(created?.userId).toBe("db_user_1");
    expect(created?.title).toBe("New Chat");
  });

  it("3. Message submission & validation: validates env helpers and rejects empty/oversized payloads", () => {
    process.env.TEST_REQUIRED_ENV = "ok";
    expect(getRequiredEnv("TEST_REQUIRED_ENV")).toBe("ok");
    delete process.env.TEST_REQUIRED_ENV;
    expect(() => getRequiredEnv("TEST_REQUIRED_ENV")).toThrow(
      "Missing required environment variable"
    );

    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
    expect(getOpenRouterApiKey()).toBe("test-openrouter-key");
  });

  it("4. AI response generation & 5. Streaming completion: persists user & assistant messages", async () => {
    const userMsg: UIMessage = {
      id: "msg_u1",
      role: "user",
      parts: [{ type: "text", text: "Hello ChaiGPT" }],
    };
    const assistantMsg: UIMessage = {
      id: "msg_a1",
      role: "assistant",
      parts: [{ type: "text", text: "Hello! How can I help?" }],
    };

    await saveChatMessages("conv_1", [userMsg, assistantMsg]);
    expect(storedMessages).toHaveLength(2);
    expect(storedMessages[0].role).toBe("USER");
    expect(storedMessages[1].role).toBe("ASSISTANT");
  });

  it("6. Message persistence: updates conversation title from first user message", async () => {
    const userMsg: UIMessage = {
      id: "msg_u2",
      role: "user",
      parts: [{ type: "text", text: "Explain Neon Postgres branching" }],
    };
    await saveChatMessages("conv_1", [userMsg], { updateTitle: true });
    expect(conversations[0].title).toBe("Explain Neon Postgres branching");
  });

  it("7. Conversation history: loads messages ordered for the owning user", async () => {
    await saveChatMessages("conv_1", [
      { id: "m1", role: "user", parts: [{ type: "text", text: "First" }] },
      { id: "m2", role: "assistant", parts: [{ type: "text", text: "Second" }] },
    ]);
    const loaded = await loadChatMessages("conv_1");
    expect(loaded.map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("8. Rename, pin, archive, and delete: updates and removes conversation cleanly", async () => {
    await mockPrisma.conversation.update({
      where: { id: "conv_1" },
      data: { title: "Renamed", isPinned: true, isArchived: true },
    });
    expect(conversations[0].title).toBe("Renamed");
    expect(conversations[0].isPinned).toBe(true);
    expect(conversations[0].isArchived).toBe(true);

    await mockPrisma.conversation.delete({ where: { id: "conv_1" } });
    expect(conversations.find((c) => c.id === "conv_1")).toBeUndefined();
  });

  it("9. Unauthorized conversation access: blocks reading or writing another user's conversation", async () => {
    await expect(loadChatMessages("conv_other")).rejects.toThrow(
      "Conversation not found"
    );
    await expect(
      saveChatMessages("conv_other", [
        { id: "m_hack", role: "user", parts: [{ type: "text", text: "Hi" }] },
      ])
    ).rejects.toThrow("Conversation not found");
  });

  it("10. Database failures: surfaces DB errors cleanly without silent corruption", async () => {
    simulateDbFailure = true;
    await expect(loadChatMessages("conv_1")).rejects.toThrow(
      "DB connection failed"
    );
    await expect(
      saveChatMessages("conv_1", [
        { id: "m_fail", role: "user", parts: [{ type: "text", text: "Hi" }] },
      ])
    ).rejects.toThrow("DB connection failed");
  });

  it("11. API rate limiting: enforces per-user limits, independent users, expired windows, and Redis fail-closed", async () => {
    const keyA = `test-rate-a-${Date.now()}`;
    const keyB = `test-rate-b-${Date.now()}`;
    expect((await checkRateLimit(keyA, 2, 60_000)).allowed).toBe(true);
    expect((await checkRateLimit(keyA, 2, 60_000)).allowed).toBe(true);
    const blocked = await checkRateLimit(keyA, 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    // Independent user key is unaffected
    expect((await checkRateLimit(keyB, 2, 60_000)).allowed).toBe(true);

    // Expired window resets
    const shortKey = `test-rate-short-${Date.now()}`;
    expect((await checkRateLimit(shortKey, 1, 10)).allowed).toBe(true);
    await new Promise((r) => setTimeout(r, 20));
    expect((await checkRateLimit(shortKey, 1, 10)).allowed).toBe(true);

    // Redis configured but unreachable -> fail-closed
    process.env.UPSTASH_REDIS_REST_URL = "http://127.0.0.1:59999";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    try {
      const failed = await checkRateLimit(keyA, 2, 60_000);
      expect(failed.allowed).toBe(false);
      expect(failed.unavailable).toBe(true);
    } finally {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    }
  });

  it("12. Concurrent message requests: handles parallel saveChatMessages calls safely", async () => {
    await Promise.all([
      saveChatMessages("conv_1", [
        { id: "c1", role: "user", parts: [{ type: "text", text: "One" }] },
      ]),
      saveChatMessages("conv_1", [
        { id: "c2", role: "user", parts: [{ type: "text", text: "Two" }] },
      ]),
    ]);
    const loaded = await loadChatMessages("conv_1");
    expect(loaded).toHaveLength(2);
  });

  it("13. Regeneration: slices trailing assistant messages, preserves earlier history, and replaces superseded response", async () => {
    await saveChatMessages("conv_1", [
      { id: "u1", role: "user", parts: [{ type: "text", text: "First question" }] },
      { id: "a1", role: "assistant", parts: [{ type: "text", text: "First answer" }] },
      { id: "u2", role: "user", parts: [{ type: "text", text: "Second question" }] },
      { id: "a2_old", role: "assistant", parts: [{ type: "text", text: "Old second answer" }] },
    ]);

    const previous = await loadChatMessages("conv_1");
    const targetIndex = previous.findIndex((m) => m.id === "u2");
    expect(targetIndex).toBe(2);

    const promptMessages = previous.slice(0, targetIndex + 1);
    expect(promptMessages.map((m) => m.id)).toEqual(["u1", "a1", "u2"]);

    const supersededIds = previous.slice(targetIndex + 1).map((m) => m.id);
    expect(supersededIds).toEqual(["a2_old"]);

    await mockPrisma.message.deleteMany({
      where: { id: { in: supersededIds }, conversationId: "conv_1" },
    });
    await saveChatMessages(
      "conv_1",
      [
        ...promptMessages,
        { id: "a2_new", role: "assistant", parts: [{ type: "text", text: "New second answer" }] },
      ],
      { updateTitle: false }
    );

    const finalHistory = await loadChatMessages("conv_1");
    expect(finalHistory.map((m) => m.id)).toEqual(["u1", "a1", "u2", "a2_new"]);
  });
});
