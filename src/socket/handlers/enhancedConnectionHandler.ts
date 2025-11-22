import { Server, Socket } from 'socket.io';
import { createEnhancedPresenceManager } from '../utils/enhancedPresence';
import { prisma } from '../../utils/db';
import '../types';

// Create a singleton instance that will be initialized with io
let enhancedPresenceManager: ReturnType<typeof createEnhancedPresenceManager>;

export function initializeEnhancedPresence(io: Server) {
  enhancedPresenceManager = createEnhancedPresenceManager(io);
}

// Inline conversation handlers to avoid import issues
async function handleJoinConversation(io: Server, socket: Socket, data: { conversationId: string }) {
  try {
    const { conversationId } = data;
    const userId = socket.user?.id;

    if (!userId) {
      socket.emit('error', { message: 'User not authenticated' });
      return;
    }

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

    const roomName = `conversation:${conversationId}`;
    socket.join(roomName);

    const recentMessages = await prisma.message.findMany({
      where: { conversationId },
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
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    socket.emit('conversation_joined', {
      conversationId,
      messages: recentMessages.reverse()
    });

    console.log(`User ${socket.user?.firstName} joined conversation ${conversationId}`);
  } catch (error) {
    console.error('Error joining conversation:', error);
    socket.emit('error', { message: 'Failed to join conversation' });
  }
}

async function handleLeaveConversation(io: Server, socket: Socket, data: { conversationId: string }) {
  try {
    const { conversationId } = data;
    const userId = socket.user?.id;

    if (!userId) {
      socket.emit('error', { message: 'User not authenticated' });
      return;
    }

    const roomName = `conversation:${conversationId}`;
    socket.leave(roomName);

    socket.to(roomName).emit('user_left', {
      userId: socket.user?.id,
      firstName: socket.user?.firstName,
      lastName: socket.user?.lastName,
      timestamp: new Date().toISOString()
    });

    socket.emit('conversation_left', { 
      conversationId,
      timestamp: new Date().toISOString()
    });

    console.log(`User ${socket.user?.firstName} left conversation ${conversationId}`);
  } catch (error) {
    console.error('Error leaving conversation:', error);
    socket.emit('error', { message: 'Failed to leave conversation' });
  }
}

export function handleEnhancedConnection(io: Server, socket: Socket) {
  const userId = socket.user?.id;
  if (!userId) return;

  console.log(`Enhanced connection: ${socket.user?.firstName} ${socket.user?.lastName} (${socket.id})`);

  // Add to presence manager
  enhancedPresenceManager.addUser(userId, socket.id);

  // Enhanced event handlers
  socket.on('set_presence', (data) => {
    enhancedPresenceManager.updateUserPresence(userId, data);
  });

  socket.on('join_conversation', (data) => {
    enhancedPresenceManager.setUserConversation(userId, data.conversationId);
    handleJoinConversation(io, socket, data);
  });

  socket.on('leave_conversation', (data) => {
    enhancedPresenceManager.setUserConversation(userId, undefined);
    handleLeaveConversation(io, socket, data);
  });

  socket.on('typing_start', (data) => {
    enhancedPresenceManager.setTyping(userId, data.conversationId, true);
  });

  socket.on('typing_stop', (data) => {
    enhancedPresenceManager.setTyping(userId, data.conversationId, false);
  });

  socket.on('disconnect', () => {
    enhancedPresenceManager.removeUser(userId, socket.id);
  });

  // Error handler
  socket.on('error', (error) => {
    console.error('Enhanced socket error:', error);
  });

  // Send initial connection status
  socket.emit('connected', {
    userId,
    timestamp: new Date().toISOString()
  });
}