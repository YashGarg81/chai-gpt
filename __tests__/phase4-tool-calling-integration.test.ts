import { describe, expect, it } from "bun:test";
import { getRegisteredChatTools } from "@/features/tools/utils/tool-registry";
import { safePinnedHttpsGetJson } from "@/features/search/utils/web-search";

describe("Phase 4: Tool-Calling Integration", () => {
  it("executes web_search tool with SSRF filtering and safe error fallback", async () => {
    const tools = getRegisteredChatTools();
    const origFetch = globalThis.fetch;

    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          Heading: "TypeScript 5",
          AbstractText: "TypeScript 5.0 release notes.",
          AbstractURL: "https://www.typescriptlang.org/docs/",
          RelatedTopics: [
            { Text: "Unsafe local", FirstURL: "http://127.0.0.1/admin" },
          ],
        }),
        { status: 200 }
      )) as unknown as typeof fetch;

    try {
      const result = (await tools.web_search.execute!(
        { query: "TypeScript 5", maxResults: 3 },
        { toolCallId: "tc_1", messages: [], context: {} }
      )) as { results: Array<{ domain: string; url: string }> };
      expect(result.results.length).toBe(1);
      expect(result.results[0].domain).toBe("www.typescriptlang.org");
      expect(result.results[0].url).toBe("https://www.typescriptlang.org/docs/");
    } finally {
      globalThis.fetch = origFetch;
    }

    const empty = (await tools.web_search.execute!(
      { query: "   " },
      { toolCallId: "tc_2", messages: [], context: {} }
    )) as { results: unknown[] };
    expect(empty.results).toEqual([]);
  });

  it("executes analyze_csv tool deterministically and rejects empty input", async () => {
    const tools = getRegisteredChatTools();
    const res = await tools.analyze_csv.execute!(
      { csvText: "item,price\nA,10\nB,20\nC," },
      { toolCallId: "tc_3", messages: [], context: {} }
    );
    expect("rowCount" in res && res.rowCount).toBe(3);
    if ("columns" in res) {
      expect(res.columns[1].mean).toBe(15);
      expect(res.columns[1].sum).toBe(30);
      expect(res.columns[1].missingCount).toBe(1);
    }

    const err = await tools.analyze_csv.execute!(
      { csvText: "" },
      { toolCallId: "tc_4", messages: [], context: {} }
    );
    expect("error" in err).toBe(true);

    const unauthAtt = await tools.analyze_csv.execute!(
      { attachmentId: "att_other_user" },
      { toolCallId: "tc_5", messages: [], context: {} }
    );
    expect("error" in unauthAtt && unauthAtt.error).toBe("Unauthorized attachment context");
  });

  it("rejects private IPv4/IPv6 destinations at the safePinnedHttpsGetJson transport layer", async () => {
    await expect(safePinnedHttpsGetJson("https://127.0.0.1/secret")).rejects.toThrow("Unsafe URL rejected");
    await expect(safePinnedHttpsGetJson("https://[::1]/secret")).rejects.toThrow("Unsafe URL rejected");
    await expect(safePinnedHttpsGetJson("https://169.254.169.254/latest/meta-data")).rejects.toThrow("Unsafe URL rejected");
  });
});
