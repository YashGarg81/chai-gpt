-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "folderId" TEXT,
ADD COLUMN     "pinnedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ConversationFolder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationFolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationFolder_userId_idx" ON "ConversationFolder"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationFolder_userId_name_key" ON "ConversationFolder"("userId", "name");

-- CreateIndex
CREATE INDEX "Conversation_userId_deletedAt_isArchived_lastMessageAt_idx" ON "Conversation"("userId", "deletedAt", "isArchived", "lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX "Conversation_userId_folderId_idx" ON "Conversation"("userId", "folderId");

-- AddForeignKey
ALTER TABLE "ConversationFolder" ADD CONSTRAINT "ConversationFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "ConversationFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
