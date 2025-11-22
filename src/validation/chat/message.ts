import { body } from 'express-validator';

export const sendMessageValidation = [
  body('conversationId')
    .isString()
    .withMessage('Conversation ID is required'),
  body('content')
    .isLength({ min: 1, max: 4000 })
    .withMessage('Message content must be 1-4000 characters'),
  body('messageType')
    .optional()
    .isIn(['TEXT', 'IMAGE', 'DOCUMENT', 'VIDEO', 'AUDIO'])
    .withMessage('Invalid message type'),
  body('replyToId')
    .optional()
    .isString()
    .withMessage('Reply to ID must be string'),
  body('attachmentUrl')
    .optional()
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('Attachment URL must be valid HTTP/HTTPS URL'),
  body('attachmentType')
    .optional()
    .isIn(['IMAGE', 'DOCUMENT', 'VIDEO', 'AUDIO'])
    .withMessage('Invalid attachment type'),
  // Custom validation for attachment consistency
  body().custom((_value, { req }) => {
    const hasAttachmentUrl = !!req.body.attachmentUrl;
    const hasAttachmentType = !!req.body.attachmentType;
    
    if (hasAttachmentUrl && !hasAttachmentType) {
      throw new Error('Attachment type is required when attachment URL is provided');
    }
    if (!hasAttachmentUrl && hasAttachmentType) {
      throw new Error('Attachment URL is required when attachment type is provided');
    }
    return true;
  }),
];

export const updateMessageValidation = [
  body('content')
    .isLength({ min: 1, max: 4000 })
    .withMessage('Message content must be 1-4000 characters'),
];

export const markMessagesReadValidation = [
  body('messageIds')
    .isArray({ min: 1 })
    .withMessage('At least one message ID is required'),
  body('messageIds.*')
    .isString()
    .withMessage('Message IDs must be strings'),
  body('conversationId')
    .isString()
    .withMessage('Conversation ID is required'),
];