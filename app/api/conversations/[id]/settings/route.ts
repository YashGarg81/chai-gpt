import { auth } from "@clerk/nextjs/server";
import { requireUser } from "@/features/auth/action/require-user";
import { validateChatControlsInput } from "@/features/conversation/utils/chat-controls";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  await auth.protect();
  const user = await requireUser();
  const { id } = await context.params;

  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: user.id, deletedAt: null },
    select: { id: true, model: true, systemPrompt: true },
  });

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  return Response.json({
    id: conversation.id,
    model: conversation.model || "openrouter/free",
    systemPrompt: conversation.systemPrompt ?? "",
  });
}

export async function PATCH(req: Request, context: RouteContext) {
  await auth.protect();
  const user = await requireUser();
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = validateChatControlsInput((body ?? {}) as Record<string, unknown>);
  if (!parsed.valid) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const updated = await prisma.conversation.updateMany({
    where: { id, userId: user.id, deletedAt: null },
    data: {
      model: parsed.model,
      systemPrompt: parsed.systemPrompt,
    },
  });

  if (updated.count === 0) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  return Response.json({
    id,
    model: parsed.model || "openrouter/free",
    systemPrompt: parsed.systemPrompt ?? "",
  });
}
