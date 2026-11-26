import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashShareToken, verifySharePassword } from "@/features/share/utils/tokens";

type RouteContext = { params: Promise<{ token: string }> };

async function resolveActiveShare(token: string) {
  if (!token || token.length < 16) return null;
  const tokenHash = hashShareToken(token);
  const share = await prisma.conversationShare.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      title: true,
      showTitle: true,
      snapshotJson: true,
      passwordHash: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });
  if (!share) return null;
  if (share.revokedAt) return { status: "revoked" as const };
  if (share.expiresAt && share.expiresAt.getTime() <= Date.now()) {
    return { status: "expired" as const };
  }
  return { status: "active" as const, share };
}

export async function GET(_req: Request, context: RouteContext) {
  const { token } = await context.params;
  const resolved = await resolveActiveShare(token);
  if (!resolved) {
    return Response.json({ error: "Share not found" }, { status: 404 });
  }
  if (resolved.status === "revoked") {
    return Response.json({ error: "Share link has been revoked" }, { status: 410 });
  }
  if (resolved.status === "expired") {
    return Response.json({ error: "Share link has expired" }, { status: 410 });
  }

  const { share } = resolved;
  if (share.passwordHash) {
    return Response.json({
      requiresPassword: true,
      title: share.showTitle ? share.title : "Shared Conversation",
    });
  }

  return Response.json({
    requiresPassword: false,
    createdAt: share.createdAt.toISOString(),
    snapshot: share.snapshotJson,
  });
}

export async function POST(req: Request, context: RouteContext) {
  const { token } = await context.params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rate = await checkRateLimit(`share:pw:${ip}:${hashShareToken(token || "")}`, 10, 60_000);
  if (!rate.allowed) {
    return Response.json(
      { error: "Too many password attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }
  const resolved = await resolveActiveShare(token);
  if (!resolved) {
    return Response.json({ error: "Share not found" }, { status: 404 });
  }
  if (resolved.status !== "active") {
    return Response.json({ error: `Share link is ${resolved.status}` }, { status: 410 });
  }

  const { share } = resolved;
  if (!share.passwordHash) {
    return Response.json({
      requiresPassword: false,
      createdAt: share.createdAt.toISOString(),
      snapshot: share.snapshotJson,
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { password } = (body ?? {}) as { password?: string };
  if (typeof password !== "string" || !verifySharePassword(password, share.passwordHash)) {
    return Response.json({ error: "Incorrect password" }, { status: 401 });
  }

  return Response.json({
    requiresPassword: false,
    createdAt: share.createdAt.toISOString(),
    snapshot: share.snapshotJson,
  });
}
