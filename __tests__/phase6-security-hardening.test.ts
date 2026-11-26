import { describe, expect, it } from "bun:test";
import katex from "katex";
import nextConfig from "../next.config";
import { validateProfileUpdate } from "../features/dashboard/utils/profile-validation";

describe("Phase 6: Security Hardening", () => {
  it("configures standard security headers in next.config.ts", async () => {
    expect(typeof nextConfig.headers).toBe("function");
    const rules = await nextConfig.headers!();
    expect(rules.length).toBeGreaterThan(0);
    const headerMap = new Map(rules[0].headers.map((h) => [h.key, h.value]));
    expect(headerMap.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headerMap.get("X-Frame-Options")).toBe("DENY");
    expect(headerMap.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headerMap.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
    expect(headerMap.get("X-DNS-Prefetch-Control")).toBe("off");
  });

  it("ignores prototype pollution and protected identity keys in profile updates", () => {
    const payload = JSON.parse(
      '{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"id":"x","clerkId":"y","email":"z@example.com","role":"admin","bio":"Safe"}'
    );
    const res = validateProfileUpdate(payload);
    expect(res.valid).toBe(true);
    expect(res.data?.bio).toBe("Safe");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect("id" in (res.data ?? {})).toBe(false);
    expect("clerkId" in (res.data ?? {})).toBe(false);
    expect("email" in (res.data ?? {})).toBe(false);
    expect("role" in (res.data ?? {})).toBe(false);
  });

  it("renders valid math and blocks untrusted XSS/javascript URLs in KaTeX 0.18.2", () => {
    const valid = katex.renderToString("E = mc^2", { throwOnError: false, trust: false });
    expect(valid).toContain("katex");

    const malformed = katex.renderToString("\\frac{1}{", { throwOnError: false, trust: false });
    expect(malformed).toContain("katex-error");

    const xss = katex.renderToString("\\href{javascript:alert(1)}{click}", {
      throwOnError: false,
      trust: false,
    });
    expect(xss).not.toContain("<a ");
    expect(xss).toContain("#cc0000");
  });
});
