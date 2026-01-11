-- DropIndex
DROP INDEX "Message_conversationId_createdAt_idx";

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_conversationId_idx" ON "ConversationParticipant"("userId", "conversationId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "MessageRead_userId_messageId_idx" ON "MessageRead"("userId", "messageId");
