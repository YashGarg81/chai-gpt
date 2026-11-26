import { describe, expect, it } from "bun:test";
import { createStorageProvider, createStorageKey } from "@/lib/storage";
import { retrieveRelevantHistory } from "@/features/context/utils/retrieval";
import { calculateTokenBudget } from "@/features/context/utils/token-budget";
import { formatExportMarkdown, formatExportPdf } from "@/features/export/utils/formatters";

describe("Phase 3.8: Storage Hardening & Performance Benchmarks", () => {
  it("enforces S3 configuration when STORAGE_BACKEND=s3 without silent local fallback", () => {
    const prevBackend = process.env.STORAGE_BACKEND;
    const prevBucket = process.env.S3_BUCKET;
    process.env.STORAGE_BACKEND = "s3";
    delete process.env.S3_BUCKET;

    expect(() => createStorageProvider()).toThrow("STORAGE_BACKEND=s3 requires");

    if (prevBackend !== undefined) process.env.STORAGE_BACKEND = prevBackend;
    else delete process.env.STORAGE_BACKEND;
    if (prevBucket !== undefined) process.env.S3_BUCKET = prevBucket;
  });

  it("generates safe non-guessable storage keys", () => {
    const key = createStorageKey("user_1", "conv_1", "PDF");
    expect(key).toMatch(/^user_1\/conv_1\/[0-9a-f-]+\.pdf$/);
  });

  it("benchmarks token budget, historical retrieval, and export generation", async () => {
    const messages80 = Array.from({ length: 80 }, (_, i) => ({
      id: `m_${i}`,
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      text: `Message ${i}: Discussing PostgreSQL indexing, Redis locks, and deployment port 8443.`,
    }));

    const t0 = performance.now();
    const budget = calculateTokenBudget({
      modelId: "openrouter/free",
      systemText: "You are ChaiGpt.",
      currentUserText: "What deployment port did we choose?",
      hasSummary: true,
      hasRetrieval: true,
    });
    const retrieved = retrieveRelevantHistory({
      query: "What deployment port did we choose?",
      olderMessages: messages80,
      retrievalBudgetTokens: budget.retrievalTokens,
    });
    const retrievalMs = performance.now() - t0;
    expect(retrieved.length).toBeGreaterThan(0);
    expect(retrievalMs).toBeLessThan(100);

    const t1 = performance.now();
    const md = formatExportMarkdown(
      {
        schemaVersion: "1.0",
        exportedAt: new Date().toISOString(),
        conversation: {
          id: "bench_conv",
          title: "Benchmark Conversation",
          createdAt: new Date().toISOString(),
          branchId: "main",
        },
        messages: messages80.slice(0, 60).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.text,
          createdAt: new Date().toISOString(),
        })),
      },
      { includeTimestamps: true, includeAttachments: true, includeMetadata: true }
    );
    const mdMs = performance.now() - t1;
    expect(md.length).toBeGreaterThan(1000);
    expect(mdMs).toBeLessThan(100);

    const t2 = performance.now();
    const pdf = await formatExportPdf(
      {
        schemaVersion: "1.0",
        exportedAt: new Date().toISOString(),
        conversation: {
          id: "bench_conv",
          title: "Benchmark Conversation",
          createdAt: new Date().toISOString(),
          branchId: "main",
        },
        messages: messages80.slice(0, 30).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.text,
          createdAt: new Date().toISOString(),
        })),
      },
      { includeTimestamps: true, includeAttachments: true, includeMetadata: true }
    );
    const pdfMs = performance.now() - t2;
    expect(pdf.byteLength).toBeGreaterThan(1000);
    expect(pdfMs).toBeLessThan(1000);
  });

  it("supports mocked S3CompatibleStorage put/get/delete and error handling", async () => {
    const prev = {
      STORAGE_BACKEND: process.env.STORAGE_BACKEND,
      S3_ENDPOINT: process.env.S3_ENDPOINT,
      S3_BUCKET: process.env.S3_BUCKET,
      S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
      S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    };

    process.env.STORAGE_BACKEND = "s3";
    process.env.S3_ENDPOINT = "https://s3.example.test";
    process.env.S3_BUCKET = "chaigpt-private";
    process.env.S3_ACCESS_KEY_ID = "test-key";
    process.env.S3_SECRET_ACCESS_KEY = "test-secret";

    const origFetch = globalThis.fetch;
    const store = new Map<string, Uint8Array>();

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.includes("forbidden")) {
        return new Response("Access Denied", { status: 403 });
      }
      if (method === "PUT") {
        store.set(url, new Uint8Array(init?.body as Uint8Array));
        return new Response(null, { status: 200 });
      }
      if (method === "GET") {
        const data = store.get(url);
        if (!data) return new Response("Not Found", { status: 404 });
        return new Response(new Uint8Array(data), { status: 200 });
      }
      if (method === "DELETE") {
        store.delete(url);
        return new Response(null, { status: 204 });
      }
      return new Response(null, { status: 400 });
    }) as typeof fetch;

    try {
      const s3 = createStorageProvider();
      await s3.putObject("u1/c1/file.txt", Buffer.from("hello-s3"));
      const got = await s3.getObject("u1/c1/file.txt");
      expect(got.toString("utf8")).toBe("hello-s3");
      await s3.deleteObject("u1/c1/file.txt");
      await expect(s3.getObject("u1/c1/file.txt")).rejects.toThrow("404");
      await expect(s3.getObject("u1/c1/forbidden.txt")).rejects.toThrow("403");
    } finally {
      globalThis.fetch = origFetch;
      Object.entries(prev).forEach(([k, v]) => {
        if (v !== undefined) process.env[k] = v;
        else delete process.env[k];
      });
    }
  });

  it("measures retrieval latency at 20, 100, and 500 messages", () => {
    for (const count of [20, 100, 500]) {
      const msgs = Array.from({ length: count }, (_, i) => ({
        id: `m_${i}`,
        role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
        text: `Turn ${i}: PostgreSQL Neon Prisma Redis deployment port 8443.`,
      }));
      const t0 = performance.now();
      const res = retrieveRelevantHistory({
        query: "deployment port 8443",
        olderMessages: msgs,
        retrievalBudgetTokens: 1500,
      });
      const elapsed = performance.now() - t0;
      expect(res.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(150);
    }
  });
});
