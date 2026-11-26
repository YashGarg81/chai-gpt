import { Skeleton } from "@/components/ui/skeleton";

export default function ConversationLoading() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <div className="flex h-14 shrink-0 items-center border-b px-3">
        <Skeleton className="h-5 w-36" />
      </div>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-8">
        <Skeleton className="ml-auto h-12 w-2/3 rounded-lg" />
        <Skeleton className="h-24 w-4/5 rounded-lg" />
      </div>
    </div>
  );
}
