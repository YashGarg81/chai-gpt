import { describe, expect, it } from "bun:test";
import {
  MAX_SYSTEM_PROMPT_CHARS,
  validateChatControlsInput,
} from "@/features/conversation/utils/chat-controls";

describe("Phase 3.7: Advanced Chat Controls", () => {
  it("accepts supported models and valid custom system prompts", () => {
    const res = validateChatControlsInput({
      model: "google/gemini-2.5-flash",
      systemPrompt: "  Always respond concisely in TypeScript.  ",
    });
    expect(res.valid).toBe(true);
    expect(res.model).toBe("google/gemini-2.5-flash");
    expect(res.systemPrompt).toBe("Always respond concisely in TypeScript.");
  });

  it("rejects unsupported models and oversized or non-string system prompts", () => {
    const badModel = validateChatControlsInput({ model: "evil/unlisted-model" });
    expect(badModel.valid).toBe(false);

    const oversized = validateChatControlsInput({
      systemPrompt: "a".repeat(MAX_SYSTEM_PROMPT_CHARS + 1),
    });
    expect(oversized.valid).toBe(false);

    const nonString = validateChatControlsInput({
      systemPrompt: 12345,
    });
    expect(nonString.valid).toBe(false);
  });

  it("normalizes empty model or systemPrompt to null", () => {
    const res = validateChatControlsInput({ model: "", systemPrompt: "   " });
    expect(res.valid).toBe(true);
    expect(res.model).toBeNull();
    expect(res.systemPrompt).toBeNull();
  });

  it("validates all SUPPORTED_CHAT_MODELS ids", () => {
    for (const m of ["openrouter/free", "google/gemini-2.5-flash", "openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet"]) {
      const res = validateChatControlsInput({ model: m });
      expect(res.valid).toBe(true);
      expect(res.model).toBe(m);
    }
  });
});
