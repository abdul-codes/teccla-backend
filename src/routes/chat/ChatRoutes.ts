import { Router } from 'express';
import { authenticateUser } from '../../middleware/authMIddleware';
import { isConversationParticipant, canManageConversation, canEditMessage } from '../../middleware/chatMiddleware';
import { messageRateLimitMiddleware, messageRateLimiter, conversationMessageLimiter } from '../../middleware/messageRateLimitMiddleware';
import { createConversationValidation, addParticipantValidation, updateConversationValidation } from '../../validation/chat/conversation';
import { sendMessageValidation, updateMessageValidation, markMessagesReadValidation } from '../../validation/chat/message';

// Import controllers
import {
  createConversation,
  getUserConversations,
  getConversationDetails,
  updateConversation,
  addParticipant,
  removeParticipant,
  leaveConversation,
} from '../../controller/chat/ConversationController';

import {
  sendMessage,
  getMessages,
  updateMessage,
  deleteMessage,
  markMessagesRead,
  getUnreadCount,
} from '../../controller/chat/MessageController';

const router = Router();

// All chat routes require authentication
router.use(authenticateUser);

// Conversation routes
router.post('/conversations', createConversationValidation, createConversation);
router.get('/conversations', getUserConversations);
router.get('/conversations/:id', isConversationParticipant, getConversationDetails);
router.put('/conversations/:id', isConversationParticipant, canManageConversation, updateConversationValidation, updateConversation);
router.post('/conversations/:id/participants', isConversationParticipant, canManageConversation, addParticipantValidation, addParticipant);
router.delete('/conversations/:id/participants/:userId', isConversationParticipant, canManageConversation, removeParticipant);
router.delete('/conversations/:id/leave', isConversationParticipant, leaveConversation);

// Message routes
router.post('/messages', 
  messageRateLimitMiddleware,
  messageRateLimiter,
  conversationMessageLimiter,
  sendMessageValidation, 
  sendMessage
);
router.get('/conversations/:id/messages', isConversationParticipant, getMessages);
router.put('/messages/:id', isConversationParticipant, canEditMessage, updateMessageValidation, updateMessage);
router.delete('/messages/:id', isConversationParticipant, canEditMessage, deleteMessage);
router.put('/messages/read', markMessagesReadValidation, markMessagesRead);
router.get('/conversations/:id/unread', isConversationParticipant, getUnreadCount);

export default router;