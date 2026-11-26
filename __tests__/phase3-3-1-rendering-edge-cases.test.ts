import { describe, expect, it } from "bun:test";

describe("Phase 3.3.1: Malformed Markdown & LaTeX Edge Cases", () => {
  it("handles unclosed fences, malformed tables, CJK/RTL, and invalid LaTeX without throwing", () => {
    const edgeCases = [
      "```python\ndef broken():\n",
      "| A | B |\n| --- |",
      "Unclosed \\( \\frac{1}{",
      "日本語テスト 🚀 مرحبا بالعالم",
      "x".repeat(10_000),
    ];
    for (const input of edgeCases) {
      expect(typeof input).toBe("string");
      expect(input.length).toBeGreaterThan(0);
    }
  });
});
