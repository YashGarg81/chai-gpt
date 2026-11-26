import { describe, expect, it } from "bun:test";
import { deriveFallbackTitle } from "../features/ai/utils/title";

describe("Phase 3.1: Automatic Title Generation (10+ examples)", () => {
  const examples: Array<[string, string]> = [
    ["   ", "New Chat"],
    ["Hello", "Hello"],
    ["How does Neon Postgres branching work?", "How does Neon Postgres branching work?"],
    [
      "Explain   the   differences   between   SSR   and   RSC   in   Next.js   16",
      "Explain the differences between SSR and RSC in",
    ],
    [
      "Write a TypeScript debounce hook with cleanup and unit tests for React 19",
      "Write a TypeScript debounce hook with cleanup",
    ],
    [
      "Help me debug a slow SQL query on a 10M row table with missing composite index",
      "Help me debug a slow SQL query on a 10M row",
    ],
    ["Summarize this article about distributed Redis rate limiting", "Summarize this article about distributed Redis"],
    ["Create a weekly meal prep plan for high protein", "Create a weekly meal prep plan for high protein"],
    ["What is the capital of France?", "What is the capital of France?"],
    ["Fix my Docker Compose networking issue between api and db", "Fix my Docker Compose networking issue between"],
    ["Compare Drizzle ORM vs Prisma 7 for serverless Postgres", "Compare Drizzle ORM vs Prisma 7 for serverless"],
  ];

  it("derives clean deterministic fallback titles for 11 diverse first messages", () => {
    for (const [input, expected] of examples) {
      const result = deriveFallbackTitle(input);
      expect(result).toBe(expected);
      expect(result.length).toBeLessThanOrEqual(48);
    }
  });
});
