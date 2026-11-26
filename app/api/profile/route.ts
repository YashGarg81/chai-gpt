import { auth } from "@clerk/nextjs/server";
import { requireUser } from "@/features/auth/action/require-user";
import { validateProfileUpdate } from "@/features/dashboard/utils/profile-validation";
import { prisma } from "@/lib/db";

export async function GET() {
  await auth.protect();
  const user = await requireUser();

  return Response.json({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    imageUrl: user.imageUrl,
    bio: user.bio,
    defaultModel: user.defaultModel,
    themePreference: user.themePreference || "system",
    createdAt: user.createdAt.toISOString(),
  });
}

export async function PATCH(req: Request) {
  await auth.protect();
  const user = await requireUser();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = validateProfileUpdate((body ?? {}) as Record<string, unknown>);
  if (!parsed.valid || !parsed.data) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      bio: parsed.data.bio,
      defaultModel: parsed.data.defaultModel,
      themePreference: parsed.data.themePreference,
    },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      imageUrl: true,
      bio: true,
      defaultModel: true,
      themePreference: true,
      createdAt: true,
    },
  });

  return Response.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
  });
}
