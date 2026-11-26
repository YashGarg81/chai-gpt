import { loadChatMessages, saveChatMessages } from "@/features/ai/actions/chat-store";
import { getChatModel } from "@/features/ai/utils/model";
import { getRegisteredChatTools } from "@/features/tools/utils/tool-registry";
import { generateConversationTitle } from "@/features/ai/utils/title";
import { requireUser } from "@/features/auth/action/require-user";
import {
    assembleChatContext,
    invalidateAffectedBranchSummaries,
    updateBranchSummaryInBackground,
    type AttachmentContextInput,
} from "@/features/context/services/context-assembler";
import {
    isImageMime,
    MAX_FILES_PER_MESSAGE,
} from "@/features/attachments/utils/validation";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { redis } from "@/lib/redis";
import { storage } from "@/lib/storage";
import { auth } from "@clerk/nextjs/server";
import { convertToModelMessages, createIdGenerator, createUIMessageStreamResponse, isTextUIPart, stepCountIs, streamText, toUIMessageStream, type UIMessage } from "ai";

const MAX_MESSAGE_CHARS = 16_000;
const MAX_HISTORY_MESSAGES = 100;

/**
 * POST /api/chat — Streams an AI assistant reply for a conversation.
 *
 * Validates auth, rate limits, request payload, and ownership, persists the user
 * message, then streams the assistant response via the AI SDK. Final messages are
 * saved when the stream ends.
 */
export async function POST(req: Request) {
    await auth.protect();

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return new Response("Invalid JSON body", { status: 400 });
    }

    const { message, id, attachmentIds } = (body ?? {}) as {
        message?: UIMessage;
        id?: unknown;
        attachmentIds?: unknown;
    };

    const validAttachmentIds = Array.isArray(attachmentIds)
        ? attachmentIds.filter((a): a is string => typeof a === "string" && a.trim().length > 0)
        : [];

    if (validAttachmentIds.length > MAX_FILES_PER_MESSAGE) {
        return new Response(`Maximum ${MAX_FILES_PER_MESSAGE} attachments per message`, { status: 400 });
    }

    if (typeof id !== "string" || !id.trim()) {
        return new Response("Missing or invalid conversation id", { status: 400 });
    }

    if (
        !message ||
        typeof message !== "object" ||
        message.role !== "user" ||
        !Array.isArray(message.parts) ||
        message.parts.length === 0
    ) {
        return new Response("Missing or invalid user message", { status: 400 });
    }

    const userText = message.parts.filter(isTextUIPart).map((part) => part.text).join("").trim();
    if (!userText) {
        return new Response("Message cannot be empty", { status: 400 });
    }
    if (userText.length > MAX_MESSAGE_CHARS) {
        return new Response(`Message exceeds ${MAX_MESSAGE_CHARS} character limit`, { status: 413 });
    }

    const user = await requireUser();

    const rate = await checkRateLimit(`chat:${user.id}`, 20, 60_000);
    if (rate.unavailable) {
        return new Response("Rate limit service unavailable. Please try again shortly.", {
            status: 503,
            headers: { "Retry-After": String(rate.retryAfterSeconds) },
        });
    }
    if (!rate.allowed) {
        return new Response("Too many requests. Please slow down.", {
            status: 429,
            headers: { "Retry-After": String(rate.retryAfterSeconds) },
        });
    }

    const conversation = await prisma.conversation.findFirst({
        where: {
            id,
            userId: user.id,
            deletedAt: null,
        }
    });

    if (!conversation) {
        return new Response("Conversation not found", { status: 404 });
    }

    const previousMessages = await loadChatMessages(id);

    const targetIndex = previousMessages.findIndex(
        (storedMessage) => storedMessage.id === message.id
    );
    const alreadySaved = targetIndex !== -1;

    const messages = alreadySaved
        ? previousMessages.slice(0, targetIndex + 1)
        : [...previousMessages, message];

    const supersededIds = alreadySaved
        ? previousMessages.slice(targetIndex + 1).map((m) => m.id)
        : [];

    if (!alreadySaved) {
        await saveChatMessages(id, [message]);
    }

    const attachmentInputs: AttachmentContextInput[] = [];
    if (validAttachmentIds.length > 0) {
        const attachments = await prisma.attachment.findMany({
            where: {
                id: { in: validAttachmentIds },
                ownerId: user.id,
                conversationId: id,
                deletedAt: null,
                processingStatus: "READY",
            },
        });

        if (attachments.length !== validAttachmentIds.length) {
            return new Response("One or more attachments are invalid or not ready", { status: 400 });
        }

        await prisma.attachment.updateMany({
            where: { id: { in: validAttachmentIds }, ownerId: user.id },
            data: { messageId: message.id },
        });

        for (const att of attachments) {
            if (isImageMime(att.mimeType)) {
                const buf = await storage.getObject(att.storageKey);
                attachmentInputs.push({
                    id: att.id,
                    originalName: att.originalName,
                    mimeType: att.mimeType,
                    binaryBase64Url: `data:${att.mimeType};base64,${buf.toString("base64")}`,
                });
            } else if (att.mimeType === "application/pdf" && !att.extractedText?.trim()) {
                const buf = await storage.getObject(att.storageKey);
                attachmentInputs.push({
                    id: att.id,
                    originalName: att.originalName,
                    mimeType: "application/pdf",
                    binaryBase64Url: `data:application/pdf;base64,${buf.toString("base64")}`,
                });
            } else if (att.extractedText) {
                attachmentInputs.push({
                    id: att.id,
                    originalName: att.originalName,
                    mimeType: att.mimeType,
                    extractedText: att.extractedText,
                });
            }
        }
    }

    const lockKey = `chat:lock:${id}`;
    const lockToken = crypto.randomUUID();
    const hasRedis = Boolean(
        process.env.UPSTASH_REDIS_REST_URL?.trim() &&
        process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
    );
    let renewTimer: ReturnType<typeof setInterval> | undefined;
    if (hasRedis) {
        const acquired = await redis.set(lockKey, lockToken, { nx: true, ex: 60 }).catch(() => "OK");
        if (!acquired) {
            return new Response("A response is already generating for this conversation.", { status: 409 });
        }
        renewTimer = setInterval(() => {
            void redis
                .eval(
                    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('expire', KEYS[1], 60) else return 0 end",
                    [lockKey],
                    [lockToken]
                )
                .catch(() => {});
        }, 20_000);
    }

    const cleanRecentMessages = messages.slice(-MAX_HISTORY_MESSAGES);
    const contextResult = await assembleChatContext({
        conversationId: id,
        userId: user.id,
        branchId: conversation.activeBranchId,
        modelId: conversation.model,
        baseSystemPrompt: conversation.systemPrompt,
        messages,
        currentMessageId: message.id,
        attachments: attachmentInputs,
        operation: alreadySaved ? "regenerate" : "new",
    }).catch(() => null);

    const systemPrompt =
        contextResult?.systemPrompt ??
        (conversation.systemPrompt ?? "You are ChaiGpt , a helpful assistant");
    const recentMessages = contextResult?.messages ?? cleanRecentMessages;

    const effectiveModel = conversation.model || user.defaultModel;
    const result = streamText({
        model: getChatModel(effectiveModel),
        system: systemPrompt,
        messages: await convertToModelMessages(recentMessages),
        tools: getRegisteredChatTools({ userId: user.id, conversationId: id }),
        stopWhen: stepCountIs(5),
        abortSignal: req.signal,
    });

    Promise.resolve(result.consumeStream()).catch((error) => {
        console.error("Stream consumption error:", error);
    });

    return createUIMessageStreamResponse({
        stream:toUIMessageStream({
           stream:result.stream,
           originalMessages:cleanRecentMessages,
           generateMessageId:createIdGenerator({prefix:"msg" , size:16}),
           onError: (error) => {
            console.error("AI stream error:", error);
            return "An error occurred while generating the response.";
           },
           onEnd:async({messages:finalMessages})=>{
            try {
                if (supersededIds.length > 0) {
                    await prisma.message.updateMany({
                        where: { id: { in: supersededIds }, conversationId: id },
                        data: { supersededAt: new Date() },
                    });
                    // Invalidate branch summary and all descendant branch summaries
                    await invalidateAffectedBranchSummaries({
                        conversationId: id,
                        userId: user.id,
                        branchId: conversation.activeBranchId,
                    });
                }
                await saveChatMessages(id , finalMessages , {updateTitle:false})
                if (contextResult?.shouldCompact) {
                    void updateBranchSummaryInBackground({
                        conversationId: id,
                        userId: user.id,
                        branchId: conversation.activeBranchId,
                        modelId: conversation.model,
                        messages: finalMessages,
                    }).catch(() => {});
                }
                if (conversation.title === "New Chat") {
                    const aiTitle = await generateConversationTitle(userText);
                    if (aiTitle && aiTitle !== "New Chat") {
                        await prisma.conversation.updateMany({
                            where: { id, userId: user.id, title: "New Chat" },
                            data: { title: aiTitle },
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to persist final messages:", error);
            } finally {
                if (renewTimer) {
                    clearInterval(renewTimer);
                }
                if (hasRedis) {
                    await redis
                        .eval(
                            "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
                            [lockKey],
                            [lockToken]
                        )
                        .catch(() => {});
                }
            }
           }
        })
    })

}