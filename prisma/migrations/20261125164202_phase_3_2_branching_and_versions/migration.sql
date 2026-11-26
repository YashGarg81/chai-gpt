-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "activeBranchId" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "parentMessageId" TEXT,
ADD COLUMN     "supersededAt" TIMESTAMP(3),
ADD COLUMN     "versionNumber" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "ConversationBranch" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'main',
    "parentBranchId" TEXT,
    "forkMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationBranch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationBranch_conversationId_createdAt_idx" ON "ConversationBranch"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_conversationId_branchId_createdAt_idx" ON "Message"("conversationId", "branchId", "createdAt");

-- AddForeignKey
ALTER TABLE "ConversationBranch" ADD CONSTRAINT "ConversationBranch_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
