"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/features/auth/action/require-user";

export interface DashboardSummary {
  profile: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    imageUrl: string | null;
    bio: string | null;
    defaultModel: string | null;
    themePreference: string;
    createdAt: string;
  };
  stats: {
    totalConversations: number;
    totalMessages: number;
    totalAttachments: number;
    activeLast7Days: number;
  };
  modelDistribution: Array<{ model: string; count: number }>;
  recentConversations: Array<{
    id: string;
    title: string;
    model: string | null;
    lastMessageAt: string;
  }>;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const user = await requireUser();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalConversations,
    totalMessages,
    totalAttachments,
    activeLast7Days,
    recentConversations,
    modelGroups,
  ] = await Promise.all([
    prisma.conversation.count({
      where: { userId: user.id, deletedAt: null },
    }),
    prisma.message.count({
      where: {
        conversation: { userId: user.id, deletedAt: null },
        supersededAt: null,
      },
    }),
    prisma.attachment.count({
      where: { ownerId: user.id, deletedAt: null },
    }),
    prisma.conversation.count({
      where: {
        userId: user.id,
        deletedAt: null,
        lastMessageAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.conversation.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { lastMessageAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        model: true,
        lastMessageAt: true,
      },
    }),
    prisma.conversation.groupBy({
      by: ["model"],
      where: { userId: user.id, deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  const modelMap = new Map<string, number>();
  for (const g of modelGroups) {
    const key = g.model || "openrouter/free";
    modelMap.set(key, (modelMap.get(key) ?? 0) + g._count._all);
  }

  return {
    profile: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      imageUrl: user.imageUrl,
      bio: user.bio,
      defaultModel: user.defaultModel,
      themePreference: user.themePreference || "system",
      createdAt: user.createdAt.toISOString(),
    },
    stats: {
      totalConversations,
      totalMessages,
      totalAttachments,
      activeLast7Days,
    },
    modelDistribution: Array.from(modelMap.entries()).map(([model, count]) => ({
      model,
      count,
    })),
    recentConversations: recentConversations.map((c) => ({
      id: c.id,
      title: c.title,
      model: c.model,
      lastMessageAt: c.lastMessageAt.toISOString(),
    })),
  };
}
