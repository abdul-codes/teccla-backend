import { Router } from 'express';
import { authenticateUser } from '../../middleware/authMiddleware';
import { isConversationParticipant, isConversationParticipantFromBody, canManageConversation, canEditMessage } from '../../middleware/chatMiddleware';
import { chatRateLimiter } from '../../middleware/simpleChatRateLimit';
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

import { uploadChatAttachment as uploadChatAttachmentController } from '../../controller/chat/ChatUploadController';
import { uploadChatAttachment as uploadChatAttachmentMiddleware } from '../../middleware/chatFileUploadMiddleware';
import { uploadRateLimiter } from '../../middleware/uploadRateLimiter';


const router = Router();

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Real-time messaging and conversations
 */

// All chat routes require authentication
router.use(authenticateUser);
router.use(chatRateLimiter);

// Conversation routes
/**
 * @swagger
 * /chat/conversations:
 *   post:
 *     summary: Create a new conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               participantIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Conversation created successfully
 */
router.post('/conversations', createConversationValidation, createConversation);
/**
 * @swagger
 * /chat/conversations:
 *   get:
 *     summary: Get all conversations for current user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of conversations
 */
router.get('/conversations', getUserConversations);
/**
 * @swagger
 * /chat/conversations/{id}:
 *   get:
 *     summary: Get conversation details by ID
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation details
 */
router.get('/conversations/:id', isConversationParticipant, getConversationDetails);

/**
 * @swagger
 * /chat/conversations/{id}:
 *   put:
 *     summary: Update conversation details
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation updated successfully
 */
router.put('/conversations/:id', isConversationParticipant, canManageConversation, updateConversationValidation, updateConversation);
/**
 * @swagger
 * /chat/conversations/{id}/participants:
 *   post:
 *     summary: Add participant to conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Participant added
 */
router.post('/conversations/:id/participants', isConversationParticipant, canManageConversation, addParticipantValidation, addParticipant);

/**
 * @swagger
 * /chat/conversations/{id}/participants/{userId}:
 *   delete:
 *     summary: Remove participant from conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Participant removed
 */
router.delete('/conversations/:id/participants/:userId', isConversationParticipant, canManageConversation, removeParticipant);

/**
 * @swagger
 * /chat/conversations/{id}/leave:
 *   delete:
 *     summary: Leave a conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Left conversation
 */
router.delete('/conversations/:id/leave', isConversationParticipant, leaveConversation);

// File upload route with rate limiting
/**
 * @swagger
 * /chat/upload:
 *   post:
 *     summary: Upload chat attachment
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 */
router.post('/upload', uploadRateLimiter, uploadChatAttachmentMiddleware, uploadChatAttachmentController);



// Message routes
/**
 * @swagger
 * /chat/messages:
 *   post:
 *     summary: Send a message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversationId
 *               - content
 *             properties:
 *               conversationId:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent successfully
 */
router.post('/messages',
  chatRateLimiter,
  sendMessageValidation,
  isConversationParticipantFromBody,
  sendMessage
);

/**
 * @swagger
 * /chat/conversations/{id}/messages:
 *   get:
 *     summary: Get messages for a conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of messages
 */
router.get('/conversations/:id/messages', isConversationParticipant, getMessages);

/**
 * @swagger
 * /chat/messages/{id}:
 *   put:
 *     summary: Update a message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message updated
 */
router.put('/messages/:id', isConversationParticipant, canEditMessage, updateMessageValidation, updateMessage);

/**
 * @swagger
 * /chat/messages/{id}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message deleted
 */
router.delete('/messages/:id', isConversationParticipant, canEditMessage, deleteMessage);

/**
 * @swagger
 * /chat/messages/read:
 *   put:
 *     summary: Mark messages as read
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversationId
 *               - messageIds
 *             properties:
 *               conversationId:
 *                 type: string
 *               messageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Messages marked as read
 */
router.put('/messages/read', isConversationParticipantFromBody, markMessagesReadValidation, markMessagesRead);

/**
 * @swagger
 * /chat/conversations/{id}/unread:
 *   get:
 *     summary: Get unread message count for a conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Unread count
 */
router.get('/conversations/:id/unread', isConversationParticipant, getUnreadCount);

export default router;