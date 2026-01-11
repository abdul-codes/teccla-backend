import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { asyncMiddleware } from "../../middleware/asyncMiddleware";
import { prisma } from "../../utils/db";
import { ParticipantRole } from "../../../prisma/generated/prisma/client";
import Logger from "../../utils/logger";

export const createConversation = asyncMiddleware(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, isGroup, participantIds } = req.body;
  const userId = req.user?.id;

  Logger.info(' CREATE CONVERSATION');
  Logger.info('Request body:', { name, description, isGroup, participantIds });
  Logger.info('Current user:', userId);

  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  if (!isGroup && participantIds.length > 1) {
    return res.status(400).json({ message: "Direct messages can only have 2 participants" });
  }

  if (!isGroup && participantIds.length === 1) {
    const otherUserId = participantIds[0];
    Logger.info('Checking for existing 1-on-1 conversation between:', { userId, otherUserId });

    // More efficient only get conversations where BOTH users are participants
    const existingConversations = await prisma.conversation.findMany({
      where: {
        isGroup: false,
        AND: [
          {
            participants: {
              some: {
                userId: userId
              }
            }
          },
          {
            participants: {
              some: {
                userId: otherUserId
              }
            }
          }
        ]
      },
      include: {
        participants: {
          select: {
            userId: true,
          }
        }
      }
    });

    Logger.info('Found potential matching conversations', { count: existingConversations.length });

    // Verify it's exactly these two users (no more, no less)
    const existingConversation = existingConversations.find(conv => {
      const participantUserIds = conv.participants.map(p => p.userId);
      const matches = participantUserIds.length === 2;
      if (matches) {
        Logger.info('Found existing conversation with participants', { id: conv.id, participantUserIds });
      }
      return matches;
    });

    if (existingConversation) {
      Logger.info('Returning existing conversation', { id: existingConversation.id });
      const fullConversation = await prisma.conversation.findUnique({
        where: { id: existingConversation.id },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  profilePicture: true,
                }
              }
            }
          },
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            }
          }
        }
      });

      return res.status(200).json({
        message: "Direct message already exists",
        conversation: fullConversation
      });
    }
    Logger.info('No existing conversation found, creating new one');
  }

  // Create conversation
  const conversation = await prisma.conversation.create({
    data: {
      name: isGroup ? name : null,
      description: isGroup ? description : null,
      isGroup,
      createdBy: userId,
      participants: {
        create: [
          // Add creator as admin
          {
            userId,
            role: ParticipantRole.ADMIN,
          },
          // Add other participants
          ...participantIds.map((id: string) => ({
            userId: id,
            role: ParticipantRole.MEMBER,
          }))
        ]
      }
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profilePicture: true,
            }
          }
        }
      },
      creator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        }
      }
    }
  });

  res.status(201).json({
    message: "Conversation created successfully",
    conversation
  });
});

export const getUserConversations = asyncMiddleware(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { page = 1, limit = 20 } = req.query;

  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  const skip = (Number(page) - 1) * Number(limit);

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: {
        some: {
          userId,
        }
      }
    },
    select: {
      id: true,
      name: true,
      description: true,
      isGroup: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
      createdBy: true,
      participants: {
        select: {
          id: true,
          userId: true,
          role: true,
          joinedAt: true,
          lastReadAt: true,
          isMuted: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profilePicture: true,
            }
          }
        }
      },
      _count: {
        select: {
          messages: {
            where: {
              NOT: {
                messageReads: {
                  some: {
                    userId,
                  }
                }
              }
            }
          }
        }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    },
    skip,
    take: Number(limit),
  });

  // Get latest messages for all conversations (batch query)
  const conversationIds = conversations.map(c => c.id);
  const latestMessages = conversationIds.length > 0 ? await prisma.message.findMany({
    where: {
      conversationId: { in: conversationIds }
    },
    select: {
      id: true,
      conversationId: true,
      content: true,
      messageType: true,
      createdAt: true,
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: conversationIds.length
  }) : [];

  // Map latest messages to conversations
  const messageMap = new Map();
  latestMessages.forEach(msg => {
    if (!messageMap.has(msg.conversationId) ||
      msg.createdAt > messageMap.get(msg.conversationId).createdAt) {
      messageMap.set(msg.conversationId, msg);
    }
  });

  const conversationsWithMessages = conversations.map(conv => ({
    ...conv,
    messages: messageMap.get(conv.id) ? [messageMap.get(conv.id)] : []
  }));

  const total = await prisma.conversation.count({
    where: {
      participants: {
        some: {
          userId,
        }
      }
    }
  });

  res.json({
    conversations: conversationsWithMessages,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    }
  });
});

export const getConversationDetails = asyncMiddleware(async (req: Request, res: Response) => {
  const conversationId = req.params.id;
  const participant = req.participant;

  if (!participant) {
    return res.status(403).json({ message: "Not a participant in this conversation" });
  }

  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profilePicture: true,
            }
          }
        }
      },
      creator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        }
      }
    }
  });

  if (!conversation) {
    return res.status(404).json({ message: "Conversation not found" });
  }

  res.json({ conversation });
});

export const updateConversation = asyncMiddleware(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { conversationId } = req.params;
  const { name, description, avatar } = req.body;
  const participant = req.participant;

  if (!participant) {
    return res.status(403).json({ message: "Not a participant in this conversation" });
  }

  const conversation = await prisma.conversation.update({
    where: {
      id: conversationId,
    },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(avatar !== undefined && { avatar }),
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profilePicture: true,
            }
          }
        }
      }
    }
  });

  res.json({
    message: "Conversation updated successfully",
    conversation
  });
});

export const addParticipant = asyncMiddleware(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { conversationId } = req.params;
  const { userId, role = ParticipantRole.MEMBER } = req.body;
  const currentParticipant = req.participant;

  if (!currentParticipant) {
    return res.status(403).json({ message: "Not a participant in this conversation" });
  }

  // Check if user is already a participant
  const existingParticipant = await prisma.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId,
    }
  });

  if (existingParticipant) {
    return res.status(400).json({ message: "User is already a participant" });
  }

  // Add participant
  const participant = await prisma.conversationParticipant.create({
    data: {
      conversationId,
      userId,
      role,
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePicture: true,
        }
      }
    }
  });

  res.status(201).json({
    message: "Participant added successfully",
    participant
  });
});

export const removeParticipant = asyncMiddleware(async (req: Request, res: Response) => {
  const { conversationId, userId } = req.params;
  const currentUserId = req.user?.id;
  const currentParticipant = req.participant;

  if (!currentParticipant) {
    return res.status(403).json({ message: "Not a participant in this conversation" });
  }

  // Users can only remove themselves, admins can remove others
  if (userId !== currentUserId && currentParticipant.role !== ParticipantRole.ADMIN) {
    return res.status(403).json({ message: "Insufficient permissions to remove participant" });
  }

  // Cannot remove the last participant from a group
  if (userId !== currentUserId) {
    const participantCount = await prisma.conversationParticipant.count({
      where: {
        conversationId,
      }
    });

    if (participantCount <= 2) {
      return res.status(400).json({ message: "Cannot remove participant from conversation with 2 or fewer members" });
    }
  }

  await prisma.conversationParticipant.delete({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      }
    }
  });

  res.json({ message: "Participant removed successfully" });
});

export const leaveConversation = asyncMiddleware(async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const userId = req.user?.id;
  const participant = req.participant;

  if (!participant || participant.userId !== userId) {
    return res.status(403).json({ message: "Not a participant in this conversation" });
  }

  await prisma.conversationParticipant.delete({
    where: {
      conversationId_userId: {
        conversationId,
        userId: userId!,
      }
    }
  });

  res.json({ message: "Left conversation successfully" });
});