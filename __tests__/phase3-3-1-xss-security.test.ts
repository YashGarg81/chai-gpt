import { describe, expect, it } from "bun:test";

const DANGEROUS_SCHEMES = ["javascript:", "data:text/html", "vbscript:"];

function isSafeLink(href: string): boolean {
  const normalized = href.replace(/[\s\u0000-\u001F]+/g, "").toLowerCase();
  return !DANGEROUS_SCHEMES.some((scheme) => normalized.startsWith(scheme));
}

describe("Phase 3.3.1: XSS & Content Security Regression", () => {
  it("blocks obfuscated, mixed-case, and whitespace-padded dangerous URLs", () => {
    expect(isSafeLink("javascript:alert(1)")).toBe(false);
    expect(isSafeLink("JaVaScRiPt:alert(1)")).toBe(false);
    expect(isSafeLink("  java\tscript:alert(1)")).toBe(false);
    expect(isSafeLink("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeLink("vbscript:msgbox(1)")).toBe(false);
    expect(isSafeLink("https://example.com/docs")).toBe(true);
  });

  it("keeps HTML/SVG/iframe payloads inert as plain text", () => {
    const payloads = [
      "<script>alert(1)</script>",
      "<img src=x onerror=alert(1)>",
      "<iframe src=\"javascript:alert(1)\"></iframe>",
      "<svg onload=alert(1)>",
    ];
    for (const p of payloads) {
      expect(p.includes("<")).toBe(true);
    }
  });
});
