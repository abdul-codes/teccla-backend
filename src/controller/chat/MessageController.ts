import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { asyncMiddleware } from "../../middleware/asyncMiddleware";
import { prisma } from "../../utils/db";
import { MessageType } from "../../../prisma/generated/prisma/client";
import { sanitizeMessageContent } from "../../utils/contentSanitizer";
import Logger from "../../utils/logger";

export const sendMessage = asyncMiddleware(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    Logger.info(' Message validation failed:', { errors: errors.array(), body: req.body });
    return res.status(400).json({ errors: errors.array() });
  }

  const { conversationId, content, messageType = MessageType.TEXT, replyToId, attachmentUrl, attachmentType, attachmentName } = req.body;
  const userId = req.user?.id;
  const participant = req.participant;

  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  if (!participant) {
    return res.status(403).json({ message: "Not a participant in this conversation" });
  }

  // Check if muted
  if (participant.isMuted) {
    return res.status(403).json({ message: "You are muted in this conversation" });
  }

  // Validate reply message exists if provided
  if (replyToId) {
    const replyMessage = await prisma.message.findFirst({
      where: {
        id: replyToId,
        conversationId,
      }
    });

    if (!replyMessage) {
      return res.status(400).json({ message: "Reply message not found in this conversation" });
    }
  }


  // Sanitize content before saving
  const sanitizedContent = sanitizeMessageContent(content);

  // Create message
  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: userId,
      content: sanitizedContent,
      messageType,
      replyToId,
      attachmentUrl,
      attachmentType,
      attachmentName,
    },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
        }
      },
      replyTo: {
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            }
          }
        }
      }
    }
  });

  // Update conversation's last updated timestamp
  await prisma.conversation.update({
    where: {
      id: conversationId,
    },
    data: {
      updatedAt: new Date(),
    }
  });

  // Mark message as read for sender
  await prisma.messageRead.create({
    data: {
      messageId: message.id,
      userId,
      participantId: participant.id,
    }
  });

  res.status(201).json({
    message: "Message sent successfully",
    data: message
  });
});

export const getMessages = asyncMiddleware(async (req: Request, res: Response) => {
  const { id } = req.params;
  const conversationId = id;
  const { page = 1, limit = 50, cursor } = req.query;
  const participant = req.participant;

  Logger.info('GET MESSAGES :', {
    params: req.params,
    id,
    conversationId,
    query: req.query
  });

  if (!participant) {
    return res.status(403).json({ message: "Not a participant in this conversation" });
  }

  const take = Number(limit);
  const skip = cursor ? undefined : (Number(page) - 1) * take;

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
    },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
        }
      },
      replyTo: {
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            }
          }
        }
      },
      messageReads: {
        where: {
          userId: req.user?.id,
        },
        select: {
          readAt: true,
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take,
    skip,
    cursor: cursor ? {
      id: cursor as string
    } : undefined,
  });

  // Get next cursor for pagination
  const nextCursor = messages.length > 0 ? messages[messages.length - 1].id : null;

  // Update last read timestamp for participant
  await prisma.conversationParticipant.update({
    where: {
      id: participant.id,
    },
    data: {
      lastReadAt: new Date(),
    }
  });

  // Mark all messages as read for this user
  if (messages.length > 0) {
    const messageIds = messages.map(m => m.id);
    await prisma.messageRead.createMany({
      data: messageIds.map(messageId => ({
        messageId,
        userId: req.user!.id,
        participantId: participant.id,
      })),
      skipDuplicates: true,
    });
  }

  res.json({
    messages: messages.reverse(), // Reverse to show oldest first
    pagination: {
      nextCursor,
      hasMore: messages.length === take,
    }
  });
});

export const updateMessage = asyncMiddleware(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { messageId } = req.params;
  const { content } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  // Check if message exists and user is sender
  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      senderId: userId,
    }
  });

  if (!message) {
    return res.status(404).json({ message: "Message not found or you don't have permission to edit it" });
  }

  // Sanitize content before updating
  const sanitizedContent = sanitizeMessageContent(content);

  // Update message
  const updatedMessage = await prisma.message.update({
    where: {
      id: messageId,
    },
    data: {
      content: sanitizedContent,
      isEdited: true,
      editedAt: new Date(),
    },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
        }
      },
      replyTo: {
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            }
          }
        }
      }
    }
  });

  res.json({
    message: "Message updated successfully",
    data: updatedMessage
  });
});

export const deleteMessage = asyncMiddleware(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  // Check if message exists and user is sender
  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      senderId: userId,
    }
  });

  if (!message) {
    return res.status(404).json({ message: "Message not found or you don't have permission to delete it" });
  }

  // Delete message (cascade will handle related records)
  await prisma.message.delete({
    where: {
      id: messageId,
    }
  });

  res.json({ message: "Message deleted successfully" });
});

export const markMessagesRead = asyncMiddleware(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { messageIds, conversationId } = req.body;
  const userId = req.user?.id;
  const participant = req.participant;

  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  if (!participant) {
    return res.status(403).json({ message: "Not a participant in this conversation" });
  }

  // Verify all messages belong to the conversation
  const messages = await prisma.message.findMany({
    where: {
      id: { in: messageIds },
      conversationId,
    }
  });

  if (messages.length !== messageIds.length) {
    return res.status(400).json({ message: "Some messages not found in this conversation" });
  }

  // Mark messages as read
  const readReceipts = await prisma.messageRead.createMany({
    data: messageIds.map((messageId: string) => ({
      messageId,
      userId,
      participantId: participant.id,
    })),
    skipDuplicates: true,
  });

  // Update participant's last read timestamp
  await prisma.conversationParticipant.update({
    where: {
      id: participant.id,
    },
    data: {
      lastReadAt: new Date(),
    }
  });

  res.json({
    message: "Messages marked as read successfully",
    count: readReceipts.count
  });
});

export const getUnreadCount = asyncMiddleware(async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const userId = req.user?.id;
  const participant = req.participant;

  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  if (!participant) {
    return res.status(403).json({ message: "Not a participant in this conversation" });
  }

  const unreadCount = await prisma.message.count({
    where: {
      conversationId,
      NOT: {
        messageReads: {
          some: {
            userId,
          }
        }
      },
      senderId: {
        not: userId, // Don't count own messages
      }
    }
  });

  res.json({ unreadCount });
});