import { SUPPORTED_CHAT_MODELS } from "@/features/conversation/utils/chat-controls";

export const VALID_THEMES = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof VALID_THEMES)[number];

const SUPPORTED_MODEL_IDS = new Set<string>(
  SUPPORTED_CHAT_MODELS.map((m) => m.id)
);

export interface ProfileUpdateInput {
  firstName?: unknown;
  lastName?: unknown;
  bio?: unknown;
  defaultModel?: unknown;
  themePreference?: unknown;
}

export interface ValidatedProfileUpdate {
  valid: boolean;
  error?: string;
  data?: {
    firstName: string | null;
    lastName: string | null;
    bio: string | null;
    defaultModel: string | null;
    themePreference: ThemePreference;
  };
}

export function validateProfileUpdate(input: ProfileUpdateInput): ValidatedProfileUpdate {
  const cleanStr = (val: unknown, maxLen: number, field: string): { ok: true; value: string | null } | { ok: false; error: string } => {
    if (val === undefined || val === null) return { ok: true, value: null };
    if (typeof val !== "string") return { ok: false, error: `${field} must be a string` };
    const trimmed = val.trim();
    if (trimmed.length > maxLen) return { ok: false, error: `${field} exceeds ${maxLen} characters` };
    return { ok: true, value: trimmed.length > 0 ? trimmed : null };
  };

  const fn = cleanStr(input.firstName, 60, "First name");
  if (!fn.ok) return { valid: false, error: fn.error };

  const ln = cleanStr(input.lastName, 60, "Last name");
  if (!ln.ok) return { valid: false, error: ln.error };

  const bio = cleanStr(input.bio, 500, "Bio");
  if (!bio.ok) return { valid: false, error: bio.error };

  let defaultModel: string | null = null;
  if (input.defaultModel !== undefined && input.defaultModel !== null && input.defaultModel !== "") {
    if (typeof input.defaultModel !== "string" || !SUPPORTED_MODEL_IDS.has(input.defaultModel.trim())) {
      return { valid: false, error: "Unsupported default model" };
    }
    defaultModel = input.defaultModel.trim();
  }

  let themePreference: ThemePreference = "system";
  if (input.themePreference !== undefined && input.themePreference !== null) {
    if (
      typeof input.themePreference !== "string" ||
      !VALID_THEMES.includes(input.themePreference as ThemePreference)
    ) {
      return { valid: false, error: "Invalid theme preference" };
    }
    themePreference = input.themePreference as ThemePreference;
  }

  return {
    valid: true,
    data: {
      firstName: fn.value,
      lastName: ln.value,
      bio: bio.value,
      defaultModel,
      themePreference,
    },
  };
}
