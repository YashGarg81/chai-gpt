import { describe, expect, it } from "bun:test";
import { isSafePublicUrl } from "@/features/search/utils/web-search";
import { analyzeCsvDataset, sanitizeCsvCell } from "@/features/analysis/utils/csv-analyzer";
import { getRegisteredChatTools, REGISTERED_TOOL_NAMES } from "@/features/tools/utils/tool-registry";

describe("Phase 4: Advanced AI Capabilities", () => {
  it("blocks SSRF and unsafe URLs in web search", () => {
    expect(isSafePublicUrl("https://example.com/docs")).toBe(true);
    expect(isSafePublicUrl("http://example.com/insecure")).toBe(false);
    expect(isSafePublicUrl("https://localhost:3000/api")).toBe(false);
    expect(isSafePublicUrl("https://127.0.0.1/admin")).toBe(false);
    expect(isSafePublicUrl("https://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isSafePublicUrl("https://[::1]/admin")).toBe(false);
    expect(isSafePublicUrl("https://[::ffff:127.0.0.1]/admin")).toBe(false);
    expect(isSafePublicUrl("https://172.16.0.1/internal")).toBe(false);
    expect(isSafePublicUrl("https://100.64.0.1/cgnat")).toBe(false);
    expect(isSafePublicUrl("javascript:alert(1)")).toBe(false);
  });

  it("analyzes CSV datasets deterministically and neutralizes formula injection", () => {
    const csv = [
      "name,score,=evil",
      "Alice,10,ok",
      "Bob,20,",
      "Charlie,,test",
    ].join("\n");

    const result = analyzeCsvDataset(csv);
    expect(result.rowCount).toBe(3);
    expect(result.columnCount).toBe(3);
    expect(result.columns[1]).toEqual({
      name: "score",
      type: "number",
      missingCount: 1,
      min: 10,
      max: 20,
      mean: 15,
      sum: 30,
    });
    expect(result.columns[2].name).toBe("'=evil");
    expect(sanitizeCsvCell("+cmd")).toBe("'+cmd");
  });

  it("registers only allowlisted chat tools", () => {
    const tools = getRegisteredChatTools();
    expect(Object.keys(tools)).toEqual([...REGISTERED_TOOL_NAMES]);
  });
});
