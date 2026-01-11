import { Server, Socket } from 'socket.io';
import { prisma } from '../../utils/db';
import { sanitizeMessageContent } from '../../utils/contentSanitizer';
import '../types';
import Logger from '../../utils/logger';

export async function handleJoinConversation(io: Server, socket: Socket, data: { conversationId: string }) {
  try {
    const { conversationId } = data;
    const userId = socket.user?.id;

    if (!userId) {
      socket.emit('error', { message: 'User not authenticated' });
      return;
    }

    // Verify user is participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId
      }
    });

    if (!participant) {
      socket.emit('error', { message: 'Not a participant in this conversation' });
      return;
    }

    // Join conversation room
    const roomName = `conversation:${conversationId}`;
    socket.join(roomName);

    // Get recent messages
    const recentMessages = await prisma.message.findMany({
      where: {
        conversationId
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    // Send conversation data
    socket.emit('conversation_joined', {
      conversationId,
      messages: recentMessages.reverse()
    });

    Logger.info(`User ${socket.user?.firstName} joined conversation ${conversationId}`);

  } catch (error) {
    Logger.error('Error joining conversation:', error);
    socket.emit('error', { message: 'Failed to join conversation' });
  }
}

export async function handleLeaveConversation(io: Server, socket: Socket, data: { conversationId: string }) {
  try {
    const { conversationId } = data;
    const userId = socket.user?.id;

    if (!userId) {
      socket.emit('error', { message: 'User not authenticated' });
      return;
    }

    const roomName = `conversation:${conversationId}`;

    // Leave the socket room
    socket.leave(roomName);

    // Notify other participants in the room
    socket.to(roomName).emit('user_left', {
      userId: socket.user?.id,
      firstName: socket.user?.firstName,
      lastName: socket.user?.lastName,
      timestamp: new Date().toISOString()
    });

    // Send confirmation to the user who left
    socket.emit('conversation_left', {
      conversationId,
      timestamp: new Date().toISOString()
    });

    Logger.info(`User ${socket.user?.firstName} left conversation ${conversationId}`);

  } catch (error) {
    Logger.error('Error leaving conversation:', error);
    socket.emit('error', { message: 'Failed to leave conversation' });
  }
}