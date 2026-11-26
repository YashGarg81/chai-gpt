"use client";

import { Button } from "@/components/ui/button";

export default function ConversationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <h2 className="text-lg font-semibold">Failed to load conversation</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred while loading this chat."}
      </p>
      <Button type="button" onClick={reset}>
        Retry
      </Button>
    </div>
  );
}
