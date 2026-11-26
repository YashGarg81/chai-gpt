"use client";

import { SparklesIcon } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

const SUGGESTED_PROMPTS = [
  "Explain how Neon Postgres branching works",
  "Write a TypeScript debounce hook with cleanup",
  "Summarize the key differences between SSR and RSC",
  "Help me debug a slow SQL query",
];

type ChatEmptyProps = {
  onSelectPrompt?: (prompt: string) => void;
};

/** Empty-state placeholder shown before the first message is sent. */
export function ChatEmpty({ onSelectPrompt }: ChatEmptyProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
      <Empty className="max-w-2xl border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-primary/10 text-primary">
            <SparklesIcon className="size-5" />
          </EmptyMedia>
          <EmptyTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
            How can I help you today?
          </EmptyTitle>
          <EmptyDescription className="text-sm sm:text-base">
            Ask anything — powered by OpenRouter with real-time streaming.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>

      {onSelectPrompt ? (
        <div
          className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2"
          role="list"
          aria-label="Suggested prompts"
        >
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSelectPrompt(prompt)}
              className="rounded-xl border border-border/70 bg-card/60 px-4 py-3 text-left text-sm text-foreground/90 transition-colors hover:border-border hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {prompt}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
