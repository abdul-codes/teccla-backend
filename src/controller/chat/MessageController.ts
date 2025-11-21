import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { asyncMiddleware } from "../../middleware/asyncMiddleware";
import { prisma } from "../../utils/db";
import { MessageType } from "@prisma/client";

export const sendMessage = asyncMiddleware(async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { conversationId, content, messageType = MessageType.TEXT, replyToId, attachmentUrl, attachmentType } = req.body;
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

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content,
        messageType,
        replyToId,
        attachmentUrl,
        attachmentType,
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
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      message: "Error sending message",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export const getMessages = asyncMiddleware(async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50, cursor } = req.query;
    const participant = req.participant;

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
  } catch (error) {
    console.error("Error getting messages:", error);
    res.status(500).json({
      message: "Error getting messages",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export const updateMessage = asyncMiddleware(async (req: Request, res: Response) => {
  try {
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

    // Update message
    const updatedMessage = await prisma.message.update({
      where: {
        id: messageId,
      },
      data: {
        content,
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
  } catch (error) {
    console.error("Error updating message:", error);
    res.status(500).json({
      message: "Error updating message",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export const deleteMessage = asyncMiddleware(async (req: Request, res: Response) => {
  try {
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
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({
      message: "Error deleting message",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export const markMessagesRead = asyncMiddleware(async (req: Request, res: Response) => {
  try {
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
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({
      message: "Error marking messages as read",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export const getUnreadCount = asyncMiddleware(async (req: Request, res: Response) => {
  try {
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
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({
      message: "Error getting unread count",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});