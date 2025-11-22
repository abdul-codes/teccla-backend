import { NextFunction, Request, Response } from "express";
import { asyncMiddleware } from "./asyncMiddleware";
import { prisma } from "../utils/db";
import { ParticipantRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      participant?: {
        id: string;
        role: ParticipantRole;
        conversationId: string;
        userId: string;
        joinedAt: Date;
        lastReadAt: Date;
        isMuted: boolean;
      }
    }
  }
}

export const isConversationParticipant = asyncMiddleware(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
      },
      include: {
        conversation: {
          select: {
            id: true,
            name: true,
            isGroup: true,
            createdBy: true,
          }
        }
      }
    });

    if (!participant) {
      return res.status(403).json({ message: "Not a participant in this conversation" });
    }

    req.participant = participant;
    next();
  } catch (error) {
    console.error("Error checking conversation participation:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export const canManageConversation = asyncMiddleware(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const participant = req.participant;
    const userId = req.user?.id;

    if (!participant) {
      return res.status(403).json({ message: "Not a participant in this conversation" });
    }

    // Check if user is conversation creator or has admin role
    const conversation = await prisma.conversation.findUnique({
      where: { id: participant.conversationId },
      select: { createdBy: true }
    });

    const isCreator = conversation?.createdBy === userId;
    const isAdmin = participant.role === ParticipantRole.ADMIN;
    const isModerator = participant.role === ParticipantRole.MODERATOR;

    if (!isCreator && !isAdmin && !isModerator) {
      return res.status(403).json({ message: "Insufficient permissions to manage conversation" });
    }

    next();
  } catch (error) {
    console.error("Error checking conversation management permissions:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export const canSendMessage = asyncMiddleware(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const participant = req.participant;

    if (!participant) {
      return res.status(403).json({ message: "Not a participant in this conversation" });
    }

    // Check if user is muted
    if (participant.isMuted) {
      return res.status(403).json({ message: "You are muted in this conversation" });
    }

    next();
  } catch (error) {
    console.error("Error checking send message permissions:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export const canEditMessage = asyncMiddleware(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, conversationId: true }
    });

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if user is the message sender
    if (message.senderId !== userId) {
      return res.status(403).json({ message: "Can only edit your own messages" });
    }

    // Check if user is still a participant in the conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: message.conversationId,
        userId,
      }
    });

    if (!participant) {
      return res.status(403).json({ message: "Not a participant in this conversation" });
    }

    next();
  } catch (error) {
    console.error("Error checking edit message permissions:", error);
    res.status(500).json({ message: "Server error" });
  }
});