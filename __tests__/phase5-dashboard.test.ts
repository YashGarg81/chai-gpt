import { describe, expect, it } from "bun:test";
import { validateProfileUpdate } from "@/features/dashboard/utils/profile-validation";

describe("Phase 5: User Dashboard & Personalization", () => {
  it("validates valid profile and preference updates", () => {
    const res = validateProfileUpdate({
      firstName: "  Yash  ",
      lastName: "Kumar",
      bio: "Building ChaiGPT",
      defaultModel: "google/gemini-2.5-flash",
      themePreference: "dark",
    });

    expect(res.valid).toBe(true);
    expect(res.data).toEqual({
      firstName: "Yash",
      lastName: "Kumar",
      bio: "Building ChaiGPT",
      defaultModel: "google/gemini-2.5-flash",
      themePreference: "dark",
    });
  });

  it("rejects unsupported models, invalid themes, and oversized fields", () => {
    expect(
      validateProfileUpdate({ defaultModel: "evil/model" }).valid
    ).toBe(false);
    expect(
      validateProfileUpdate({ themePreference: "neon" }).valid
    ).toBe(false);
    expect(
      validateProfileUpdate({ bio: "a".repeat(501) }).valid
    ).toBe(false);
    expect(
      validateProfileUpdate({ firstName: 123 }).valid
    ).toBe(false);
  });

  it("normalizes empty strings to null and defaults theme to system", () => {
    const res = validateProfileUpdate({
      firstName: "   ",
      lastName: "",
      bio: "",
      defaultModel: "",
    });
    expect(res.valid).toBe(true);
    expect(res.data).toEqual({
      firstName: null,
      lastName: null,
      bio: null,
      defaultModel: null,
      themePreference: "system",
    });
  });

  it("resolves effective model with conversation override > user default > openrouter/free", () => {
    const resolveEffectiveModel = (
      conversationModel: string | null | undefined,
      userDefaultModel: string | null | undefined
    ) => conversationModel || userDefaultModel || "openrouter/free";

    expect(resolveEffectiveModel("openai/gpt-4o-mini", "google/gemini-2.5-flash")).toBe(
      "openai/gpt-4o-mini"
    );
    expect(resolveEffectiveModel(null, "google/gemini-2.5-flash")).toBe(
      "google/gemini-2.5-flash"
    );
    expect(resolveEffectiveModel(null, null)).toBe("openrouter/free");
  });

  it("strips protected fields (id, clerkId, email, role) from mixed PATCH payloads", () => {
    const res = validateProfileUpdate({
      id: "hacked-id",
      clerkId: "hacked-clerk",
      email: "hacked@example.com",
      role: "admin",
      bio: "Legitimate bio",
      themePreference: "dark",
    } as unknown as Parameters<typeof validateProfileUpdate>[0]);
    expect(res.valid).toBe(true);
    expect(res.data).toEqual({
      firstName: null,
      lastName: null,
      bio: "Legitimate bio",
      defaultModel: null,
      themePreference: "dark",
    });
    expect("id" in (res.data ?? {})).toBe(false);
    expect("clerkId" in (res.data ?? {})).toBe(false);
    expect("email" in (res.data ?? {})).toBe(false);
    expect("role" in (res.data ?? {})).toBe(false);
  });
});
