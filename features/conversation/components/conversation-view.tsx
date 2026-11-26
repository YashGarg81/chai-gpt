"use client";
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useChat } from "@ai-sdk/react"
import React, { useMemo, useState } from 'react'
import { Download, Share2, SlidersHorizontal } from 'lucide-react';
import { ExportDialog } from '@/features/export/components/export-dialog';
import { ShareDialog } from '@/features/share/components/share-dialog';
import { ChatControlsDialog } from './chat-controls-dialog';
import {
    editMessageAndBranch,
    listConversationBranches,
    listMessageVersions,
    restoreMessageVersion,
    switchConversationBranch,
} from '../actions/branch-actions';
import { useConversations } from '../hooks/use-conversation';
import { queryKeys } from '../utils/query-keys';
import { toast } from 'sonner';
import { ChatEmpty } from './chat-empty';
import { ChatMessages } from './chat-messages';
import { ChatComposer } from './chat-composer';

type ConversationViewProps = {
    conversationId: string;
    initialMessages: UIMessage[];
};

/**
 * Main chat view — header, message list (or empty state), and composer with streaming.
 */
export const ConversationView = ({ conversationId, initialMessages }: ConversationViewProps) => {

    const queryClient = useQueryClient();
    const router = useRouter();
    const { data: conversations } = useConversations();
    const { data: branchData } = useQuery({
        queryKey: ["branches", conversationId],
        queryFn: () => listConversationBranches(conversationId),
    });

    const transport = useMemo(() => new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ id, messages, body }) => ({
            body: {
                ...(body ?? {}),
                id,
                message: messages.at(-1),
            },
        }),
    }), []);

    const { messages, sendMessage, status, stop, regenerate, error } = useChat({
        id: conversationId,
        messages: initialMessages,
        transport,
        onFinish: () => {
            void queryClient.invalidateQueries({
                queryKey: queryKeys.conversations.all,
            });
        },
        onError: (err) => {
            toast.error(err.message);
        },
    })
    const title =
    conversations?.find((item) => item.id === conversationId)?.title ?? "Chat";
    const [exportOpen, setExportOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [controlsOpen, setControlsOpen] = useState(false);
    const [activeModel, setActiveModel] = useState("openrouter/free");

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col">
            <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-3">
                <div className="flex min-w-0 items-center gap-2">
                    <SidebarTrigger aria-label="Toggle sidebar" />
                    <Separator orientation="vertical" className="mx-1 h-4" />
                    <h1 className="truncate text-sm font-medium">{title}</h1>
                </div>
                <div className="flex items-center gap-2">
                    {branchData && branchData.branches.length > 0 ? (
                        <select
                            aria-label="Select conversation branch"
                            value={branchData.activeBranchId ?? ""}
                            onChange={(e) => {
                                const nextBranch = e.target.value || null;
                                void switchConversationBranch(conversationId, nextBranch).then(() => {
                                    void queryClient.invalidateQueries({ queryKey: ["branches", conversationId] });
                                    router.refresh();
                                });
                            }}
                            className="h-7 rounded-md border border-border/70 bg-background px-2 text-xs text-foreground"
                        >
                            <option value="">Original</option>
                            {branchData.branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
                                </option>
                            ))}
                        </select>
                    ) : null}
                    <button
                        type="button"
                        onClick={() => setExportOpen(true)}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 px-2 text-xs hover:bg-muted"
                        aria-label="Export conversation"
                    >
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Export</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setShareOpen(true)}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 px-2 text-xs hover:bg-muted"
                        aria-label="Share conversation"
                    >
                        <Share2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Share</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setControlsOpen(true)}
                        className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-border/70 bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                        aria-label="Open chat controls"
                    >
                        <SlidersHorizontal className="h-3 w-3" />
                        <span className="hidden sm:inline">{activeModel}</span>
                    </button>
                </div>
            </header>
            <ExportDialog conversationId={conversationId} open={exportOpen} onClose={() => setExportOpen(false)} />
            <ShareDialog conversationId={conversationId} open={shareOpen} onClose={() => setShareOpen(false)} />
            <ChatControlsDialog
                conversationId={conversationId}
                open={controlsOpen}
                onClose={() => setControlsOpen(false)}
                onSaved={(m) => setActiveModel(m)}
            />

            {messages.length === 0 ? (
                <ChatEmpty
                    onSelectPrompt={(prompt) => {
                        void sendMessage({ text: prompt });
                    }}
                />
            ) : (
                <ChatMessages
                    messages={messages}
                    status={status}
                    error={error}
                    onRegenerate={() => {
                        void regenerate();
                    }}
                    onEditMessage={async (messageId, newContent) => {
                        try {
                            await editMessageAndBranch(conversationId, messageId, newContent);
                            await queryClient.invalidateQueries({ queryKey: ["branches", conversationId] });
                            router.refresh();
                            void regenerate();
                        } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Failed to edit message");
                        }
                    }}
                    onLoadVersions={(messageId) => listMessageVersions(conversationId, messageId)}
                    onRestoreVersion={async (versionMessageId) => {
                        try {
                            await restoreMessageVersion(conversationId, versionMessageId);
                            await queryClient.invalidateQueries({ queryKey: ["branches", conversationId] });
                            router.refresh();
                            toast.success("Version restored");
                        } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Failed to restore version");
                        }
                    }}
                />
            )}

            <ChatComposer
                conversationId={conversationId}
                onSend={(text, attachmentIds, attachmentsMeta) => {
                    void sendMessage(
                        {
                            text,
                            ...(attachmentsMeta.length > 0
                                ? { metadata: { attachments: attachmentsMeta } }
                                : {}),
                        },
                        attachmentIds.length > 0 ? { body: { attachmentIds } } : undefined
                    );
                }}
                onStop={stop}
                isSending={status !== "ready" && status !== "error"}
                autoFocus
            />
        </div>
    )
}
