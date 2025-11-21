import { body } from 'express-validator';

export const createConversationValidation = [
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Conversation name must be 1-100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('isGroup')
    .isBoolean()
    .withMessage('isGroup must be boolean'),
  body('participantIds')
    .isArray({ min: 1 })
    .withMessage('At least one participant is required'),
  body('participantIds.*')
    .isString()
    .withMessage('Participant IDs must be strings'),
];

export const addParticipantValidation = [
  body('userId')
    .isString()
    .withMessage('User ID is required'),
  body('role')
    .optional()
    .isIn(['ADMIN', 'MODERATOR', 'MEMBER'])
    .withMessage('Invalid participant role'),
];

export const updateConversationValidation = [
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Conversation name must be 1-100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL'),
];