import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/db';
import { sanitizeMessageContent } from '../utils/contentSanitizer';

// Extend Socket interface to include user data
declare module 'socket.io' {
  interface Socket {
    user?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      profilePicture?: string;
    };
  }
}

export function initializeSocket(server: HTTPServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN!) as any;
      
      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePicture: true
        }
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        profilePicture: user.profilePicture || undefined
      };
      next();
    } catch (error) {
      return next(new Error('Invalid authentication token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user?.firstName} ${socket.user?.lastName} (${socket.id})`);

    // Join user to their personal room
    socket.join(`user:${socket.user?.id}`);

    // Join conversation handler
    socket.on('join_conversation', async (data) => {
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

        console.log(`User ${socket.user?.firstName} joined conversation ${conversationId}`);

      } catch (error) {
        console.error('Error joining conversation:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // Send message handler
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content, messageType = 'TEXT', replyToId, attachmentUrl, attachmentType } = data;
        const userId = socket.user?.id;

        if (!userId) {
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }

        // Verify participant
        const participant = await prisma.conversationParticipant.findFirst({
          where: {
            conversationId,
            userId
          }
        });

        if (!participant) {
          socket.emit('error', { message: 'Cannot send message to this conversation' });
          return;
        }

        // Check if muted
        if (participant.isMuted) {
          socket.emit('error', { message: 'You are muted in this conversation' });
          return;
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
            socket.emit('error', { message: 'Reply message not found in this conversation' });
            return;
          }
        }

        // Basic attachment validation
        if (attachmentUrl) {
          try {
            const url = new URL(attachmentUrl);
            if (url.protocol !== 'https:') {
              socket.emit('error', { message: 'Only HTTPS attachment URLs are allowed' });
              return;
            }
            if (!url.hostname.includes('cloudinary.com')) {
              socket.emit('error', { message: 'Only Cloudinary attachments are allowed' });
              return;
            }
          } catch (error) {
            socket.emit('error', { message: 'Invalid attachment URL format' });
            return;
          }
        }

        // Sanitize content
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
          },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePicture: true
              }
            },
            replyTo: {
              include: {
                sender: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        });

        // Update conversation timestamp
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

        // Broadcast to conversation room (exclude sender)
        const roomName = `conversation:${conversationId}`;
        socket.to(roomName).emit('message_received', {
          ...message,
          timestamp: message.createdAt.toISOString()
        });

        // Send confirmation to sender
        socket.emit('message_sent', {
          ...message,
          timestamp: message.createdAt.toISOString()
        });

        console.log(`Message sent in conversation ${conversationId} by ${socket.user?.firstName}`);

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Leave conversation handler
    socket.on('leave_conversation', async (data) => {
      try {
        const { conversationId } = data;
        const roomName = `conversation:${conversationId}`;
        
        socket.leave(roomName);

        // Notify others
        socket.to(roomName).emit('user_left', {
          userId: socket.user?.id,
          firstName: socket.user?.firstName,
          lastName: socket.user?.lastName,
          timestamp: new Date().toISOString()
        });

        socket.emit('conversation_left', { conversationId });
        console.log(`User ${socket.user?.firstName} left conversation ${conversationId}`);

      } catch (error) {
        console.error('Error leaving conversation:', error);
        socket.emit('error', { message: 'Failed to leave conversation' });
      }
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
      console.log(`User disconnected: ${socket.user?.firstName} (${socket.id}) - Reason: ${reason}`);
    });

    // Error handler
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Send initial connection status
    socket.emit('connected', {
      userId: socket.user?.id,
      timestamp: new Date().toISOString()
    });
  });

  return io;
}