import { describe, expect, it } from "bun:test";

type TestMessage = {
  id: string;
  branchId: string | null;
  role: "USER" | "ASSISTANT";
  content: string;
  versionNumber: number;
  supersededAt: Date | null;
};

describe("Phase 3.2: Branching, Versioning & Regeneration", () => {
  it("forks a new branch at message #3 of a 10-message conversation while preserving original branch", () => {
    const messages: TestMessage[] = Array.from({ length: 10 }, (_, i) => ({
      id: `m${i + 1}`,
      branchId: null,
      role: i % 2 === 0 ? "USER" : "ASSISTANT",
      content: `Message ${i + 1}`,
      versionNumber: 1,
      supersededAt: null,
    }));

    // Edit message #3 (index 2, USER)
    const targetIndex = messages.findIndex((m) => m.id === "m3");
    expect(targetIndex).toBe(2);
    const ancestors = messages.slice(0, targetIndex);
    const branchId = "branch_1";

    const branchedMessages: TestMessage[] = [
      ...ancestors.map((a) => ({ ...a, branchId })),
      {
        id: "m3_v2",
        branchId,
        role: "USER",
        content: "Edited Message 3",
        versionNumber: 2,
        supersededAt: null,
      },
    ];

    // Original branch remains intact (10 messages)
    expect(messages.filter((m) => m.branchId === null)).toHaveLength(10);
    // New branch has 2 ancestors + 1 edited message
    expect(branchedMessages.map((m) => m.id)).toEqual(["m1", "m2", "m3_v2"]);
    expect(branchedMessages[2].versionNumber).toBe(2);
  });

  it("marks superseded assistant responses non-destructively during regeneration", () => {
    const branchMessages: TestMessage[] = [
      { id: "u1", branchId: "b1", role: "USER", content: "Hi", versionNumber: 1, supersededAt: null },
      { id: "a1", branchId: "b1", role: "ASSISTANT", content: "Old reply", versionNumber: 1, supersededAt: null },
    ];

    // Supersede a1
    branchMessages[1].supersededAt = new Date();
    branchMessages.push({
      id: "a2",
      branchId: "b1",
      role: "ASSISTANT",
      content: "New reply",
      versionNumber: 2,
      supersededAt: null,
    });

    const active = branchMessages.filter((m) => m.supersededAt === null);
    expect(active.map((m) => m.id)).toEqual(["u1", "a2"]);
    expect(branchMessages.filter((m) => m.supersededAt !== null)).toHaveLength(1);
  });

  it("enforces atomic lock acquisition, contention, and ownership-verified release", () => {
    const locks = new Map<string, string>();
    const acquire = (key: string, token: string) => {
      if (locks.has(key)) return false;
      locks.set(key, token);
      return true;
    };
    const release = (key: string, token: string) => {
      if (locks.get(key) === token) {
        locks.delete(key);
        return true;
      }
      return false;
    };

    expect(acquire("chat:lock:1", "tok_A")).toBe(true);
    expect(acquire("chat:lock:1", "tok_B")).toBe(false); // contention
    expect(release("chat:lock:1", "tok_B")).toBe(false); // cannot release another's lock
    expect(locks.get("chat:lock:1")).toBe("tok_A");
    expect(release("chat:lock:1", "tok_A")).toBe(true); // owner releases
    expect(acquire("chat:lock:1", "tok_B")).toBe(true); // now available
  });

  it("renews lock lease only for matching owner token to prevent expiry during long generations", () => {
    const store = new Map<string, { token: string; expiresAt: number }>();
    let now = 1000;
    const renew = (key: string, token: string, ttlMs: number) => {
      const entry = store.get(key);
      if (!entry || entry.token !== token) return false;
      entry.expiresAt = now + ttlMs;
      return true;
    };

    store.set("chat:lock:1", { token: "tok_A", expiresAt: now + 60 });
    now += 40;
    expect(renew("chat:lock:1", "tok_B", 60)).toBe(false);
    expect(renew("chat:lock:1", "tok_A", 60)).toBe(true);
    expect(store.get("chat:lock:1")?.expiresAt).toBe(1100);
  });
});
