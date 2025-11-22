import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { prisma } from '../utils/db';
import { sanitizeMessageContent } from '../utils/contentSanitizer';
import { initializeEnhancedPresence, handleEnhancedConnection } from './handlers/connectionHandler';
import './types';

// Environment validation
function validateEnvironment() {
  const required = ['ACCESS_TOKEN'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export function initializeSocket(server: HTTPServer) {
  // Validate environment variables
  validateEnvironment();
  
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Initialize enhanced presence manager
  initializeEnhancedPresence(io);

  // Basic rate limiting for socket events
  const messageCooldowns = new Map<string, number>();

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

  // Enhanced connection handler with presence management
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user?.firstName} ${socket.user?.lastName} (${socket.id})`);

    // Join user to their personal room
    socket.join(`user:${socket.user?.id}`);

    // Use enhanced connection handler for presence features
    handleEnhancedConnection(io, socket);

    // Keep the message handler for now (can be moved to enhanced handler later)
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content, messageType = 'TEXT', replyToId, attachmentUrl, attachmentType } = data;
        const userId = socket.user?.id;

        // Basic rate limiting
        if (!userId) {
          return socket.emit('error', { message: 'User not authenticated' });
        }

        const now = Date.now();
        const lastMessage = messageCooldowns.get(userId);
        
        if (lastMessage && now - lastMessage < 3000) {
          return socket.emit('error', { message: 'Please wait 3 seconds between messages' });
        }
        
        messageCooldowns.set(userId, now);

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

    // Disconnect handler
    socket.on('disconnect', (reason) => {
      console.log(`User disconnected: ${socket.user?.firstName} (${socket.id}) - Reason: ${reason}`);
    });

    // Error handler
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  return io;
}