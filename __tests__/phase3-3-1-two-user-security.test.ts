import { describe, expect, it } from "bun:test";

type RecordItem = { id: string; userId: string; title: string; deletedAt: Date | null };

describe("Phase 3.3.1: Two-User Ownership & IDOR Isolation", () => {
  const userA = { id: "user_A" };
  const userB = { id: "user_B" };
  const convA: RecordItem = { id: "conv_A", userId: "user_A", title: "Secret A", deletedAt: null };

  function assertOwns(conv: RecordItem | undefined, actorId: string) {
    if (!conv || conv.userId !== actorId || conv.deletedAt !== null) {
      throw new Error("Conversation not found");
    }
    return conv;
  }

  it("allows User A to access their own conversation and denies User B", () => {
    expect(assertOwns(convA, userA.id).title).toBe("Secret A");
    expect(() => assertOwns(convA, userB.id)).toThrow("Conversation not found");
  });

  it("isolates search results by userId", () => {
    const all = [
      convA,
      { id: "conv_B", userId: "user_B", title: "Public B", deletedAt: null },
    ];
    const searchForUser = (actorId: string, q: string) =>
      all.filter(
        (c) =>
          c.userId === actorId &&
          c.deletedAt === null &&
          c.title.toLowerCase().includes(q.toLowerCase())
      );

    expect(searchForUser(userB.id, "Secret")).toHaveLength(0);
    expect(searchForUser(userA.id, "Secret")).toHaveLength(1);
  });
});
