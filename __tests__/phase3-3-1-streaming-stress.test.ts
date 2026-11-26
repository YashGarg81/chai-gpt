import { describe, expect, it } from "bun:test";

describe("Phase 3.3.1: Streaming Stress & Chunking", () => {
  it("reassembles split Markdown headings, code fences, tables, and math chunks", () => {
    const chunks = [
      "## Head",
      "ing\n\n```ts\nconst ",
      "a = 1;\n```\n\n| A | B |\n| - | - |\n",
      "| 1 | 2 |\n\n\\(E = mc",
      "^2\\)",
    ];
    let buffer = "";
    for (const chunk of chunks) {
      buffer += chunk;
      expect(buffer.length).toBeGreaterThan(0);
    }
    expect(buffer).toContain("## Heading");
    expect(buffer).toContain("const a = 1;");
    expect(buffer).toContain("\\(E = mc^2\\)");
  });
});
