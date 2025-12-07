import { body } from 'express-validator';

export const sendMessageValidation = [
  body('conversationId')
    .isString()
    .withMessage('Conversation ID is required'),
  body('content')
    .custom((value, { req }) => {
      // Content is optional if there's an attachment
      if (!value || value.trim().length === 0) {
        if (!req.body.attachmentUrl) {
          throw new Error('Message content is required when no attachment is provided');
        }
        return true;
      }
      // If content exists, validate length
      if (value.length > 4000) {
        throw new Error('Message content must not exceed 4000 characters');
      }
      return true;
    })
    .withMessage('Message content must be 1-4000 characters'),
  body('messageType')
    .optional()
    .isIn(['TEXT', 'IMAGE', 'DOCUMENT'])
    .withMessage('Invalid message type'),
  body('replyToId')
    .optional()
    .isString()
    .withMessage('Reply to ID must be string'),
  body('attachmentUrl')
    .optional()
    .custom((value) => {
      if (!value) return true;
      // Allow http/https URLs including localhost for development
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(value)) {
        throw new Error('Attachment URL must be a valid HTTP/HTTPS URL');
      }
      return true;
    })
    .withMessage('Attachment URL must be valid HTTP/HTTPS URL'),
  body('attachmentType')
    .optional()
    .isIn(['IMAGE', 'DOCUMENT'])
    .withMessage('Invalid attachment type'),
  body('attachmentName')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage('Attachment name must be a string with max 255 characters'),
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