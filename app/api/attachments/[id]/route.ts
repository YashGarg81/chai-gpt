import { auth } from "@clerk/nextjs/server";
import { requireUser } from "@/features/auth/action/require-user";
import { isImageMime } from "@/features/attachments/utils/validation";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  await auth.protect();
  const user = await requireUser();
  const { id } = await context.params;

  const attachment = await prisma.attachment.findFirst({
    where: { id, ownerId: user.id, deletedAt: null },
  });

  if (!attachment) {
    return new Response("Attachment not found", { status: 404 });
  }

  try {
    const data = await storage.getObject(attachment.storageKey);
    const disposition = isImageMime(attachment.mimeType)
      ? "inline"
      : "attachment";

    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Length": String(data.length),
        "Content-Disposition": `${disposition}; filename="${attachment.originalName}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return new Response("File unavailable", { status: 404 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  await auth.protect();
  const user = await requireUser();
  const { id } = await context.params;

  const attachment = await prisma.attachment.findFirst({
    where: { id, ownerId: user.id, deletedAt: null },
  });

  if (!attachment) {
    return Response.json({ error: "Attachment not found" }, { status: 404 });
  }

  await prisma.attachment.update({
    where: { id: attachment.id },
    data: { deletedAt: new Date(), processingStatus: "DELETED" },
  });

  await storage.deleteObject(attachment.storageKey);

  return Response.json({ id: attachment.id, deleted: true });
}
