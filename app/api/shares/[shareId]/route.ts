import { auth } from "@clerk/nextjs/server";
import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ shareId: string }> };

export async function DELETE(_req: Request, context: RouteContext) {
  await auth.protect();
  const user = await requireUser();
  const { shareId } = await context.params;

  const existing = await prisma.conversationShare.findFirst({
    where: { id: shareId, userId: user.id },
  });

  if (!existing) {
    return Response.json({ error: "Share not found" }, { status: 404 });
  }

  await prisma.conversationShare.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  return Response.json({ id: existing.id, revoked: true });
}
