import { describe, expect, it } from "bun:test";

describe("Phase 3.3.1: Redis Concurrency & Lease Renewal", () => {
  it("prevents stale request from renewing or releasing a newer request's lock", () => {
    const locks = new Map<string, { token: string; expiresAt: number }>();
    const now = 1000;

    locks.set("chat:lock:conv_1", { token: "req_new", expiresAt: now + 60_000 });

    const renew = (key: string, token: string) => {
      const entry = locks.get(key);
      if (!entry || entry.token !== token) return 0;
      entry.expiresAt = now + 60_000;
      return 1;
    };

    const release = (key: string, token: string) => {
      const entry = locks.get(key);
      if (!entry || entry.token !== token) return 0;
      locks.delete(key);
      return 1;
    };

    expect(renew("chat:lock:conv_1", "req_stale")).toBe(0);
    expect(release("chat:lock:conv_1", "req_stale")).toBe(0);
    expect(locks.get("chat:lock:conv_1")?.token).toBe("req_new");
    expect(release("chat:lock:conv_1", "req_new")).toBe(1);
    expect(locks.has("chat:lock:conv_1")).toBe(false);
  });
});
