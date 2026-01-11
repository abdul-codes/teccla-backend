-- Add essential indexes for chat performance
-- Migration: Add chat performance indexes

-- Index for message pagination (most critical)
CREATE INDEX CONCURRENTLY idx_messages_conversation_created 
ON "Message"(conversationId, createdAt DESC);

-- Index for message read receipts
CREATE INDEX CONCURRENTLY idx_message_reads_user_message 
ON "MessageRead"(userId, messageId);

-- Index for conversation participant lookups
CREATE INDEX CONCURRENTLY idx_conversation_participants_user_conv 
ON "ConversationParticipant"(userId, conversationId);