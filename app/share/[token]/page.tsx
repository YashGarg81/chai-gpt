import { SharedConversationView } from "@/features/share/components/shared-conversation-view";

export default async function SharedConversationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SharedConversationView token={token} />;
}
